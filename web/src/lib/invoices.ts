import { useMutation } from '@tanstack/react-query';
import { callApi } from './api';
import { setOrderDetailCache, type Order, type OrderDetail, type OrderItem } from './orders';
import { setRepairDetailCache, type RepairDetail } from './repairs';

export type Invoice = {
  invoice_id: string;
  invoice_no: string; // 空字串 = 待補號碼
  source_type: string;
  source_id: string;
  invoice_date: string; // 'yyyy-mm-dd 00:00'
  amount: number;
  buyer_tax_id: string;
  invoice_status: string;
  note: string;
  created_at: string;
  updated_at: string;
};

/** 開立／修改發票的欄位；日期為 yyyy-mm-dd */
export type InvoiceInput = { invoice_no: string; buyer_tax_id: string; invoice_date: string };

/** 值來自 Settings 的 invoice_status／source_type，改名時需同步修改這裡與後端 invoices.js */
export const INVOICE_ISSUED = '已開立';
export const INVOICE_VOID = '作廢';
export const INVOICE_ALLOWANCE = '折讓';
export const INVOICE_SOURCE_SALE = '銷售';
export const INVOICE_SOURCE_REPAIR = '維修';

/** 待補號碼：已開立但還沒填號碼，可調整品項或刪除 */
export function isPendingInvoice(inv: Invoice) {
  return inv.invoice_status === INVOICE_ISSUED && !inv.invoice_no;
}

/** 有效發票：已開立（含待補號碼）與折讓 */
export function isValidInvoice(inv: Invoice) {
  return inv.invoice_status !== INVOICE_VOID;
}

/** 與後端 normalizeInvoiceNo 相同：轉大寫、去掉空白與連字號 */
export function normalizeInvoiceNo(v: string) {
  return v.trim().toUpperCase().replace(/[\s-]/g, '');
}

/** 統編檢查碼（與後端 isValidTaxId 相同；2023 年起可被 5 整除，第 7 碼為 7 時另有一種算法） */
export function isValidTaxId(id: string) {
  if (!/^\d{8}$/.test(id)) return false;
  const weights = [1, 2, 1, 2, 1, 2, 4, 1];
  const sum = weights.reduce((s, w, i) => {
    const p = Number(id[i]) * w;
    return s + Math.floor(p / 10) + (p % 10);
  }, 0);
  return sum % 5 === 0 || (id[6] === '7' && (sum + 1) % 5 === 0);
}

export type InvoiceField = 'invoice_no' | 'buyer_tax_id' | 'invoice_date';

/** 發票欄位檢核；withDate 為 false 時不檢查日期（新增訂單時日期等於訂單日期） */
export function validateInvoiceInput(v: InvoiceInput, today: string, withDate = true) {
  const errors: Partial<Record<InvoiceField, string>> = {};
  const no = normalizeInvoiceNo(v.invoice_no);
  if (no && !/^[A-Z]{2}\d{8}$/.test(no)) errors.invoice_no = '需為 2 個英文字母加 8 位數字';
  const taxId = v.buyer_tax_id.replace(/\s/g, '');
  if (taxId && !isValidTaxId(taxId)) errors.buyer_tax_id = '統編需為 8 位數字，且通過檢查碼';
  if (withDate) {
    if (!v.invoice_date) errors.invoice_date = '請選擇發票日期';
    else if (v.invoice_date > today) errors.invoice_date = '不可晚於今天';
  }
  return errors;
}

/** 折扣依品項金額比例分攤（與後端 invoiceShare 相同） */
function invoiceShare(order: Order, lines: number) {
  return order.subtotal ? lines - Math.round((order.discount * lines) / order.subtotal) : lines;
}

/**
 * 預估新開發票的金額（與後端 saveOrderInvoiceContext 相同的規則）：
 * 依比例分攤折扣；開完後所有品項都已開發票時，以「總計 − 其他有效發票」補平四捨五入差額。
 */
export function previewOrderInvoiceAmount(order: Order, items: OrderItem[], invoices: Invoice[], selectedIds: string[]) {
  const selected = items.filter((i) => selectedIds.includes(i.item_id));
  const share = invoiceShare(order, selected.reduce((s, i) => s + i.line_total, 0));
  const validIds = new Set(invoices.filter(isValidInvoice).map((i) => i.invoice_id));
  const allCovered = items.every((i) => selectedIds.includes(i.item_id) || validIds.has(i.invoice_id));
  if (!allCovered) return share;
  const others = invoices.filter(isValidInvoice).reduce((s, inv) => {
    if (!isPendingInvoice(inv)) return s + inv.amount;
    const lines = items.filter((i) => i.invoice_id === inv.invoice_id).reduce((t, i) => t + i.line_total, 0);
    return s + invoiceShare(order, lines);
  }, 0);
  return order.total - others;
}

/** 品項是否尚未開發票（沒有 invoice_id，或指向不存在的發票） */
export function isUninvoiced(item: OrderItem, invoices: Invoice[]) {
  return !item.invoice_id || !invoices.some((inv) => inv.invoice_id === item.invoice_id);
}

/** 寫入發票後的回傳：所屬訂單或維修單的詳情，直接更新快取 */
type SourceDetail = OrderDetail | RepairDetail;

function setSourceDetailCache(detail: SourceDetail) {
  if ('order' in detail) setOrderDetailCache(detail);
  else setRepairDetailCache(detail);
}

function useInvoiceMutation<T>(toParams: (input: T) => Record<string, unknown>, action: string) {
  return useMutation({
    mutationFn: (input: T) => callApi<SourceDetail>(action, toParams(input)),
    onSuccess: setSourceDetailCache,
  });
}

export function useIssueOrderInvoice(orderId: string) {
  return useInvoiceMutation((input: InvoiceInput & { item_ids: string[] }) => ({ order_id: orderId, ...input }), 'issueOrderInvoice');
}

/** to_invoice_id 空字串 = 移出成「未開發票」 */
export function useMoveInvoiceItems(orderId: string) {
  return useInvoiceMutation((input: { item_ids: string[]; to_invoice_id: string }) => ({ order_id: orderId, ...input }), 'moveInvoiceItems');
}

export function useIssueRepairInvoice(repairId: string) {
  return useInvoiceMutation((input: InvoiceInput) => ({ repair_id: repairId, ...input }), 'issueRepairInvoice');
}

export function useUpdateInvoice(id: string) {
  return useInvoiceMutation((input: InvoiceInput & { note: string }) => ({ id, ...input }), 'updateInvoice');
}

export function useDeleteInvoice(id: string) {
  return useInvoiceMutation<void>(() => ({ id }), 'deleteInvoice');
}

export function useVoidInvoice(id: string) {
  return useInvoiceMutation((reason: string) => ({ id, reason }), 'voidInvoice');
}
