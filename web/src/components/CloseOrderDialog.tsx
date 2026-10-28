import { useState } from 'react';
import { Loader2Icon } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import FormField from '@/components/FormField';
import { useCloseOrder, type Order } from '@/lib/orders';
import { useFieldErrors } from '@/lib/useFieldErrors';

type Props = { order: Order; kind: 'cancel' | 'return'; onOpenChange: (open: boolean) => void };

const TEXT = {
  cancel: { title: '取消訂單', desc: '用於更正建錯的訂單。取消後無法還原，品項與金額不會再列入銷售。', reason: '取消原因', placeholder: '例：品項打錯，已重新建立 O-…' },
  return: { title: '退貨', desc: '客人整筆退回。退貨後無法還原。', reason: '退貨原因', placeholder: '例：鑑賞期內退貨，商品未拆封' },
};

/** 取消或退貨確認視窗；原因必填。父元件以 {open && …} 渲染 */
export default function CloseOrderDialog({ order, kind, onOpenChange }: Props) {
  const [reason, setReason] = useState('');
  const close = useCloseOrder(order.order_id, kind);
  const field = useFieldErrors({ reason: reason.trim() ? undefined : `請填寫${TEXT[kind].reason}` });
  const t = TEXT[kind];

  const submit = () => {
    if (!field.submit()) return;
    close.mutate(reason, {
      onSuccess: () => {
        toast.success(kind === 'cancel' ? '訂單已取消' : '已完成退貨');
        onOpenChange(false);
      },
    });
  };

  return (
    <Dialog open onOpenChange={(o) => !close.isPending && onOpenChange(o)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {t.title}：{order.order_id}
          </DialogTitle>
          <DialogDescription>{t.desc}</DialogDescription>
        </DialogHeader>
        <FormField id="close-reason" label={t.reason} required error={field.error('reason')}>
          <Textarea
            id="close-reason"
            rows={3}
            placeholder={t.placeholder}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            onBlur={field.touch('reason')}
            aria-invalid={!!field.error('reason')}
          />
        </FormField>
        <DialogFooter>
          <Button variant="outline" className="h-10" disabled={close.isPending} onClick={() => onOpenChange(false)}>
            返回
          </Button>
          <Button variant="destructive" className="h-10" disabled={close.isPending} onClick={submit}>
            {close.isPending && <Loader2Icon className="animate-spin" />}
            確認{t.title}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
