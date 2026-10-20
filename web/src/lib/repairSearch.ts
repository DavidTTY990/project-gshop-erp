import { normalizePhone, type Customer } from './customers';
import { normalizeSerial, type Device } from './devices';
import { paginate, type Page } from './paging';
import { dateOnly, isOverdue, statusTone, todayString, type Repair } from './repairs';

/** 首頁維修分頁的搜尋條件；全部存在網址，從詳情頁返回時保留 */
export type RepairFilters = {
  q: string;
  statuses: string[]; // 空陣列 = 全部
  from: string; // 收件日 yyyy-mm-dd，含當天
  to: string;
  handler: string; // '' = 全部、UNASSIGNED = 未指派
  paid: '' | 'unpaid' | 'paid';
  overdue: boolean;
};

export const UNASSIGNED = '__none__';

export type RepairRow = { repair: Repair; customer?: Customer; device?: Device };

/** 網址參數 ↔ 搜尋條件（tab、page 由首頁處理） */
export function parseRepairFilters(params: URLSearchParams): RepairFilters {
  const paid = params.get('paid');
  return {
    q: params.get('q') ?? '',
    statuses: params.get('status')?.split(',').filter(Boolean) ?? [],
    from: params.get('from') ?? '',
    to: params.get('to') ?? '',
    handler: params.get('handler') ?? '',
    paid: paid === 'paid' || paid === 'unpaid' ? paid : '',
    overdue: params.get('overdue') === '1',
  };
}

export function writeRepairFilters(params: URLSearchParams, f: RepairFilters) {
  const set = (key: string, value: string) => (value ? params.set(key, value) : params.delete(key));
  set('q', f.q.trim() ? f.q : '');
  set('status', f.statuses.join(','));
  set('from', f.from);
  set('to', f.to);
  set('handler', f.handler);
  set('paid', f.paid);
  set('overdue', f.overdue ? '1' : '');
}

/** 已啟用的條件數（不含關鍵字），顯示在「篩選」按鈕上 */
export function countActiveFilters(f: RepairFilters) {
  return [f.statuses.length > 0, !!(f.from || f.to), !!f.handler, !!f.paid, f.overdue].filter(Boolean).length;
}

export const EMPTY_FILTERS: Omit<RepairFilters, 'q'> = { statuses: [], from: '', to: '', handler: '', paid: '', overdue: false };

/** 「未結案」：排除已結案（已取件、無法維修、已取消）的狀態 */
export function openStatuses(all: string[]) {
  return all.filter((s) => statusTone(s) !== 'closed');
}

/** 收件日期的快捷範圍（台北時間；週一為一週開始） */
export function datePreset(preset: 'today' | 'week' | 'month'): { from: string; to: string } {
  const today = todayString();
  if (preset === 'today') return { from: today, to: today };
  const d = new Date(`${today}T00:00:00`);
  if (preset === 'week') d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  else d.setDate(1);
  const from = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return { from, to: today };
}

/**
 * 依關鍵字（單號、客人姓名、電話、序號、機型、問題描述）與條件篩選，收件時間新到舊並分頁。
 */
export function searchRepairs(
  repairs: Repair[],
  customers: Customer[],
  devices: Device[],
  f: RepairFilters,
  page: number,
): Page<RepairRow> {
  const customerById = new Map(customers.map((c) => [c.customer_id, c]));
  const deviceById = new Map(devices.map((d) => [d.device_id, d]));
  const kw = f.q.trim().toLowerCase();
  const digits = normalizePhone(kw);
  const serial = normalizeSerial(kw);

  const matchKeyword = ({ repair, customer, device }: RepairRow) =>
    !kw ||
    repair.repair_id.toLowerCase().includes(kw) ||
    repair.issue.toLowerCase().includes(kw) ||
    String(customer?.name ?? '').toLowerCase().includes(kw) ||
    (!!digits && normalizePhone(customer?.phone ?? '').includes(digits)) ||
    (!!serial && normalizeSerial(device?.serial_no ?? '').includes(serial)) ||
    (device?.device_model ?? '').toLowerCase().includes(kw);

  const matchFilters = ({ repair }: RepairRow) => {
    const received = dateOnly(repair.received_at);
    if (f.statuses.length > 0 && !f.statuses.includes(repair.status)) return false;
    if (f.from && received < f.from) return false;
    if (f.to && received > f.to) return false;
    if (f.handler === UNASSIGNED ? !!repair.handler : f.handler && repair.handler !== f.handler) return false;
    if (f.paid === 'paid' && !repair.is_paid) return false;
    if (f.paid === 'unpaid' && repair.is_paid) return false;
    if (f.overdue && !isOverdue(repair)) return false;
    return true;
  };

  const rows = repairs
    .map((repair, i) => ({ row: { repair, customer: customerById.get(repair.customer_id), device: deviceById.get(repair.device_id) }, i }))
    .filter(({ row }) => matchFilters(row) && matchKeyword(row))
    // 收件時間新到舊；相同時後加入的列在前
    .sort((a, b) => b.row.repair.received_at.localeCompare(a.row.repair.received_at) || b.i - a.i)
    .map(({ row }) => row);

  return paginate(rows, page);
}
