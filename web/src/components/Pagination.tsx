import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Page } from '@/lib/paging';

/** 列表底部：總筆數與上一頁／下一頁 */
export default function Pagination({ data, onPageChange }: { data: Page<unknown>; onPageChange: (page: number) => void }) {
  const totalPages = Math.ceil(data.total / data.pageSize);

  return (
    <div className="mt-3 flex items-center justify-between gap-2 text-sm text-muted-foreground">
      <span>共 {data.total} 筆</span>
      {totalPages > 1 && (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon-lg"
            aria-label="上一頁"
            disabled={data.page <= 1}
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
            disabled={data.page >= totalPages}
            onClick={() => onPageChange(data.page + 1)}
          >
            <ChevronRightIcon />
          </Button>
        </div>
      )}
    </div>
  );
}
