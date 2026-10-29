/** Invoices：訂單與維修單共用的發票（開立、拆分、補號碼、作廢；取消／退貨連動在 orders.js） */

/** 值來自 Settings 的 invoice_status／source_type，改名時需同步修改這裡與前端 lib/invoices.ts */
const INVOICE_ISSUED = '已開立';
const INVOICE_VOID = '作廢';
const INVOICE_ALLOWANCE = '折讓';
const INVOICE_SOURCE_SALE = '銷售';
const INVOICE_SOURCE_REPAIR = '維修';

function normalizeInvoice(r) {
  const inv = { ...r };
  ['invoice_id', 'invoice_no', 'source_type', 'source_id', 'buyer_tax_id', 'invoice_status', 'note'].forEach(f => (inv[f] = String(r[f] ?? '')));
  inv.amount = toAmount(r.amount) ?? 0;
  return inv;
}

function readInvoices() {
  return readSheet('Invoices').map(normalizeInvoice);
}

/** 待補號碼：已開立但還沒填號碼（實際上還沒印出），可調整品項或刪除 */
function isPendingInvoice(inv) {
  return inv.invoice_status === INVOICE_ISSUED && !inv.invoice_no;
}

/** 有效發票：已開立（含待補號碼）與折讓 */
function isValidInvoice(inv) {
  return inv.invoice_status !== INVOICE_VOID;
}

function invoicesOf(invoices, sourceType, sourceId) {
  return invoices.filter(i => i.source_type === sourceType && i.source_id === sourceId);
}

/** 發票號碼：選填；轉大寫並去掉空白與連字號，需為 2 個英文字母加 8 位數字 */
function normalizeInvoiceNo(v) {
  const no = toText(v).toUpperCase().replace(/[\s-]/g, '');
  if (no && !/^[A-Z]{2}\d{8}$/.test(no)) {
    throw new AppError('發票號碼需為 2 個英文字母加 8 位數字，例：AB12345678', 'VALIDATION');
  }
  return no;
}

/**
 * 統編檢查碼（財政部規則，2023 年起改為可被 5 整除；舊規則的 10 也符合）：
 * 各位數乘上權數 1,2,1,2,1,2,4,1，乘積的十位與個位相加後加總。
 * 第 7 碼為 7 時乘積為 28（位數和 10），可再視為 1 或 0，因此總和 +1 可被 5 整除也算通過。
 */
function isValidTaxId(id) {
  if (!/^\d{8}$/.test(id)) return false;
  const weights = [1, 2, 1, 2, 1, 2, 4, 1];
  const sum = weights.reduce((s, w, i) => {
    const p = Number(id[i]) * w;
    return s + Math.floor(p / 10) + (p % 10);
  }, 0);
  return sum % 5 === 0 || (id[6] === '7' && (sum + 1) % 5 === 0);
}

function validateTaxId(v) {
  const id = toText(v).replace(/\s/g, '');
  if (id && !isValidTaxId(id)) throw new AppError('統編需為 8 位數字且通過檢查碼，請確認是否打錯', 'VALIDATION');
  return id;
}

/** 發票日期：必填，最晚今天 */
function parseInvoiceDate(v) {
  const date = parseDate(v, '發票日期');
  if (!date) throw new AppError('請選擇發票日期', 'VALIDATION');
  if (Utilities.formatDate(date, 'Asia/Taipei', 'yyyy-MM-dd') > todayString()) {
    throw new AppError('發票日期不可晚於今天', 'VALIDATION');
  }
  return date;
}

/** 開立／修改發票時的共用欄位 */
function validateInvoiceInput(params) {
  return {
    invoice_no: normalizeInvoiceNo(params.invoice_no),
    buyer_tax_id: validateTaxId(params.buyer_tax_id),
    invoice_date: parseInvoiceDate(params.invoice_date),
  };
}

/** 號碼不可與其他有效發票重複（作廢的不算） */
function assertInvoiceNoUnique(invoices, invoiceNo, exceptId) {
  if (!invoiceNo) return;
  const dup = invoices.find(i => i.invoice_no === invoiceNo && isValidInvoice(i) && i.invoice_id !== exceptId);
  if (dup) throw new AppError(`發票號碼 ${invoiceNo} 已用於 ${dup.source_id}`, 'VALIDATION');
}

