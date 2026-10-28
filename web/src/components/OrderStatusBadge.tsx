import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ORDER_CANCELLED, ORDER_COMPLETED } from '@/lib/orders';

/** 訂單狀態標籤：已完成綠、已取消灰、已退貨橘 */
export default function OrderStatusBadge({ status, className }: { status: string; className?: string }) {
  const tone =
    status === ORDER_COMPLETED
      ? 'bg-green-100 text-green-800'
      : status === ORDER_CANCELLED
        ? 'bg-muted text-muted-foreground'
        : 'bg-amber-100 text-amber-800';
  return <Badge className={cn(tone, className)}>{status}</Badge>;
}
