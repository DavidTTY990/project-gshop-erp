import { useMutation, useQuery } from '@tanstack/react-query';
import { callApi } from './api';
import { upsertDeviceCache, type Device, type DeviceInput } from './devices';
import { queryClient } from './queryClient';

export type Repair = {
  repair_id: string;
  customer_id: string;
  device_id: string;
  received_at: string;
  accessories: string;
  intake_condition: string;
  issue: string;
  diagnosis: string;
  status: string;
  quote_amount: number | null;
  final_amount: number | null;
  deposit: number;
  is_paid: boolean;
  estimated_done_date: string; // 'yyyy-mm-dd 00:00' 或空字串
  completed_at: string;
  picked_up_at: string;
  handler: string;
  note: string;
  created_at: string;
  updated_at: string;
};

export type RepairLog = {
  log_id: string;
  repair_id: string;
  status: string;
  note: string;
  staff: string;
  created_at: string;
};

export type RepairDetail = { repair: Repair; device: Device | null; logs: RepairLog[] };

/** 詳情頁可編輯的欄位；金額以字串表示輸入框內容，空字串為未填 */
export type RepairFieldsInput = {
  issue: string;
  accessories: string;
  intake_condition: string;
  diagnosis: string;
  quote_amount: string;
  final_amount: string;
  deposit: string;
  is_paid: boolean;
  estimated_done_date: string; // yyyy-mm-dd
  handler: string;
  note: string;
};

/** 新增維修單：沿用既有機器（device_id）或新機器（device） */
export type CreateRepairInput = Omit<RepairFieldsInput, 'diagnosis' | 'final_amount' | 'is_paid'> & {
  customer_id: string;
  device_id?: string;
  device?: DeviceInput;
  staff: string;
};

export type ChangeStatusInput = { status: string; note: string; staff: string; mark_paid?: boolean };

/**
 * 狀態分類（值來自 Settings 的 repair_status，改名時需同步修改這裡與後端 repairs.js）。
 * 用於標籤顏色與「逾期」判斷。
 */
const ACTIVE_STATUSES = ['已收件', '檢測中', '維修中'];
const WAITING_STATUSES = ['待報價', '待零件'];
const READY_STATUSES = ['可取件'];
export const PICKED_UP_STATUS = '已取件';

export type StatusTone = 'active' | 'waiting' | 'ready' | 'closed';

export function statusTone(status: string): StatusTone {
  if (ACTIVE_STATUSES.includes(status)) return 'active';
  if (WAITING_STATUSES.includes(status)) return 'waiting';
  if (READY_STATUSES.includes(status)) return 'ready';
  return 'closed';
}

/** 'yyyy-mm-dd hh:mm' → 'yyyy-mm-dd' */
export function dateOnly(value: string) {
  return value ? value.slice(0, 10) : '';
}

/** 台北時間的今天 'yyyy-mm-dd' */
export function todayString() {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Taipei' });
}

/** 已超過預計完成日，且仍在處理中或等待中 */
export function isOverdue(repair: Repair) {
  const tone = statusTone(repair.status);
  const due = dateOnly(repair.estimated_done_date);
  return !!due && due < todayString() && (tone === 'active' || tone === 'waiting');
}

/** 尾款 = 總金額 − 訂金；未填總金額時以報價計算，都沒有時為 null */
export function balanceDue(repair: Repair) {
  const total = repair.final_amount ?? repair.quote_amount;
  return total === null ? null : total - repair.deposit;
}

/** 金額顯示，例 $1,200；null 顯示 — */
export function formatMoney(n: number | null) {
  return n === null ? '—' : `$${n.toLocaleString('zh-TW')}`;
}

export const REPAIRS_KEY = ['repairs', 'all'];
const detailKey = (id: string) => ['repairs', 'detail', id];

export function useAllRepairs() {
  return useQuery({
    queryKey: REPAIRS_KEY,
    queryFn: () => callApi<Repair[]>('allRepairs'),
  });
}

export function useRepair(id: string) {
  return useQuery({
    queryKey: detailKey(id),
    queryFn: () => callApi<RepairDetail>('getRepair', { id }),
  });
}

function upsertRepairCache(repair: Repair) {
  queryClient.setQueryData<Repair[]>(REPAIRS_KEY, (list) => {
    if (!list) return list;
    const exists = list.some((r) => r.repair_id === repair.repair_id);
    return exists ? list.map((r) => (r.repair_id === repair.repair_id ? repair : r)) : [...list, repair];
  });
}

export function useCreateRepair() {
  return useMutation({
    mutationFn: (input: CreateRepairInput) => callApi<RepairDetail>('createRepair', input),
    onSuccess: (detail) => {
      upsertRepairCache(detail.repair);
      if (detail.device) upsertDeviceCache(detail.device);
      queryClient.setQueryData(detailKey(detail.repair.repair_id), detail);
    },
  });
}

export function useUpdateRepair(id: string) {
  return useMutation({
    mutationFn: (input: RepairFieldsInput) => callApi<Repair>('updateRepair', { id, ...input }),
    onSuccess: (repair) => {
      upsertRepairCache(repair);
      queryClient.setQueryData<RepairDetail>(detailKey(id), (d) => d && { ...d, repair });
    },
  });
}

export function useChangeRepairStatus(id: string) {
  return useMutation({
    mutationFn: (input: ChangeStatusInput) =>
      callApi<{ repair: Repair; log: RepairLog }>('changeRepairStatus', { id, ...input }),
    onSuccess: ({ repair, log }) => {
      upsertRepairCache(repair);
      queryClient.setQueryData<RepairDetail>(detailKey(id), (d) => d && { ...d, repair, logs: [log, ...d.logs] });
    },
  });
}
