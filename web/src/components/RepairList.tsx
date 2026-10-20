import { Link, useLocation, useNavigate } from 'react-router';
import { Loader2Icon } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import Pagination from '@/components/Pagination';
import RepairStatusBadge from '@/components/RepairStatusBadge';
import { cn } from '@/lib/utils';
import { deviceLabel } from '@/lib/devices';
import type { BackState } from '@/lib/navigation';
import type { Page } from '@/lib/paging';
import type { RepairRow } from '@/lib/repairSearch';
import { dateOnly, isOverdue } from '@/lib/repairs';

type Props = {
  data?: Page<RepairRow>;
  isPending: boolean;
  isFetching: boolean;
  onPageChange: (page: number) => void;
};

/** 維修搜尋結果：手機為卡片、md 以上為表格；逾期的預計完成日以紅字標示 */
export default function RepairList({ data, isPending, isFetching, onPageChange }: Props) {
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
  if (data.total === 0) return <p className="py-8 text-center text-sm text-muted-foreground">找不到符合的維修單</p>;

  const due = ({ repair }: RepairRow) => (
    <span className={cn(isOverdue(repair) && 'font-medium text-destructive')}>{dateOnly(repair.estimated_done_date) || '—'}</span>
  );

  return (
    <div className={isFetching ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
      {/* 手機：卡片 */}
      <ul className="flex flex-col gap-2 md:hidden">
        {data.items.map((row) => (
          <li key={row.repair.repair_id}>
            <Link
              to={`/repairs/${row.repair.repair_id}`}
              state={backState}
              className="flex flex-col gap-1 rounded-lg border bg-background p-3 active:bg-accent"
            >
              <span className="flex items-center justify-between gap-2">
                <span className="font-medium">{row.customer?.name ?? row.repair.customer_id}</span>
                <RepairStatusBadge status={row.repair.status} />
              </span>
              <span className="text-sm">{row.device ? deviceLabel(row.device) : '—'}</span>
              <span className="text-sm text-muted-foreground">
                {row.repair.repair_id}・收件 {dateOnly(row.repair.received_at)}・預計 {due(row)}
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
              <TableHead>單號</TableHead>
              <TableHead>狀態</TableHead>
              <TableHead>客人</TableHead>
              <TableHead>機器</TableHead>
              <TableHead>收件日</TableHead>
              <TableHead>預計完成</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.items.map((row) => (
              <TableRow
                key={row.repair.repair_id}
                className="cursor-pointer"
                onClick={() => navigate(`/repairs/${row.repair.repair_id}`, { state: backState })}
              >
                <TableCell className="font-medium">
                  <Link to={`/repairs/${row.repair.repair_id}`} state={backState}>
                    {row.repair.repair_id}
                  </Link>
                </TableCell>
                <TableCell>
                  <RepairStatusBadge status={row.repair.status} />
                </TableCell>
                <TableCell>{row.customer?.name ?? '—'}</TableCell>
                <TableCell className="max-w-48 truncate">{row.device ? deviceLabel(row.device) : '—'}</TableCell>
                <TableCell className="text-muted-foreground">{dateOnly(row.repair.received_at)}</TableCell>
                <TableCell>{due(row)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Pagination data={data} onPageChange={onPageChange} />
    </div>
  );
}
