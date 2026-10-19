/**
 * 讀取整張分頁，轉成物件陣列。
 * 第 1 列為欄位名稱，例：[{ customer_id: 'C-TEST-001', name: '王小明', ... }]
 */
function readSheet(sheetName = 'Customers') {
  const sheet = SpreadsheetApp.getActive().getSheetByName(sheetName);
  if (!sheet) throw new Error(`找不到分頁：${sheetName}`);

  // 一次讀出整張表（比逐格讀快很多）
  const [headers, ...rows] = sheet.getDataRange().getValues();

  return rows
    .filter(row => row.some(cell => cell !== ''))           // 略過空白列
    .map(row => Object.fromEntries(headers.map((h, i) => [h, row[i]])));
}

/** 在編輯器中直接執行，用來測試 */
function test_readCustomers() {
  const customers = readSheet('Customers');
  console.log(`共 ${customers.length} 筆`);
  console.log(JSON.stringify(customers, null, 2));
}

// REST API
/** 前端用 GET 呼叫時的入口 */
function doGet(e) {
  const action = e.parameter.action;

  try {
    if (action === 'ping') {
      return jsonResponse({ ok: true, data: { message: '連線成功', time: new Date() } });
    }
    if (action === 'customers') {
      return jsonResponse({ ok: true, data: readSheet('Customers') });
    }
    return jsonResponse({ ok: false, error: `未知的 action：${action}` });
  } catch (err) {
    return jsonResponse({ ok: false, error: err.message });
  }
}

/** 把物件轉成 JSON 回應 */
function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}