/** 建立發票物件（尚未寫入），並加入 allInvoices 讓下一個主鍵接續；主鍵日期取發票日期 */
function newInvoiceRecord(allInvoices, fields) {
  const now = new Date();
  const inv = normalizeInvoice({
    invoice_id: nextId('INV', allInvoices.map(i => i.invoice_id), fields.invoice_date),
    invoice_no: fields.invoice_no,
    source_type: fields.source_type,
    source_id: fields.source_id,
    invoice_date: fields.invoice_date,
    amount: fields.amount,
    buyer_tax_id: fields.buyer_tax_id,
    invoice_status: INVOICE_ISSUED,
    note: '',
    created_at: now,
    updated_at: now,
  });
  allInvoices.push(inv);
  return inv;
}

function appendNote(note, line) {
  return note ? `${note}\n${line}` : line;
}

/* ---------- 訂單發票 ---------- */

/**
 * 讀取一筆訂單的品項與發票，供修改後以 saveOrderInvoiceContext 比對差異寫回（需在 withLock 內呼叫）。
 * 修改方式：改 ctx.items 的 invoice_id、改或移除 ctx.invoices 的元素、以 addOrderInvoice 新增。
 */
function loadOrderInvoiceContext(orderId) {
  const order = readOrders().find(o => o.order_id === String(orderId));
  if (!order) throw new AppError('找不到訂單', 'NOT_FOUND');
  const allInvoices = readInvoices();
  const items = readOrderItems().filter(i => i.order_id === order.order_id);
  const invoices = invoicesOf(allInvoices, INVOICE_SOURCE_SALE, order.order_id);
  return {
    order,
    items,
    invoices,
    allInvoices,
    createdIds: [],
    original: { items: items.map(i => ({ ...i })), invoices: invoices.map(i => ({ ...i })) },
  };
}

function addOrderInvoice(ctx, input) {
  const inv = newInvoiceRecord(ctx.allInvoices, {
    ...input,
    source_type: INVOICE_SOURCE_SALE,
    source_id: ctx.order.order_id,
    amount: 0,  // 由 saveOrderInvoiceContext 計算
  });
  ctx.invoices.push(inv);
  ctx.createdIds.push(inv.invoice_id);
  return inv;
}

/** 折扣依品項金額比例分攤，四捨五入到整數 */
function invoiceShare(order, lines) {
  if (!order.subtotal) return lines;
  return lines - Math.round((order.discount * lines) / order.subtotal);
}

/**
 * 依 ctx 的變動整理並寫回：
 * 1. 品項指向已移除的發票 → 清除 invoice_id；沒有品項的待補號碼發票 → 刪除
 * 2. 訂單「已完成」時重算可調整發票（待補號碼與本次新增）的金額：依比例分攤折扣；
 *    所有品項都已開發票時，最後一張可調整的發票以「總計 − 其他有效發票」補平四捨五入差額
 * 3. 與讀取時比對，只寫入有變動的列
 */
function saveOrderInvoiceContext(ctx) {
  const { order } = ctx;
  const clearDangling = () => {
    const ids = new Set(ctx.invoices.map(i => i.invoice_id));
    ctx.items.forEach(i => {
      if (i.invoice_id && !ids.has(i.invoice_id)) i.invoice_id = '';
    });
  };
  const itemsOf = inv => ctx.items.filter(i => i.invoice_id === inv.invoice_id);

  clearDangling();
  ctx.invoices = ctx.invoices.filter(inv => !isPendingInvoice(inv) || itemsOf(inv).length > 0);
  clearDangling();

  if (order.status === ORDER_COMPLETED) {
    const adjustable = ctx.invoices.filter(inv => isPendingInvoice(inv) || ctx.createdIds.includes(inv.invoice_id));
    adjustable.forEach(inv => {
      inv.amount = invoiceShare(order, itemsOf(inv).reduce((s, i) => s + i.line_total, 0));
    });
    if (adjustable.length > 0 && ctx.items.every(i => i.invoice_id)) {
      const last = adjustable[adjustable.length - 1];
      const others = ctx.invoices
        .filter(inv => inv !== last && isValidInvoice(inv))
        .reduce((s, inv) => s + inv.amount, 0);
      last.amount = order.total - others;
    }
  }

  const now = new Date();
  const currentIds = new Set(ctx.invoices.map(i => i.invoice_id));
  const deletedIds = ctx.original.invoices.map(i => i.invoice_id).filter(id => !currentIds.has(id));
  const fieldsKey = inv =>
    JSON.stringify([inv.invoice_no, inv.invoice_date, inv.amount, inv.buyer_tax_id, inv.invoice_status, inv.note]);
  const originalById = new Map(ctx.original.invoices.map(i => [i.invoice_id, i]));
  const invoicePatches = {};
  ctx.invoices.forEach(inv => {
    const before = originalById.get(inv.invoice_id);
    if (before && fieldsKey(before) !== fieldsKey(inv)) {
      inv.updated_at = now;
      invoicePatches[inv.invoice_id] = inv;
    }
  });
  const created = ctx.invoices.filter(inv => ctx.createdIds.includes(inv.invoice_id));
  const itemPatches = {};
  ctx.items.forEach((item, i) => {
    if (item.invoice_id !== ctx.original.items[i].invoice_id) itemPatches[item.item_id] = { invoice_id: item.invoice_id };
  });

  deleteRecords('Invoices', 'invoice_id', deletedIds);
  updateRecords('Invoices', 'invoice_id', invoicePatches);
  appendRecords('Invoices', created);
  updateRecords('OrderItems', 'item_id', itemPatches);
  return { order, items: ctx.items, invoices: ctx.invoices };
}

