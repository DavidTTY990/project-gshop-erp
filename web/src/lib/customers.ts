import { useMutation, useQuery } from '@tanstack/react-query';
import { callApi } from './api';
import { queryClient } from './queryClient';

export type Customer = {
  customer_id: string;
  name: string;
  phone: string;
  line_id: string;
  note: string;
  created_at: string;
  updated_at: string;
};

/** 可新增／編輯的欄位 */
export type CustomerInput = Pick<Customer, 'name' | 'phone' | 'line_id' | 'note'>;

export type Page<T> = { items: T[]; total: number; page: number; pageSize: number };

/** 後端回傳 DUPLICATE_PHONE 時附帶的既有客人 */
export type DuplicatePhone = Pick<Customer, 'customer_id' | 'name'>;

/** 電話只保留數字 */
export function normalizePhone(phone: string) {
  return phone.replace(/\D/g, '');
}

/** 09 開頭 10 碼的手機顯示為 0912-345-678，其餘原樣顯示 */
export function formatPhone(phone: string) {
  return /^09\d{8}$/.test(phone) ? `${phone.slice(0, 4)}-${phone.slice(4, 7)}-${phone.slice(7)}` : phone;
}

const ALL_KEY = ['customers', 'all'];
const PAGE_SIZE = 10;

/** 全部客人（試算表列順序）；搜尋、排序與分頁在前端處理 */
export function useAllCustomers() {
  return useQuery({
    queryKey: ALL_KEY,
    queryFn: () => callApi<Customer[]>('allCustomers'),
  });
}

/**
 * 依關鍵字搜尋（姓名、LINE ID 包含關鍵字；關鍵字含數字時也比對電話），新到舊排列並分頁。
 * 無關鍵字時列出全部客人。
 */
export function searchCustomers(customers: Customer[], keyword: string, page: number): Page<Customer> {
  const kw = keyword.trim().toLowerCase();
  const digits = normalizePhone(kw);
  const pageNo = Math.max(1, page);

  const matched = customers
    .map((c, i) => ({ c, i }))
    .filter(
      ({ c }) =>
        !kw ||
        String(c.name).toLowerCase().includes(kw) ||
        c.line_id.toLowerCase().includes(kw) ||
        (digits && normalizePhone(c.phone).includes(digits)),
    )
    // created_at（yyyy-mm-dd hh:mm）新到舊；相同時後加入的列在前
    .sort((a, b) => String(b.c.created_at).localeCompare(String(a.c.created_at)) || b.i - a.i)
    .map(({ c }) => c);

  return {
    items: matched.slice((pageNo - 1) * PAGE_SIZE, pageNo * PAGE_SIZE),
    total: matched.length,
    page: pageNo,
    pageSize: PAGE_SIZE,
  };
}

/** 從列表點進來時直接用全部客人的快取；快取沒有這位客人時才向後端查詢 */
export function useCustomer(id: string) {
  return useQuery({
    queryKey: ['customers', 'detail', id],
    queryFn: () => callApi<Customer>('getCustomer', { id }),
    initialData: () => queryClient.getQueryData<Customer[]>(ALL_KEY)?.find((c) => c.customer_id === id),
    initialDataUpdatedAt: () => queryClient.getQueryState(ALL_KEY)?.dataUpdatedAt,
  });
}

/** 新增或編輯成功後，直接以回傳的客人更新快取，不再重新讀取 */
function onSaved(customer: Customer) {
  queryClient.setQueryData(['customers', 'detail', customer.customer_id], customer);
  queryClient.setQueryData<Customer[]>(ALL_KEY, (list) => {
    if (!list) return list;
    const exists = list.some((c) => c.customer_id === customer.customer_id);
    return exists ? list.map((c) => (c.customer_id === customer.customer_id ? customer : c)) : [...list, customer];
  });
}

export function useCreateCustomer() {
  return useMutation({
    mutationFn: (input: CustomerInput) => callApi<Customer>('createCustomer', input),
    onSuccess: onSaved,
  });
}

export function useUpdateCustomer(id: string) {
  return useMutation({
    mutationFn: (input: CustomerInput) => callApi<Customer>('updateCustomer', { id, ...input }),
    onSuccess: onSaved,
  });
}
