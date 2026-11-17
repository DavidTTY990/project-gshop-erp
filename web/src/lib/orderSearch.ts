import { normalizePhone, type Customer } from './customers';
import { normalizeInvoiceNo } from './invoices';
import { compareOrdersDesc, isWalkIn, type OrderRow } from './orders';
import { dateOnly } from './repairs';

/** 首頁訂單分頁的搜尋條件；全部存在網址，從詳情頁返回時保留 */
export type OrderFilters = {
  q: string;
  statuses: string[]; // 空陣列 = 全部
  from: string; // 訂單日期 yyyy-mm-dd，含當天
  to: string;
  payment: string; // '' = 全部
  staff: string;
  invoice: '' | 'uninvoiced' | 'pending';
};

export type OrderListRow = { order: OrderRow; customer?: Customer };

/** 網址參數 ↔ 搜尋條件（tab、page 由首頁處理） */
export function parseOrderFilters(params: URLSearchParams): OrderFilters {
  const invoice = params.get('invoice');
  return {
    q: params.get('q') ?? '',
    statuses: params.get('status')?.split(',').filter(Boolean) ?? [],
    from: params.get('from') ?? '',
    to: params.get('to') ?? '',
    payment: params.get('payment') ?? '',
    staff: params.get('staff') ?? '',
    invoice: invoice === 'uninvoiced' || invoice === 'pending' ? invoice : '',
  };
}

export function writeOrderFilters(params: URLSearchParams, f: OrderFilters) {
  const set = (key: string, value: string) => (value ? params.set(key, value) : params.delete(key));
  set('q', f.q.trim() ? f.q : '');
  set('status', f.statuses.join(','));
  set('from', f.from);
  set('to', f.to);
  set('payment', f.payment);
  set('staff', f.staff);
  set('invoice', f.invoice);
}

/** 已啟用的條件數（不含關鍵字），顯示在「篩選」按鈕上 */
export function countActiveOrderFilters(f: OrderFilters) {
  return [f.statuses.length > 0, !!(f.from || f.to), !!f.payment, !!f.staff, !!f.invoice].filter(Boolean).length;
}

export const EMPTY_ORDER_FILTERS: Omit<OrderFilters, 'q'> = { statuses: [], from: '', to: '', payment: '', staff: '', invoice: '' };

/** 列表顯示的客人：姓名、「散客」，找不到客人時顯示 customer_id */
export function customerLabel({ order, customer }: OrderListRow) {
  return customer?.name ?? (isWalkIn(order.customer_id) ? '散客' : order.customer_id);
}

const WALK_IN_KEYWORD = '散客';

/**
 * 依關鍵字（單號、客人姓名、電話、商品名稱、發票號碼；「散客」找出所有散客訂單）與條件篩選，
 * 訂單日期新到舊。回傳全部符合的列，由呼叫端分頁與合計。
 */
export function filterOrders(orders: OrderRow[], customers: Customer[], f: OrderFilters): OrderListRow[] {
  const customerById = new Map(customers.map((c) => [c.customer_id, c]));
  const kw = f.q.trim().toLowerCase();
  const digits = normalizePhone(kw);
  const invoiceNo = normalizeInvoiceNo(kw);

  const matchKeyword = ({ order, customer }: OrderListRow) =>
    !kw ||
    (kw === WALK_IN_KEYWORD && isWalkIn(order.customer_id)) ||
    order.order_id.toLowerCase().includes(kw) ||
    String(customer?.name ?? '').toLowerCase().includes(kw) ||
    (!!digits && normalizePhone(customer?.phone ?? '').includes(digits)) ||
    order.item_names.some((n) => n.toLowerCase().includes(kw)) ||
    (!!invoiceNo && order.invoice_nos.some((no) => no.includes(invoiceNo)));

  const matchFilters = ({ order }: OrderListRow) => {
    const date = dateOnly(order.order_date);
    if (f.statuses.length > 0 && !f.statuses.includes(order.status)) return false;
    if (f.from && date < f.from) return false;
    if (f.to && date > f.to) return false;
    if (f.payment && order.payment_method !== f.payment) return false;
    if (f.staff && order.staff !== f.staff) return false;
    if (f.invoice === 'uninvoiced' && !order.uninvoiced) return false;
    if (f.invoice === 'pending' && !order.pending_invoice) return false;
    return true;
  };

  return orders
    .map((order) => ({ order, customer: customerById.get(order.customer_id) }))
    .filter((row) => matchFilters(row) && matchKeyword(row))
    .sort((a, b) => compareOrdersDesc(a.order, b.order));
}
