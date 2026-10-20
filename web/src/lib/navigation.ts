/**
 * 進入詳情頁時帶上的來源頁，供「返回」按鈕使用，例：{ from: '/?q=0912&page=2', label: '回搜尋結果' }。
 * state 為來源頁自己的 BackState：返回時一併帶回，讓來源頁的返回按鈕仍指向它原本的來源
 * （例：搜尋結果 → 客人頁 → 維修單 → 回客人頁 → 回搜尋結果）。
 */
export type BackState = { from: string; label: string; state?: BackState | null };

export function readBackState(state: unknown): BackState | null {
  const s = state as Partial<BackState> | null;
  if (!s || typeof s.from !== 'string' || typeof s.label !== 'string') return null;
  return { from: s.from, label: s.label, state: readBackState(s.state) };
}

/** 從目前頁面連到詳情頁時使用：記住目前網址，並保留目前頁面自己的來源 */
export function backStateFrom(location: { pathname: string; search: string; state: unknown }, label: string): BackState {
  return { from: location.pathname + location.search, label, state: readBackState(location.state) };
}
