import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { SlidersHorizontalIcon, XIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import OrderFilterPanel from '@/components/OrderFilterPanel';
import OrderList from '@/components/OrderList';
import SearchInput from '@/components/SearchInput';
import { useAllCustomers } from '@/lib/customers';
import {
  countActiveOrderFilters,
  EMPTY_ORDER_FILTERS,
  filterOrders,
  parseOrderFilters,
  writeOrderFilters,
  type OrderFilters,
} from '@/lib/orderSearch';
import { summarizeOrders, useAllOrders } from '@/lib/orders';
import { paginate } from '@/lib/paging';
import { formatMoney } from '@/lib/repairs';

/** 首頁「訂單」分頁：關鍵字＋條件篩選，全部在前端處理；條件與頁碼放在網址 */
export default function OrderSearch() {
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = parseOrderFilters(searchParams);
  const page = Number(searchParams.get('page')) || 1;
  // 輸入框用自己的 state，避免網址更新延遲干擾中文輸入法
  const [keyword, setKeyword] = useState(filters.q);
  const active = countActiveOrderFilters(filters);
  // 有條件時預設展開，讓使用者看得到目前套用了什麼
  const [panelOpen, setPanelOpen] = useState(active > 0);

  const orders = useAllOrders();
  const customers = useAllCustomers();
  const rows = orders.data && customers.data ? filterOrders(orders.data, customers.data, { ...filters, q: keyword }) : undefined;
  const summary = rows && summarizeOrders(rows.map((r) => r.order));

  const update = (next: OrderFilters, p: number, replace: boolean) => {
    const params = new URLSearchParams(searchParams);
    writeOrderFilters(params, next);
    if (p > 1) params.set('page', String(p));
    else params.delete('page');
    setSearchParams(params, { replace });
  };

  const handleKeyword = (q: string) => {
    setKeyword(q);
    update({ ...filters, q }, 1, true);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <SearchInput value={keyword} onChange={handleKeyword} placeholder="單號、客人、電話、商品、發票號碼" />
        <Button
          variant={panelOpen ? 'secondary' : 'outline'}
          className="h-10 shrink-0"
          aria-label={active > 0 ? `篩選（已套用 ${active} 項）` : '篩選'}
          aria-expanded={panelOpen}
          onClick={() => setPanelOpen((o) => !o)}
        >
          <SlidersHorizontalIcon />
          <span className="hidden sm:inline">篩選</span>
          {active > 0 && <Badge className="h-5 min-w-5 px-1">{active}</Badge>}
        </Button>
      </div>

      {panelOpen && <OrderFilterPanel value={filters} onChange={(next) => update({ ...next, q: keyword }, 1, false)} />}

      {active > 0 && (
        <Button
          variant="ghost"
          className="-mt-2 h-8 self-start px-2 text-muted-foreground"
          onClick={() => update({ ...EMPTY_ORDER_FILTERS, q: keyword }, 1, false)}
        >
          <XIcon />
          清除篩選（{active}）
        </Button>
      )}

      {summary && summary.count > 0 && (
        <p className="-mb-2 text-sm text-muted-foreground">
          共 {summary.count} 筆・實收 <span className="font-semibold text-foreground">{formatMoney(summary.revenue)}</span>
          （只計已完成）
        </p>
      )}

      <OrderList
        data={rows && paginate(rows, page)}
        isPending={orders.isPending || customers.isPending}
        isFetching={orders.isFetching || customers.isFetching}
        onPageChange={(p) => update({ ...filters, q: keyword }, p, false)}
      />
    </div>
  );
}
