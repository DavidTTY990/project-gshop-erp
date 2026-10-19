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
