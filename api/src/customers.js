/** Customers：客人的查詢、新增與編輯 */

const CUSTOMER_FIELDS = ['name', 'phone', 'line_id', 'note'];

/** 電話只保留數字，例 '0912-345 678' → '0912345678' */
function normalizePhone(phone) {
  return String(phone || '').replace(/\D/g, '');
}

/** 讀取全部客人；舊資料的電話可能被存成數字，一律轉回字串 */
function readCustomers() {
  return readSheet('Customers').map(c => ({
    ...c,
    customer_id: String(c.customer_id),
    phone: c.phone === '' ? '' : String(c.phone),
    line_id: String(c.line_id),
  }));
}

/** 只取白名單欄位並整理、驗證；回傳可寫入的物件 */
function validateCustomer(params) {
  const data = {};
  CUSTOMER_FIELDS.forEach(f => (data[f] = String(params[f] ?? '').trim()));
  data.phone = normalizePhone(data.phone);

  if (!data.name) throw new AppError('請填寫姓名', 'VALIDATION');
  if (!data.phone && !data.line_id) throw new AppError('電話與 LINE ID 至少填一項', 'VALIDATION');
  if (data.phone && (data.phone.length < 8 || data.phone.length > 10)) {
    throw new AppError('電話需為 8～10 碼數字', 'VALIDATION');
  }
  return data;
}

/** 電話已被其他客人使用時丟出 DUPLICATE_PHONE */
function assertPhoneUnique(customers, phone, selfId) {
  if (!phone) return;
  const dup = customers.find(c => normalizePhone(c.phone) === phone && c.customer_id !== selfId);
  if (dup) {
    throw new AppError(`此電話已登記為「${dup.name}」`, 'DUPLICATE_PHONE', {
      customer_id: dup.customer_id,
      name: dup.name,
    });
  }
}

/** 全部客人（依試算表列順序）；搜尋、排序與分頁由前端處理 */
function allCustomers() {
  return readCustomers();
}

function getCustomer({ id }) {
  const customer = readCustomers().find(c => c.customer_id === String(id));
  if (!customer) throw new AppError('找不到客人', 'NOT_FOUND');
  return customer;
}

function createCustomer(params) {
  const data = validateCustomer(params);
  return withLock(() => {
    const customers = readCustomers();
    assertPhoneUnique(customers, data.phone);
    const now = new Date();
    const customer = {
      customer_id: nextId('C', customers.map(c => c.customer_id)),
      ...data,
      created_at: now,
      updated_at: now,
    };
    appendRecord('Customers', customer);
    return customer;
  });
}

function updateCustomer(params) {
  const id = String(params.id || '');
  const data = validateCustomer(params);
  return withLock(() => {
    const customers = readCustomers();
    if (!customers.some(c => c.customer_id === id)) throw new AppError('找不到客人', 'NOT_FOUND');
    assertPhoneUnique(customers, data.phone, id);
    return updateRecord('Customers', 'customer_id', id, { ...data, updated_at: new Date() });
  });
}

function test_allCustomers() {
  console.log(JSON.stringify(allCustomers(), null, 2));
}

function test_createCustomer() {
  console.log(JSON.stringify(createCustomer({ name: '測試客人', phone: '0900-000-' + Date.now() % 1000, note: 'test' })));
}

function test_updateCustomer() {
  const [first] = readCustomers();
  console.log(JSON.stringify(updateCustomer({ ...first, id: first.customer_id, note: `更新於 ${formatDate(new Date())}` })));
}

function test_validateCustomer() {
  ['', '123'].forEach(phone => {
    try {
      validateCustomer({ name: 'x', phone });
    } catch (err) {
      console.log(phone || '(空)', '→', err.message);
    }
  });
}
