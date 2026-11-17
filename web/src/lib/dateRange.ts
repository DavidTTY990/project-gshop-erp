import { todayString } from './repairs';

export type DatePreset = 'today' | 'week' | 'month';

/** 日期篩選的快捷範圍（台北時間；週一為一週開始） */
export function datePreset(preset: DatePreset): { from: string; to: string } {
  const today = todayString();
  if (preset === 'today') return { from: today, to: today };
  const d = new Date(`${today}T00:00:00`);
  if (preset === 'week') d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  else d.setDate(1);
  const from = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return { from, to: today };
}
