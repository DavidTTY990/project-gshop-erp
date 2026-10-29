/**
 * API 入口。
 * - 讀寫一律 POST，body 為 JSON 字串：{ action, auth: { user, key }, params }
 * - 回應：{ ok: true, data } | { ok: false, error, code?, data? }
 */

/** action → 處理函式（皆接收 params 物件）；新增 API 時在此登記 */
const ACTIONS = {
  login: () => null,
  settings: () => getSettings(),
  // 用箭頭函式延後取用：各檔案依序載入，此時其他檔案的函式可能尚未定義
  allCustomers: () => allCustomers(),
  getCustomer: p => getCustomer(p),
  createCustomer: p => createCustomer(p),
  updateCustomer: p => updateCustomer(p),
  allDevices: () => allDevices(),
  updateDevice: p => updateDevice(p),
  allRepairs: () => allRepairs(),
  getRepair: p => getRepair(p),
  createRepair: p => createRepair(p),
  updateRepair: p => updateRepair(p),
  changeRepairStatus: p => changeRepairStatus(p),
  allOrders: () => allOrders(),
  getOrder: p => getOrder(p),
  productSuggestions: () => productSuggestions(),
  createOrder: p => createOrder(p),
  updateOrder: p => updateOrder(p),
  cancelOrder: p => cancelOrder(p),
  returnOrder: p => returnOrder(p),
  issueOrderInvoice: p => issueOrderInvoice(p),
  moveInvoiceItems: p => moveInvoiceItems(p),
  issueRepairInvoice: p => issueRepairInvoice(p),
  updateInvoice: p => updateInvoice(p),
  deleteInvoice: p => deleteInvoice(p),
  voidInvoice: p => voidInvoice(p),
};

/** 不需驗證的健康檢查：瀏覽器開 /exec?action=ping */
function doGet(e) {
  try {
    if (e.parameter.action === 'ping') {
      return jsonResponse({ ok: true, data: { message: '連線成功', time: new Date() } });
    }
    return jsonResponse({ ok: false, error: `未知的 action：${e.parameter.action}` });
  } catch (err) {
    return jsonResponse({ ok: false, error: err.message });
  }
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    return jsonResponse(handleRequest(body));
  } catch (err) {
    return jsonResponse({ ok: false, error: err.message });
  }
}

/** 與 HTTP 分開，方便在編輯器測試 */
function handleRequest({ action, auth, params }) {
  if (!checkAuth(auth)) {
    Utilities.sleep(1000); // 拖慢猜密碼
    return { ok: false, error: '帳號或密碼錯誤', code: 'AUTH' };
  }
  const handler = ACTIONS[action];
  if (!handler) return { ok: false, error: `未知的 action：${action}` };
  try {
    return { ok: true, data: handler(params || {}) };
  } catch (err) {
    // 業務錯誤（AppError）帶 code 與 data 給前端判斷；其餘錯誤交給 doPost 處理
    if (err instanceof AppError) return { ok: false, error: err.message, code: err.code, data: err.data };
    throw err;
  }
}

/** 在編輯器中執行：以 Script Properties 中的帳密呼叫 settings */
function test_handleRequest() {
  const props = PropertiesService.getScriptProperties();
  const auth = { user: props.getProperty('API_USER'), key: props.getProperty('API_KEY') };
  console.log(JSON.stringify(handleRequest({ action: 'settings', auth })));
  console.log(JSON.stringify(handleRequest({ action: 'settings', auth: { user: 'x', key: 'y' } })));
}
