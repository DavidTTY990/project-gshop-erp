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
 * 先設定儲存格格式再寫值：字串設為純文字（保留電話開頭的 0），Date 設為日期時間，數字維持數字。
 */
function writeRecord(sheet, headers, rowIndex, obj) {
  const values = headers.map(h => (obj[h] === undefined || obj[h] === null ? '' : obj[h]));
  const formats = values.map(v => {
    if (v instanceof Date) return 'yyyy-mm-dd hh:mm';
    if (typeof v === 'number') return '0';
    return '@';
  });
  const range = sheet.getRange(rowIndex, 1, 1, headers.length);
  range.setNumberFormats([formats]);
  range.setValues([values]);
}

/** 新增一列（需在 withLock 內呼叫） */
function appendRecord(sheetName, obj) {
  const sheet = SpreadsheetApp.getActive().getSheetByName(sheetName);
  if (!sheet) throw new Error(`找不到分頁：${sheetName}`);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  writeRecord(sheet, headers, sheet.getLastRow() + 1, obj);
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

/** 產生主鍵：前綴-yyyymmdd-流水號，例 C-20261019-001（需在 withLock 內呼叫） */
function nextId(prefix, existingIds) {
  const head = `${prefix}-${Utilities.formatDate(new Date(), 'Asia/Taipei', 'yyyyMMdd')}-`;
  const max = existingIds
    .map(String)
    .filter(id => id.startsWith(head))
    .reduce((m, id) => Math.max(m, Number(id.slice(head.length)) || 0), 0);
  return head + String(max + 1).padStart(3, '0');
}
