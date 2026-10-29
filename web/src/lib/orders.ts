import { useMutation, useQuery } from '@tanstack/react-query';
import { callApi } from './api';
import type { Invoice } from './invoices';
import { queryClient } from './queryClient';

export type Order = {
  order_id: string;
  customer_id: string; // WALK_IN_CUSTOMER_ID = 散客
  order_date: string; // 'yyyy-mm-dd 00:00'
  subtotal: number;
  discount: number;
  total: number;
  payment_method: string;
  status: string;
  returned_at: string; // 取消或退貨的時間
  return_reason: string; // 取消或退貨的原因
  staff: string;
  note: string;
  created_at: string;
  updated_at: string;
};

export type OrderItem = {
  item_id: string;
  order_id: string;
  invoice_id: string;
  product_name: string;
  category: string;
  platform: string;
  condition: string;
  unit_price: number;
  qty: number;
  line_total: number;
  note: string;
};

export type OrderDetail = { order: Order; items: OrderItem[]; invoices: Invoice[] };

/** 商品名稱提示：過去用過的名稱與最近一次的屬性 */
export type ProductSuggestion = Pick<OrderItem, 'product_name' | 'category' | 'platform' | 'condition' | 'unit_price'>;

/** 新增訂單的品項；金額以字串表示輸入框內容 */
export type OrderItemInput = {
  product_name: string;
  category: string;
  platform: string;
  condition: string;
  unit_price: string;
  qty: string;
  note: string;
};

export type CreateOrderInput = {
  customer_id: string;
  order_date: string; // yyyy-mm-dd
  items: OrderItemInput[];
  discount: string;
  payment_method: string;
  staff: string;
  note: string;
  /** 全部品項開成一張發票（日期為訂單日期）；null = 不開 */
  invoice: { invoice_no: string; buyer_tax_id: string } | null;
};

export type UpdateOrderInput = Pick<Order, 'customer_id' | 'payment_method' | 'staff' | 'note'>;

/** 散客的 customer_id（Customers 分頁沒有這一列）；與後端 orders.js 相同 */
export const WALK_IN_CUSTOMER_ID = 'WALK-IN';

/** 散客：WALK-IN 或空白（防禦舊資料） */
export function isWalkIn(customerId: string) {
  return !customerId || customerId === WALK_IN_CUSTOMER_ID;
}

/** 狀態值來自 Settings 的 order_status，改名時需同步修改這裡與後端 orders.js */
export const ORDER_COMPLETED = '已完成';
export const ORDER_CANCELLED = '已取消';
export const ORDER_RETURNED = '已退貨';

export const ORDERS_KEY = ['orders', 'all'];
const detailKey = (id: string) => ['orders', 'detail', id];

export function useAllOrders() {
  return useQuery({
    queryKey: ORDERS_KEY,
    queryFn: () => callApi<Order[]>('allOrders'),
  });
}

export function useOrder(id: string) {
  return useQuery({
    queryKey: detailKey(id),
    queryFn: () => callApi<OrderDetail>('getOrder', { id }),
  });
}

export function useProductSuggestions() {
  return useQuery({
    queryKey: ['orders', 'productSuggestions'],
    queryFn: () => callApi<ProductSuggestion[]>('productSuggestions'),
  });
}

function upsertOrderCache(order: Order) {
  queryClient.setQueryData<Order[]>(ORDERS_KEY, (list) => {
    if (!list) return list;
    const exists = list.some((o) => o.order_id === order.order_id);
    return exists ? list.map((o) => (o.order_id === order.order_id ? order : o)) : [...list, order];
  });
  queryClient.setQueryData<OrderDetail>(detailKey(order.order_id), (d) => d && { ...d, order });
}

/** 寫入後以回傳的詳情更新快取（發票操作也會用到） */
export function setOrderDetailCache(detail: OrderDetail) {
  queryClient.setQueryData(detailKey(detail.order.order_id), detail);
  upsertOrderCache(detail.order);
}

export function useCreateOrder() {
  return useMutation({
    mutationFn: (input: CreateOrderInput) => callApi<OrderDetail>('createOrder', input),
    onSuccess: (detail) => {
      setOrderDetailCache(detail);
      // 新的商品名稱與價格要出現在下一筆訂單的提示中
      queryClient.invalidateQueries({ queryKey: ['orders', 'productSuggestions'] });
    },
  });
}

export function useUpdateOrder(id: string) {
  return useMutation({
    mutationFn: (input: UpdateOrderInput) => callApi<Order>('updateOrder', { id, ...input }),
    onSuccess: upsertOrderCache,
  });
}

/**
 * 取消或退貨；原因必填。發票連動由後端處理：待補號碼的發票刪除，已填號碼的取消時作廢、
 * 退貨時依 invoice_actions（{ [invoice_id]: '作廢' | '折讓' }）。
 */
export function useCloseOrder(id: string, kind: 'cancel' | 'return') {
  return useMutation({
    mutationFn: (input: { reason: string; invoice_actions?: Record<string, string> }) =>
      callApi<OrderDetail>(kind === 'cancel' ? 'cancelOrder' : 'returnOrder', { id, ...input }),
    onSuccess: setOrderDetailCache,
  });
}

/** 依小計與比例（例 95 = 95 折）換算折扣金額，四捨五入到整數 */
export function discountByRate(subtotal: number, rate: number) {
  return Math.round((subtotal * (100 - rate)) / 100);
}

/** 「95」→「95 折」、「90」→「9 折」 */
export function rateLabel(rate: number) {
  return `${rate % 10 === 0 ? rate / 10 : rate} 折`;
}

/** 品項列：uid 只在前端使用，作為 React key 與檢核狀態的鍵（刪除中間的列時不會錯位） */
export type OrderItemRow = OrderItemInput & { uid: string };

// 不用 crypto.randomUUID()：手機以區網 IP（http）連 dev server 時不是安全環境，無法使用
let rowSeq = 0;

export function newItemRow(): OrderItemRow {
  rowSeq += 1;
  return {
    uid: `row-${rowSeq}`,
    product_name: '',
    category: '',
    platform: '',
    condition: '全新',
    unit_price: '',
    qty: '1',
    note: '',
  };
}

/** 該列小計；單價或數量不是整數時為 null */
export function lineTotal(item: OrderItemInput) {
  const price = /^\d+$/.test(item.unit_price) ? Number(item.unit_price) : null;
  const qty = /^\d+$/.test(item.qty) ? Number(item.qty) : null;
  return price === null || qty === null ? null : price * qty;
}
