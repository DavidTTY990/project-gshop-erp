/** Orders／OrderItems：銷售訂單的新增、修改、取消與退貨（發票在 invoices.js） */

/** 狀態值來自 Settings 的 order_status，改名時需同步修改這裡與前端 lib/orders.ts */
const ORDER_COMPLETED = '已完成';
const ORDER_CANCELLED = '已取消';
const ORDER_RETURNED = '已退貨';

/** 散客的 customer_id（Customers 分頁沒有這一列）；與前端 lib/orders.ts 相同 */
const WALK_IN_CUSTOMER_ID = 'WALK-IN';

/** 空白（舊資料或前端未選客人）一律視為散客 */
function toOrderCustomerId(v) {
  return toText(v) || WALK_IN_CUSTOMER_ID;
}

const ORDER_ITEM_TEXT_FIELDS = ['product_name', 'category', 'platform', 'condition', 'note'];

function normalizeOrder(o) {
  const order = { ...o };
  ['order_id', 'customer_id', 'payment_method', 'status', 'return_reason', 'staff', 'note'].forEach(f => (order[f] = String(o[f] ?? '')));
  ['subtotal', 'discount', 'total'].forEach(f => (order[f] = toAmount(o[f]) ?? 0));
  order.customer_id = toOrderCustomerId(order.customer_id);
  return order;
}

function normalizeOrderItem(i) {
  const item = { ...i };
  ['item_id', 'order_id', 'invoice_id', ...ORDER_ITEM_TEXT_FIELDS].forEach(f => (item[f] = String(i[f] ?? '')));
  ['unit_price', 'qty', 'line_total'].forEach(f => (item[f] = toAmount(i[f]) ?? 0));
  return item;
}

function readOrders() {
  return readSheet('Orders').map(normalizeOrder);
}

function readOrderItems() {
  return readSheet('OrderItems').map(normalizeOrderItem);
}

function allOrders() {
  return readOrders();
}

function getOrder({ id }) {
  const order = readOrders().find(o => o.order_id === String(id));
  if (!order) throw new AppError('找不到訂單', 'NOT_FOUND');
  const items = readOrderItems().filter(i => i.order_id === order.order_id);
  return { order, items };
}

/** 過去用過的商品名稱（去除重複），各保留最近一次的類別、平台、商品狀態與單價 */
function productSuggestions() {
  const byName = new Map();
  readOrderItems().forEach(i => {
    if (!i.product_name) return;
    // 試算表列順序即新增順序，後面的覆蓋前面的
    byName.set(i.product_name, {
      product_name: i.product_name,
      category: i.category,
      platform: i.platform,
      condition: i.condition,
      unit_price: i.unit_price,
    });
  });
  return [...byName.values()];
}

/** 驗證明細並計算 line_total；回傳可寫入的品項（不含主鍵） */
function validateOrderItems(items) {
  if (!Array.isArray(items) || items.length === 0) throw new AppError('請至少加入一個品項', 'VALIDATION');
  return items.map((raw, i) => {
    const label = `第 ${i + 1} 項`;
    const item = {};
    ORDER_ITEM_TEXT_FIELDS.forEach(f => (item[f] = toText(raw[f])));
    if (!item.product_name) throw new AppError(`${label}：請填寫商品名稱`, 'VALIDATION');
    if (!item.category) throw new AppError(`${label}：請選擇類別`, 'VALIDATION');
    const unitPrice = parseAmount(raw.unit_price, `${label}的單價`);
    if (unitPrice === null) throw new AppError(`${label}：請填寫單價`, 'VALIDATION');
    const qty = Number(raw.qty);
    if (!Number.isInteger(qty) || qty < 1) throw new AppError(`${label}：數量需為 1 以上的整數`, 'VALIDATION');
    return { ...item, unit_price: unitPrice, qty, line_total: unitPrice * qty };
  });
}

/** 留空或 WALK-IN 為散客；其餘需為存在的客人 */
function validateOrderCustomer(customerId) {
  const id = toOrderCustomerId(customerId);
  if (id !== WALK_IN_CUSTOMER_ID && !readCustomers().some(c => c.customer_id === id)) {
    throw new AppError('找不到客人', 'NOT_FOUND');
  }
  return id;
}

function requirePaymentMethod(v) {
  const s = toText(v);
  if (!s) throw new AppError('請選擇付款方式', 'VALIDATION');
  return s;
}

/**
 * 新增訂單：狀態固定「已完成」；金額由後端重新計算。
 * order_date 可補登過去日期但不可晚於今天，單號以訂單日期產生。
 */
