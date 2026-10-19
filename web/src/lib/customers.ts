import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query';
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

export function useCustomers(keyword: string, page: number) {
  return useQuery({
    queryKey: ['customers', 'list', keyword, page],
    queryFn: () => callApi<Page<Customer>>('listCustomers', { keyword, page }),
    placeholderData: keepPreviousData, // 換頁時保留舊資料，避免畫面閃爍
  });
}

export function useCustomer(id: string) {
  return useQuery({
    queryKey: ['customers', 'detail', id],
    queryFn: () => callApi<Customer>('getCustomer', { id }),
  });
}

/** 新增或編輯成功後，讓列表重新讀取並更新該客人的快取 */
function onSaved(customer: Customer) {
  queryClient.setQueryData(['customers', 'detail', customer.customer_id], customer);
  queryClient.invalidateQueries({ queryKey: ['customers', 'list'] });
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
