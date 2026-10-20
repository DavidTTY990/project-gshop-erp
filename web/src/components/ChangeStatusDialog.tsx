import { useState } from 'react';
import { Loader2Icon } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import FormField from '@/components/FormField';
import SettingSelect from '@/components/SettingSelect';
import { balanceDue, formatMoney, PICKED_UP_STATUS, useChangeRepairStatus, type Repair } from '@/lib/repairs';
import { useSession } from '@/lib/session';

type Props = { repair: Repair; open: boolean; onOpenChange: (open: boolean) => void };

/** 變更狀態並寫入歷程；改為「已取件」且未付清時，提供「已收款並取件」與「仍要取件」 */
export default function ChangeStatusDialog({ repair, open, onOpenChange }: Props) {
  const { staff } = useSession();
  const [status, setStatus] = useState('');
  const [note, setNote] = useState('');
  const change = useChangeRepairStatus(repair.repair_id);

  const unpaidPickup = status === PICKED_UP_STATUS && !repair.is_paid;
  const balance = balanceDue(repair);

  // 父元件只在開啟時渲染，關閉後狀態自然清空
  const close = (next: boolean) => {
    if (!change.isPending) onOpenChange(next);
  };

  const submit = (markPaid: boolean) =>
    change.mutate(
      { status, note, staff: staff ?? '', mark_paid: markPaid },
      {
        onSuccess: () => {
          toast.success(`狀態已改為「${status}」`);
          close(false);
        },
      },
    );

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>變更狀態</DialogTitle>
          <DialogDescription>目前狀態：{repair.status}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <FormField id="new-status" label="新狀態" required>
            <SettingSelect id="new-status" setting="repair_status" value={status} onChange={setStatus} placeholder="請選擇狀態" />
          </FormField>
          <FormField id="status-note" label="備註">
            <Textarea
              id="status-note"
              rows={3}
              placeholder="例：已報價 $1,500，客人同意維修"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </FormField>
          {unpaidPickup && (
            <p className="rounded-md bg-amber-50 p-3 text-sm text-amber-900">
              尚未付清{balance !== null && `，尾款 ${formatMoney(balance)}`}。
            </p>
          )}
        </div>
        <DialogFooter>
          {unpaidPickup ? (
            <>
              <Button variant="outline" className="h-10" disabled={change.isPending} onClick={() => submit(false)}>
                仍要取件
              </Button>
              <Button className="h-10" disabled={change.isPending} onClick={() => submit(true)}>
                {change.isPending && <Loader2Icon className="animate-spin" />}
                已收款並取件
              </Button>
            </>
          ) : (
            <Button className="h-10" disabled={!status || status === repair.status || change.isPending} onClick={() => submit(false)}>
              {change.isPending && <Loader2Icon className="animate-spin" />}
              確認變更
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
