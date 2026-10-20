/** 前端分頁：搜尋結果每頁 10 筆 */
export type Page<T> = { items: T[]; total: number; page: number; pageSize: number };

const PAGE_SIZE = 10;

export function paginate<T>(items: T[], page: number): Page<T> {
  const pageNo = Math.max(1, page);
  return {
    items: items.slice((pageNo - 1) * PAGE_SIZE, pageNo * PAGE_SIZE),
    total: items.length,
    page: pageNo,
    pageSize: PAGE_SIZE,
  };
}
