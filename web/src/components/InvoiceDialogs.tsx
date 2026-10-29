import { useState } from 'react';
import { Loader2Icon } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import FormField from '@/components/FormField';
import InvoiceFields from '@/components/InvoiceFields';
import {
  INVOICE_ISSUED,
  useDeleteInvoice,
  useUpdateInvoice,
  useVoidInvoice,
  validateInvoiceInput,
  type Invoice,
  type InvoiceField,
  type InvoiceInput,
} from '@/lib/invoices';
import type { OrderItem } from '@/lib/orders';
import { dateOnly, formatMoney, todayString } from '@/lib/repairs';
import { useFieldErrors } from '@/lib/useFieldErrors';

/* 各視窗由父元件以 {open && …} 渲染，關閉後狀態自然清空 */

type IssueProps = {
  title: string;
  /** 銷售：可勾選的品項（未開發票），預設全選；維修：不傳 */
  items?: OrderItem[];
  /** 依勾選的品項預估金額 */
  amount: (itemIds: string[]) => number;
  pending: boolean;
  onSubmit: (input: InvoiceInput, itemIds: string[]) => void;
  onOpenChange: (open: boolean) => void;
};

/** 開立發票：號碼與統編選填，日期預設今天 */
export function IssueInvoiceDialog({ title, items, amount, pending, onSubmit, onOpenChange }: IssueProps) {
  const [values, setValues] = useState<InvoiceInput>({ invoice_no: '', buyer_tax_id: '', invoice_date: todayString() });
  const [selected, setSelected] = useState<string[]>(() => items?.map((i) => i.item_id) ?? []);
  const errors: Partial<Record<InvoiceField | 'items', string>> = validateInvoiceInput(values, todayString());
  if (items && selected.length === 0) errors.items = '請至少選擇一個品項';
  const field = useFieldErrors(errors);

  const toggle = (id: string, checked: boolean) =>
    setSelected((s) => (checked ? [...s, id] : s.filter((x) => x !== id)));

  const submit = () => {
    if (field.submit()) onSubmit(values, selected);
  };

  return (
    <Dialog open onOpenChange={(o) => !pending && onOpenChange(o)}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>發票號碼可先留空，之後再補填。</DialogDescription>
        </DialogHeader>
        {items && (
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-sm font-medium">品項</legend>
            {items.map((i) => (
              <div key={i.item_id} className="flex items-center gap-3">
                <Checkbox
                  id={`issue-${i.item_id}`}
                  className="size-5"
                  checked={selected.includes(i.item_id)}
                  onCheckedChange={(v) => toggle(i.item_id, v === true)}
                />
                <Label htmlFor={`issue-${i.item_id}`} className="flex flex-1 justify-between gap-2 py-1 font-normal">
                  <span>
                    {i.product_name}
                    {i.qty > 1 && <span className="text-muted-foreground"> × {i.qty}</span>}
                  </span>
                  <span>{formatMoney(i.line_total)}</span>
                </Label>
              </div>
            ))}
            {field.error('items') && <p className="text-sm text-destructive">{field.error('items')}</p>}
          </fieldset>
        )}
        <InvoiceFields idPrefix="issue" values={values} onChange={setValues} error={field.error} touch={field.touch} />
        <p className="rounded-lg bg-muted/60 p-3 text-sm">
          發票金額 <span className="font-semibold">{formatMoney(amount(selected))}</span>
          {items && <span className="text-muted-foreground">（已依比例扣除折扣）</span>}
        </p>
        <DialogFooter>
          <Button variant="outline" className="h-10" disabled={pending} onClick={() => onOpenChange(false)}>
            返回
          </Button>
          <Button className="h-10" disabled={pending} onClick={submit}>
            {pending && <Loader2Icon className="animate-spin" />}
            開立發票
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type InvoiceDialogProps = { invoice: Invoice; onOpenChange: (open: boolean) => void };

/** 修改發票：已開立可改號碼、統編、日期、備註；作廢或折讓只能改備註 */
export function EditInvoiceDialog({ invoice, onOpenChange }: InvoiceDialogProps) {
  const issued = invoice.invoice_status === INVOICE_ISSUED;
  const [values, setValues] = useState<InvoiceInput>({
    invoice_no: invoice.invoice_no,
    buyer_tax_id: invoice.buyer_tax_id,
    invoice_date: dateOnly(invoice.invoice_date),
  });
  const [note, setNote] = useState(invoice.note);
  const update = useUpdateInvoice(invoice.invoice_id);
  const field = useFieldErrors(issued ? validateInvoiceInput(values, todayString()) : {});

  const submit = () => {
    if (!field.submit()) return;
    update.mutate(
      { ...values, note },
      {
        onSuccess: () => {
          toast.success('已儲存發票');
          onOpenChange(false);
        },
      },
    );
  };

  return (
    <Dialog open onOpenChange={(o) => !update.isPending && onOpenChange(o)}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>編輯發票</DialogTitle>
          <DialogDescription>
            {issued ? '用來補填號碼或更正登打錯誤。實際發票開錯時，請作廢後重開。' : `發票已${invoice.invoice_status}，只能修改備註。`}
          </DialogDescription>
        </DialogHeader>
        {issued && <InvoiceFields idPrefix="edit" values={values} onChange={setValues} error={field.error} touch={field.touch} />}
        <FormField id="invoice-note" label="備註">
          <Textarea id="invoice-note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
        </FormField>
        <DialogFooter>
          <Button variant="outline" className="h-10" disabled={update.isPending} onClick={() => onOpenChange(false)}>
            返回
          </Button>
          <Button className="h-10" disabled={update.isPending} onClick={submit}>
            {update.isPending && <Loader2Icon className="animate-spin" />}
            儲存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** 作廢已填號碼的發票：原因必填、不可還原 */
export function VoidInvoiceDialog({ invoice, releasesItems, onOpenChange }: InvoiceDialogProps & { releasesItems: boolean }) {
  const [reason, setReason] = useState('');
  const voidInvoice = useVoidInvoice(invoice.invoice_id);
  const field = useFieldErrors({ reason: reason.trim() ? undefined : '請填寫作廢原因' });

  const submit = () => {
    if (!field.submit()) return;
    voidInvoice.mutate(reason, {
      onSuccess: () => {
        toast.success(`發票 ${invoice.invoice_no} 已作廢`);
        onOpenChange(false);
      },
    });
  };

  return (
    <Dialog open onOpenChange={(o) => !voidInvoice.isPending && onOpenChange(o)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>作廢發票 {invoice.invoice_no}</DialogTitle>
          <DialogDescription>
            作廢後無法還原。{releasesItems && '這張發票的品項會回到「未開發票」，可以重新開立。'}
          </DialogDescription>
        </DialogHeader>
        <FormField id="void-reason" label="作廢原因" required error={field.error('reason')}>
          <Textarea
            id="void-reason"
            rows={3}
            placeholder="例：統編打錯，重新開立"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            onBlur={field.touch('reason')}
            aria-invalid={!!field.error('reason')}
          />
        </FormField>
        <DialogFooter>
          <Button variant="outline" className="h-10" disabled={voidInvoice.isPending} onClick={() => onOpenChange(false)}>
            返回
          </Button>
          <Button variant="destructive" className="h-10" disabled={voidInvoice.isPending} onClick={submit}>
            {voidInvoice.isPending && <Loader2Icon className="animate-spin" />}
            確認作廢
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** 刪除待補號碼的發票（還沒印出） */
export function DeleteInvoiceDialog({ invoice, releasesItems, onOpenChange }: InvoiceDialogProps & { releasesItems: boolean }) {
  const remove = useDeleteInvoice(invoice.invoice_id);

  const submit = () =>
    remove.mutate(undefined, {
      onSuccess: () => {
        toast.success('已刪除發票');
        onOpenChange(false);
      },
    });

  return (
    <Dialog open onOpenChange={(o) => !remove.isPending && onOpenChange(o)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>刪除待補號碼的發票？</DialogTitle>
          <DialogDescription>
            {formatMoney(invoice.amount)}。這張發票還沒填號碼，刪除後不會留下紀錄。
            {releasesItems && '品項會回到「未開發票」。'}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" className="h-10" disabled={remove.isPending} onClick={() => onOpenChange(false)}>
            返回
          </Button>
          <Button variant="destructive" className="h-10" disabled={remove.isPending} onClick={submit}>
            {remove.isPending && <Loader2Icon className="animate-spin" />}
            刪除
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
