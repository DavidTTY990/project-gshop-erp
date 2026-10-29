/**
 * 讀取整張分頁，轉成物件陣列。
 * 第 1 列為欄位名稱，例：[{ customer_id: 'C-TEST-001', name: '王小明', ... }]
 */
function readSheet(sheetName) {
  const sheet = SpreadsheetApp.getActive().getSheetByName(sheetName);
  if (!sheet) throw new Error(`找不到分頁：${sheetName}`);

  // 一次讀出整張表（比逐格讀快很多）
  const [headers, ...rows] = sheet.getDataRange().getValues();

  return rows
    .filter(row => row.some(cell => cell !== ''))           // 略過空白列
    .map(row => Object.fromEntries(headers.map((h, i) => [h, row[i]])));
}

/** 在編輯器中直接執行，用來測試 */
function test_readSheet() {
  const customers = readSheet('Customers');
  console.log(`共 ${customers.length} 筆`);
  console.log(JSON.stringify(customers, null, 2));
}

/** 把物件轉成 JSON 回應；所有 Date 一律轉成台北時間字串，避免前端收到 UTC */
function jsonResponse(obj) {
  const json = JSON.stringify(obj, function (key, value) {
    const raw = this[key];  // value 已被 Date.toJSON() 轉成 UTC 字串，需取原始值
    return raw instanceof Date ? formatDate(raw) : value;
  });
  return ContentService
    .createTextOutput(json)
    .setMimeType(ContentService.MimeType.JSON);
}

/** Date → 'yyyy-mm-dd hh:mm'（Asia/Taipei） */
function formatDate(date) {
  return Utilities.formatDate(date, 'Asia/Taipei', 'yyyy-MM-dd HH:mm');
}

/** 在編輯器中直接執行，確認日期格式 */
function test_formatDate() {
  console.log(formatDate(new Date()));
}

/** 寫入試算表時包住，避免同時寫入衝突；最多等 10 秒 */
function withLock(fn) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) throw new Error('系統忙碌中，請稍後再試');
  try {
    return fn();
  } finally {
    lock.releaseLock();
  }
}

/** 列表 API 每頁筆數 */
const PAGE_SIZE = 10;

/** 前端可判斷的業務錯誤，例：new AppError('此電話已登記', 'DUPLICATE_PHONE', { customer_id }) */
class AppError extends Error {
  constructor(message, code, data) {
    super(message);
    this.code = code;
    this.data = data;
  }
}

/**
 * 依第 1 列標題把物件寫入第 rowIndex 列（1 起算）。
 * 先設定儲存格格式再寫值：字串設為純文字（保留電話開頭的 0），Date 設為日期時間，數字與布林維持原型別。
 */
function writeRecord(sheet, headers, rowIndex, obj) {
  writeRecords(sheet, headers, rowIndex, [obj]);
}

/** 從第 rowIndex 列起連續寫入多列；格式規則同 writeRecord */
function writeRecords(sheet, headers, rowIndex, objs) {
  const values = objs.map(obj => headers.map(h => (obj[h] === undefined || obj[h] === null ? '' : obj[h])));
  const formats = values.map(row => row.map(v => {
    if (v instanceof Date) return 'yyyy-mm-dd hh:mm';
    if (typeof v === 'number' || typeof v === 'boolean') return '0';  // 布林寫成 TRUE／FALSE，不轉文字
    return '@';
  }));
  const range = sheet.getRange(rowIndex, 1, objs.length, headers.length);
  range.setNumberFormats(formats);
  range.setValues(values);
}

/** 新增一列（需在 withLock 內呼叫） */
function appendRecord(sheetName, obj) {
  appendRecords(sheetName, [obj]);
}

/** 一次新增多列（需在 withLock 內呼叫），例：訂單明細 */
function appendRecords(sheetName, objs) {
  if (objs.length === 0) return;
  const sheet = SpreadsheetApp.getActive().getSheetByName(sheetName);
  if (!sheet) throw new Error(`找不到分頁：${sheetName}`);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  writeRecords(sheet, headers, sheet.getLastRow() + 1, objs);
}

/** 台北時間的今天 'yyyy-mm-dd' */
function todayString() {
  return Utilities.formatDate(new Date(), 'Asia/Taipei', 'yyyy-MM-dd');
}