function requireCompletedOrder(order) {
  if (order.status !== ORDER_COMPLETED) throw new AppError(`訂單${order.status}，無法調整發票`, 'VALIDATION');
}

function requireItemIds(itemIds) {
  if (!Array.isArray(itemIds) || itemIds.length === 0) throw new AppError('請至少選擇一個品項', 'VALIDATION');
  return itemIds.map(String);
}

/** 訂單開立發票：選擇未開發票的品項；回傳 { order, items, invoices } */
function issueOrderInvoice(params) {
  const input = validateInvoiceInput(params);
  const itemIds = requireItemIds(params.item_ids);
  return withLock(() => {
    const ctx = loadOrderInvoiceContext(params.order_id);
    requireCompletedOrder(ctx.order);
    assertInvoiceNoUnique(ctx.allInvoices, input.invoice_no);
    const selected = itemIds.map(id => {
      const item = ctx.items.find(i => i.item_id === id);
      if (!item) throw new AppError('找不到品項', 'NOT_FOUND');
      if (item.invoice_id && ctx.invoices.some(inv => inv.invoice_id === item.invoice_id)) {
        throw new AppError(`「${item.product_name}」已開立發票`, 'VALIDATION');
      }
      return item;
    });
    const inv = addOrderInvoice(ctx, input);
    selected.forEach(item => (item.invoice_id = inv.invoice_id));
    return saveOrderInvoiceContext(ctx);
  });
}

/**
 * 把品項移到另一張待補號碼的發票，to_invoice_id 空白則移出成「未開發票」。
 * 只能移動未開發票或待補號碼發票中的品項；發票的品項全部移走時自動刪除。
 */
function moveInvoiceItems(params) {
  const itemIds = requireItemIds(params.item_ids);
  const toId = toText(params.to_invoice_id);
  return withLock(() => {
    const ctx = loadOrderInvoiceContext(params.order_id);
    requireCompletedOrder(ctx.order);
    if (toId) {
      const target = ctx.invoices.find(i => i.invoice_id === toId);
      if (!target) throw new AppError('找不到發票', 'NOT_FOUND');
      if (!isPendingInvoice(target)) throw new AppError('只能移到待補號碼的發票', 'VALIDATION');
    }
    itemIds.forEach(id => {
      const item = ctx.items.find(i => i.item_id === id);
      if (!item) throw new AppError('找不到品項', 'NOT_FOUND');
      const from = ctx.invoices.find(inv => inv.invoice_id === item.invoice_id);
      if (from && !isPendingInvoice(from)) {
        throw new AppError(`「${item.product_name}」所屬的發票已填號碼，請先作廢`, 'VALIDATION');
      }
      item.invoice_id = toId;
    });
    return saveOrderInvoiceContext(ctx);
  });
}

/* ---------- 維修單發票 ---------- */

/** 維修單開立發票：金額等於總金額；一張維修單只能有一張有效發票；回傳 getRepair 的結果 */
function issueRepairInvoice(params) {
  const input = validateInvoiceInput(params);
  return withLock(() => {
    const repair = readRepairs().find(r => r.repair_id === String(params.repair_id));
    if (!repair) throw new AppError('找不到維修單', 'NOT_FOUND');
    if (repair.status === REPAIR_CANCELLED_STATUS) throw new AppError('維修單已取消，無法開立發票', 'VALIDATION');
    if (repair.final_amount === null) throw new AppError('請先填寫總金額', 'VALIDATION');
    const allInvoices = readInvoices();
    if (invoicesOf(allInvoices, INVOICE_SOURCE_REPAIR, repair.repair_id).some(isValidInvoice)) {
      throw new AppError('此維修單已有發票', 'VALIDATION');
    }
    assertInvoiceNoUnique(allInvoices, input.invoice_no);
    const inv = newInvoiceRecord(allInvoices, {
      ...input,
      source_type: INVOICE_SOURCE_REPAIR,
      source_id: repair.repair_id,
      amount: repair.final_amount,
    });
    appendRecord('Invoices', inv);
    return getRepair({ id: repair.repair_id });
  });
}

