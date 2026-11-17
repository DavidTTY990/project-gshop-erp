import { Link, useLocation, useNavigate } from 'react-router';
import { Loader2Icon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import OrderStatusBadge from '@/components/OrderStatusBadge';
import Pagination from '@/components/Pagination';
import type { BackState } from '@/lib/navigation';
import { customerLabel, type OrderListRow } from '@/lib/orderSearch';
import { itemsLabel, type OrderRow } from '@/lib/orders';
import type { Page } from '@/lib/paging';
import { dateOnly, formatMoney } from '@/lib/repairs';

/** 發票需要處理時才顯示標籤：未開發票、待補號碼 */
export function OrderInvoiceFlags({ order }: { order: OrderRow }) {
  return (
    <>
      {order.uninvoiced && <Badge className="bg-amber-100 text-amber-800">未開發票</Badge>}
      {order.pending_invoice && <Badge className="bg-amber-100 text-amber-800">待補號碼</Badge>}
    </>
  );
}

/** 一筆訂單的卡片內容（手機列表與客人頁共用）；title 為客人姓名或「散客」 */
export function OrderCardContent({ order, title }: { order: OrderRow; title?: string }) {
  return (
    <>
      <span className="flex items-center justify-between gap-2">
        <span className="min-w-0 truncate font-medium">{title ?? itemsLabel(order)}</span>
        <OrderStatusBadge status={order.status} className="shrink-0" />
      </span>
      {title !== undefined && <span className="truncate text-sm">{itemsLabel(order)}</span>}
      <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
        <span className="font-medium text-foreground">{formatMoney(order.total)}</span>
        <span>
          {order.order_id}・{dateOnly(order.order_date)}
        </span>
        <OrderInvoiceFlags order={order} />
      </span>
    </>
  );
}

type Props = {
  data?: Page<OrderListRow>;
  isPending: boolean;
  isFetching: boolean;
  onPageChange: (page: number) => void;
};

/** 訂單搜尋結果：手機為卡片、md 以上為表格 */
export default function OrderList({ data, isPending, isFetching, onPageChange }: Props) {
  const navigate = useNavigate();
  const location = useLocation();
  const backState: BackState = { from: location.pathname + location.search, label: '回搜尋結果' };

  if (isPending) {
    return (
      <p className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
        <Loader2Icon className="size-4 animate-spin" />
        載入中…
      </p>
    );
  }
  if (!data) return null;
  if (data.total === 0) return <p className="py-8 text-center text-sm text-muted-foreground">找不到符合的訂單</p>;

  return (
    <div className={isFetching ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
      {/* 手機：卡片 */}
      <ul className="flex flex-col gap-2 md:hidden">
        {data.items.map((row) => (
          <li key={row.order.order_id}>
            <Link
              to={`/orders/${row.order.order_id}`}
              state={backState}
              className="flex flex-col gap-1 rounded-lg border bg-background p-3 active:bg-accent"
            >
              <OrderCardContent order={row.order} title={customerLabel(row)} />
            </Link>
          </li>
        ))}
      </ul>

      {/* 平板／電腦：表格 */}
      <div className="hidden rounded-lg border bg-background md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>單號</TableHead>
              <TableHead>日期</TableHead>
              <TableHead>客人</TableHead>
              <TableHead>品項</TableHead>
              <TableHead className="text-right">總計</TableHead>
              <TableHead>付款</TableHead>
              <TableHead>狀態</TableHead>
              <TableHead>發票</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.items.map((row) => (
              <TableRow
                key={row.order.order_id}
                className="cursor-pointer"
                onClick={() => navigate(`/orders/${row.order.order_id}`, { state: backState })}
              >
                <TableCell className="font-medium">
                  <Link to={`/orders/${row.order.order_id}`} state={backState}>
                    {row.order.order_id}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">{dateOnly(row.order.order_date)}</TableCell>
                <TableCell className="max-w-32 truncate">{customerLabel(row)}</TableCell>
                <TableCell className="max-w-56 truncate">{itemsLabel(row.order)}</TableCell>
                <TableCell className="text-right">{formatMoney(row.order.total)}</TableCell>
                <TableCell>{row.order.payment_method}</TableCell>
                <TableCell>
                  <OrderStatusBadge status={row.order.status} />
                </TableCell>
                <TableCell>
                  <span className="flex gap-1">
                    <OrderInvoiceFlags order={row.order} />
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Pagination data={data} onPageChange={onPageChange} />
    </div>
  );
}
