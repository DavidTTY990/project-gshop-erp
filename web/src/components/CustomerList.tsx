import { Link, useLocation, useNavigate } from 'react-router';
import { ChevronLeftIcon, ChevronRightIcon, Loader2Icon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatPhone, type Customer, type Page } from '@/lib/customers';
import type { BackState } from '@/lib/navigation';

type Props = {
  data?: Page<Customer>;
  isPending: boolean;
  isFetching: boolean;
  onPageChange: (page: number) => void;
};

/** 客人搜尋結果：手機為卡片、md 以上為表格，附分頁 */
export default function CustomerList({ data, isPending, isFetching, onPageChange }: Props) {
  const navigate = useNavigate();
  const location = useLocation();
  // 讓客人頁的「回搜尋結果」回到目前的關鍵字與頁碼
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
  if (data.total === 0) return <p className="py-8 text-center text-sm text-muted-foreground">找不到符合的客人</p>;

  const totalPages = Math.ceil(data.total / data.pageSize);

  return (
    <div className={isFetching ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
      {/* 手機：卡片 */}
      <ul className="flex flex-col gap-2 md:hidden">
        {data.items.map((c) => (
          <li key={c.customer_id}>
            <Link
              to={`/customers/${c.customer_id}`}
              state={backState}
              className="flex flex-col gap-1 rounded-lg border bg-background p-3 active:bg-accent"
            >
              <span className="font-medium">{c.name}</span>
              <span className="text-sm text-muted-foreground">
                {[formatPhone(c.phone), c.line_id && `LINE：${c.line_id}`].filter(Boolean).join('・')}
              </span>
            </Link>
          </li>
        ))}
      </ul>

      {/* 平板／電腦：表格 */}
      <div className="hidden rounded-lg border bg-background md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>姓名</TableHead>
              <TableHead>電話</TableHead>
              <TableHead>LINE ID</TableHead>
              <TableHead>建立時間</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.items.map((c) => (
              <TableRow
                key={c.customer_id}
                className="cursor-pointer"
                onClick={() => navigate(`/customers/${c.customer_id}`, { state: backState })}
              >
                <TableCell className="font-medium">
                  <Link to={`/customers/${c.customer_id}`} state={backState}>
                    {c.name}
                  </Link>
                </TableCell>
                <TableCell>{formatPhone(c.phone)}</TableCell>
                <TableCell>{c.line_id}</TableCell>
                <TableCell className="text-muted-foreground">{c.created_at}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2 text-sm text-muted-foreground">
        <span>共 {data.total} 筆</span>
        {totalPages > 1 && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon-lg"
              aria-label="上一頁"
              disabled={data.page <= 1 || isFetching}
              onClick={() => onPageChange(data.page - 1)}
            >
              <ChevronLeftIcon />
            </Button>
            <span>
              {data.page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon-lg"
              aria-label="下一頁"
              disabled={data.page >= totalPages || isFetching}
              onClick={() => onPageChange(data.page + 1)}
            >
              <ChevronRightIcon />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
