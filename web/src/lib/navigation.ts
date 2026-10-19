/** 進入詳情頁時帶上的來源頁，供「返回」按鈕使用，例：{ from: '/?q=0912&page=2', label: '回搜尋結果' } */
export type BackState = { from: string; label: string };

export function readBackState(state: unknown): BackState | null {
  const s = state as Partial<BackState> | null;
  return s && typeof s.from === 'string' && typeof s.label === 'string' ? { from: s.from, label: s.label } : null;
}
