import { useState } from 'react';
import { CheckIcon, Loader2Icon } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import FormField from '@/components/FormField';
import { INVOICE_ALLOWANCE, INVOICE_ISSUED, INVOICE_VOID, isPendingInvoice, type Invoice } from '@/lib/invoices';
import { useCloseOrder, type Order } from '@/lib/orders';
import { formatMoney } from '@/lib/repairs';
import { useFieldErrors } from '@/lib/useFieldErrors';

type Props = { order: Order; invoices: Invoice[]; kind: 'cancel' | 'return'; onOpenChange: (open: boolean) => void };

const TEXT = {
  cancel: { title: '取消訂單', desc: '用於更正建錯的訂單。取消後無法還原，品項與金額不會再列入銷售。', reason: '取消原因', placeholder: '例：品項打錯，已重新建立 O-…' },
  return: { title: '退貨', desc: '客人整筆退回。退貨後無法還原。', reason: '退貨原因', placeholder: '例：鑑賞期內退貨，商品未拆封' },
};

/**
 * 取消或退貨確認視窗；原因必填。父元件以 {open && …} 渲染。
 * 發票：待補號碼的刪除；已填號碼的取消時自動作廢，退貨時逐張選擇作廢或折讓（預設作廢）。
 */
export default function CloseOrderDialog({ order, invoices, kind, onOpenChange }: Props) {
  const [reason, setReason] = useState('');
  const numbered = invoices.filter((inv) => inv.invoice_status === INVOICE_ISSUED && !isPendingInvoice(inv));
  const pendingCount = invoices.filter(isPendingInvoice).length;
  const [actions, setActions] = useState<Record<string, string>>(() =>
    Object.fromEntries(numbered.map((inv) => [inv.invoice_id, INVOICE_VOID])),
  );
  const close = useCloseOrder(order.order_id, kind);
  const field = useFieldErrors({ reason: reason.trim() ? undefined : `請填寫${TEXT[kind].reason}` });
  const t = TEXT[kind];

  const submit = () => {
    if (!field.submit()) return;
    close.mutate({ reason, invoice_actions: kind === 'return' ? actions : undefined }, {
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
        {(numbered.length > 0 || pendingCount > 0) && (
          <div className="flex flex-col gap-2 text-sm">
            <p className="font-medium">發票</p>
            {kind === 'return' &&
              numbered.map((inv) => (
                <div key={inv.invoice_id} className="flex flex-wrap items-center gap-2">
                  <span className="flex-1">
                    {inv.invoice_no}（{formatMoney(inv.amount)}）
                  </span>
                  {[INVOICE_VOID, INVOICE_ALLOWANCE].map((action) => {
                    const selected = actions[inv.invoice_id] === action;
                    return (
                      <Button
                        key={action}
                        type="button"
                        variant={selected ? 'default' : 'outline'}
                        className="h-9"
                        aria-pressed={selected}
                        onClick={() => setActions((a) => ({ ...a, [inv.invoice_id]: action }))}
                      >
                        {selected && <CheckIcon />}
                        {action}
                      </Button>
                    );
                  })}
                </div>
              ))}
            <ul className="list-disc pl-5 text-muted-foreground">
              {kind === 'return' && numbered.length > 0 && <li>當月的發票通常可直接作廢，跨月則開立折讓單</li>}
              {kind === 'cancel' && numbered.length > 0 && (
                <li>已填號碼的 {numbered.length} 張發票（{numbered.map((inv) => inv.invoice_no).join('、')}）會自動作廢</li>
              )}
              {pendingCount > 0 && <li>待補號碼的 {pendingCount} 張發票會刪除</li>}
            </ul>
          </div>
        )}
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