/* ---------- 共用：修改、刪除、作廢 ---------- */

function findInvoice(id) {
  const inv = readInvoices().find(i => i.invoice_id === String(id));
  if (!inv) throw new AppError('找不到發票', 'NOT_FOUND');
  return inv;
}

/** 發票所屬單據的詳情：銷售 → getOrder、維修 → getRepair */
function invoiceSourceDetail(inv) {
  return inv.source_type === INVOICE_SOURCE_REPAIR ? getRepair({ id: inv.source_id }) : getOrder({ id: inv.source_id });
}

/**
 * 修改發票：「已開立」可改號碼、日期、統編、備註（更正登打錯誤）；作廢或折讓只改備註。
 * 回傳所屬單據的詳情。
 */
function updateInvoice(params) {
  return withLock(() => {
    const inv = findInvoice(params.id);
    const patch = { note: toText(params.note), updated_at: new Date() };
    if (inv.invoice_status === INVOICE_ISSUED) {
      Object.assign(patch, validateInvoiceInput(params));
      assertInvoiceNoUnique(readInvoices(), patch.invoice_no, inv.invoice_id);
    }
    updateRecord('Invoices', 'invoice_id', inv.invoice_id, patch);
    return invoiceSourceDetail(inv);
  });
}

/** 刪除待補號碼的發票（還沒印出）；銷售發票的品項回到「未開發票」 */
function deleteInvoice({ id }) {
  return withLock(() => {
    const inv = findInvoice(id);
    if (!isPendingInvoice(inv)) throw new AppError('只能刪除待補號碼的發票，已填號碼請改為作廢', 'VALIDATION');
    if (inv.source_type === INVOICE_SOURCE_SALE) {
      const ctx = loadOrderInvoiceContext(inv.source_id);
      ctx.invoices = ctx.invoices.filter(i => i.invoice_id !== inv.invoice_id);
      return saveOrderInvoiceContext(ctx);
    }
    deleteRecords('Invoices', 'invoice_id', [inv.invoice_id]);
    return invoiceSourceDetail(inv);
  });
}

/**
 * 作廢已填號碼的發票：原因必填、不可還原，原因與當時的品項寫入備註，金額保留。
 * 銷售發票只能在訂單「已完成」時單獨作廢，品項釋出成「未開發票」以便重開。
 */
function voidInvoice({ id, reason }) {
  const text = toText(reason);
  if (!text) throw new AppError('請填寫作廢原因', 'VALIDATION');
  return withLock(() => {
    const inv = findInvoice(id);
    if (inv.invoice_status !== INVOICE_ISSUED) throw new AppError(`發票已是「${inv.invoice_status}」`, 'VALIDATION');
    if (isPendingInvoice(inv)) throw new AppError('待補號碼的發票請直接刪除', 'VALIDATION');
    const line = `${todayString()} 作廢：${text}`;

    if (inv.source_type === INVOICE_SOURCE_SALE) {
      const ctx = loadOrderInvoiceContext(inv.source_id);
      requireCompletedOrder(ctx.order);
      const target = ctx.invoices.find(i => i.invoice_id === inv.invoice_id);
      const items = ctx.items.filter(i => i.invoice_id === inv.invoice_id);
      target.invoice_status = INVOICE_VOID;
      target.note = appendNote(target.note, `${line}（品項：${items.map(i => i.product_name).join('、')}）`);
      items.forEach(i => (i.invoice_id = ''));
      return saveOrderInvoiceContext(ctx);
    }
    updateRecord('Invoices', 'invoice_id', inv.invoice_id, {
      invoice_status: INVOICE_VOID,
      note: appendNote(inv.note, line),
      updated_at: new Date(),
    });
    return invoiceSourceDetail(inv);
  });
}

function test_isValidTaxId() {
  // 04595257：一般統編；10458575：第 7 碼為 7；12345678：錯誤
  console.log(['04595257', '10458575', '12345678'].map(id => `${id} ${isValidTaxId(id)}`).join('\n'));
}