/** 以 idField 找到該列並合併 patch 後整列寫回，回傳更新後的物件（需在 withLock 內呼叫） */
function updateRecord(sheetName, idField, id, patch) {
  const sheet = SpreadsheetApp.getActive().getSheetByName(sheetName);
  if (!sheet) throw new Error(`找不到分頁：${sheetName}`);
  const [headers, ...rows] = sheet.getDataRange().getValues();
  const col = headers.indexOf(idField);
  const i = rows.findIndex(row => String(row[col]) === String(id));
  if (i === -1) return null;
  const record = { ...Object.fromEntries(headers.map((h, j) => [h, rows[i][j]])), ...patch };
  writeRecord(sheet, headers, i + 2, record);  // +2：標題列 + 1 起算
  return record;
}

/**
 * 一次更新多列：patches 為 { [id]: patch }，只讀一次整張表，逐列寫回有變動的列（需在 withLock 內呼叫）。
 * 例：發票變動時更新多個品項的 invoice_id。
 */
function updateRecords(sheetName, idField, patches) {
  const ids = Object.keys(patches);
  if (ids.length === 0) return;
  const sheet = SpreadsheetApp.getActive().getSheetByName(sheetName);
  if (!sheet) throw new Error(`找不到分頁：${sheetName}`);
  const [headers, ...rows] = sheet.getDataRange().getValues();
  const col = headers.indexOf(idField);
  rows.forEach((row, i) => {
    const patch = patches[String(row[col])];
    if (!patch) return;
    const record = { ...Object.fromEntries(headers.map((h, j) => [h, row[j]])), ...patch };
    writeRecord(sheet, headers, i + 2, record);
  });
}

/** 刪除 idField 為 ids 之一的列（需在 withLock 內呼叫）；由下往上刪，避免列號位移 */
function deleteRecords(sheetName, idField, ids) {
  if (ids.length === 0) return;
  const sheet = SpreadsheetApp.getActive().getSheetByName(sheetName);
  if (!sheet) throw new Error(`找不到分頁：${sheetName}`);
  const [headers, ...rows] = sheet.getDataRange().getValues();
  const col = headers.indexOf(idField);
  const targets = new Set(ids.map(String));
  for (let i = rows.length - 1; i >= 0; i--) {
    if (targets.has(String(rows[i][col]))) sheet.deleteRow(i + 2);
  }
}

/**
 * 產生主鍵：前綴-yyyymmdd-流水號，例 C-20261019-001（需在 withLock 內呼叫）。
 * date 預設今天；補登的訂單傳入訂單日期，流水號接續該日已有的最大值。
 */
function nextId(prefix, existingIds, date = new Date()) {
  const head = `${prefix}-${Utilities.formatDate(date, 'Asia/Taipei', 'yyyyMMdd')}-`;
  const max = existingIds
    .map(String)
    .filter(id => id.startsWith(head))
    .reduce((m, id) => Math.max(m, Number(id.slice(head.length)) || 0), 0);
  return head + String(max + 1).padStart(3, '0');
}

/** 讀取時的金額：空白 → null，其餘轉為數字 */
function toAmount(v) {
  return v === '' || v === null || v === undefined ? null : Number(v);
}

/** 讀取時的布林：試算表的 TRUE 或字串 'TRUE' 皆為 true */
function toBool(v) {
  return v === true || String(v).toUpperCase() === 'TRUE';
}

/** 寫入前驗證金額：空白 → null；需為 0 以上的整數（新台幣） */
function parseAmount(v, label) {
  if (v === '' || v === null || v === undefined) return null;
  const n = Number(v);
  if (!Number.isInteger(n) || n < 0) throw new AppError(`${label}需為 0 以上的整數`, 'VALIDATION');
  return n;
}

/** 前端送來的日期 'yyyy-mm-dd' → 台北時間當天 00:00 的 Date；空白 → null */
function parseDate(v, label) {
  if (v === '' || v === null || v === undefined) return null;
  const s = String(v).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) throw new AppError(`${label}格式需為 yyyy-mm-dd`, 'VALIDATION');
  return Utilities.parseDate(s, 'Asia/Taipei', 'yyyy-MM-dd');
}

/** 字串欄位：去頭尾空白，null／undefined 視為空字串 */
function toText(v) {
  return String(v ?? '').trim();
}
