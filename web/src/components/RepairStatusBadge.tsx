import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { statusTone, type StatusTone } from '@/lib/repairs';

const TONE_CLASS: Record<StatusTone, string> = {
  active: 'bg-blue-100 text-blue-800',
  waiting: 'bg-amber-100 text-amber-800',
  ready: 'bg-green-100 text-green-800',
  closed: 'bg-muted text-muted-foreground',
};

/** 維修狀態標籤：處理中藍、等待中橘、可取件綠、已結案灰 */
export default function RepairStatusBadge({ status, className }: { status: string; className?: string }) {
  return <Badge className={cn(TONE_CLASS[statusTone(status)], className)}>{status}</Badge>;
}