function createOrder(params) {
  const staff = requireStaff(params.staff);
  const paymentMethod = requirePaymentMethod(params.payment_method);
  const orderDate = parseDate(params.order_date, '訂單日期') ?? parseDate(todayString(), '訂單日期');
  if (Utilities.formatDate(orderDate, 'Asia/Taipei', 'yyyy-MM-dd') > todayString()) {
    throw new AppError('訂單日期不可晚於今天', 'VALIDATION');
  }
  const items = validateOrderItems(params.items);
  const subtotal = items.reduce((sum, i) => sum + i.line_total, 0);
  const discount = parseAmount(params.discount, '折扣') ?? 0;
  if (discount > subtotal) throw new AppError('折扣不可大於小計', 'VALIDATION');

  return withLock(() => {
    const customerId = validateOrderCustomer(params.customer_id);
    const now = new Date();
    const order = normalizeOrder({
      order_id: nextId('O', readOrders().map(o => o.order_id), orderDate),
      customer_id: customerId,
      order_date: orderDate,
      subtotal,
      discount,
      total: subtotal - discount,
      payment_method: paymentMethod,
      status: ORDER_COMPLETED,
      returned_at: '',
      return_reason: '',
      staff,
      note: toText(params.note),
      created_at: now,
      updated_at: now,
    });

    // 明細主鍵依序遞增：每產生一個就加入已存在清單
    const itemIds = readOrderItems().map(i => i.item_id);
    const rows = items.map(item => {
      const itemId = nextId('OI', itemIds, orderDate);
      itemIds.push(itemId);
      return normalizeOrderItem({ item_id: itemId, order_id: order.order_id, invoice_id: '', ...item });
    });

    appendRecord('Orders', order);
    appendRecords('OrderItems', rows);
    return { order, items: rows };
  });
}

/**
 * 修改訂單：「已完成」時可改客人、付款方式、店員、備註；
 * 已取消／已退貨只能改備註，其他欄位有變動時回傳 VALIDATION。
 */
function updateOrder(params) {
  const id = String(params.id || '');
  return withLock(() => {
    const current = readOrders().find(o => o.order_id === id);
    if (!current) throw new AppError('找不到訂單', 'NOT_FOUND');
    const note = toText(params.note);

    if (current.status !== ORDER_COMPLETED) {
      const changed =
        (params.customer_id !== undefined && toOrderCustomerId(params.customer_id) !== current.customer_id) ||
        ['payment_method', 'staff'].some(f => params[f] !== undefined && toText(params[f]) !== current[f]);
      if (changed) throw new AppError(`訂單${current.status}，只能修改備註`, 'VALIDATION');
      return normalizeOrder(updateRecord('Orders', 'order_id', id, { note, updated_at: new Date() }));
    }

    const patch = {
      customer_id: validateOrderCustomer(params.customer_id),
      payment_method: requirePaymentMethod(params.payment_method),
      staff: requireStaff(params.staff),
      note,
      updated_at: new Date(),
    };
    return normalizeOrder(updateRecord('Orders', 'order_id', id, patch));
  });
}

/** 取消與退貨共用：只能從「已完成」轉換，原因必填，寫入 returned_at／return_reason */
function closeOrder(id, status, reason) {
  const text = toText(reason);
  if (!text) throw new AppError(`請填寫${status === ORDER_CANCELLED ? '取消' : '退貨'}原因`, 'VALIDATION');
  return withLock(() => {
    const current = readOrders().find(o => o.order_id === String(id));
    if (!current) throw new AppError('找不到訂單', 'NOT_FOUND');
    if (current.status !== ORDER_COMPLETED) throw new AppError(`訂單已是「${current.status}」`, 'VALIDATION');
    const now = new Date();
    return normalizeOrder(
      updateRecord('Orders', 'order_id', current.order_id, { status, returned_at: now, return_reason: text, updated_at: now }),
    );
  });
}

function cancelOrder({ id, reason }) {
  return closeOrder(id, ORDER_CANCELLED, reason);
}

function returnOrder({ id, reason }) {
  return closeOrder(id, ORDER_RETURNED, reason);
}

function test_productSuggestions() {
  console.log(JSON.stringify(productSuggestions(), null, 2));
}

function test_createOrder() {
  const result = createOrder({
    order_date: todayString(),
    items: [
      { product_name: '測試：薩爾達傳說', category: '遊戲片', platform: 'Switch', condition: '全新', unit_price: 1790, qty: 1 },
      { product_name: '測試：保護貼', category: '配件', unit_price: 200, qty: 2 },
    ],
    discount: 100,
    payment_method: '現金',
    staff: '測試',
  });
  console.log(JSON.stringify(result, null, 2));
}

function test_cancelOrder() {
  const orders = readOrders();
  const last = orders[orders.length - 1];
  console.log(JSON.stringify(cancelOrder({ id: last.order_id, reason: '測試取消' }), null, 2));
}
