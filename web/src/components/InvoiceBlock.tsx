import { useState } from 'react';
import { BanIcon, EllipsisIcon, PencilIcon, Trash2Icon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { DeleteInvoiceDialog, EditInvoiceDialog, VoidInvoiceDialog } from '@/components/InvoiceDialogs';
import { cn } from '@/lib/utils';
import { INVOICE_ALLOWANCE, INVOICE_ISSUED, INVOICE_VOID, isPendingInvoice, type Invoice } from '@/lib/invoices';
import { dateOnly, formatMoney } from '@/lib/repairs';

/** 發票狀態標籤：待補號碼橘、已開立綠、折讓藍、作廢灰 */
export function InvoiceStatusBadge({ invoice }: { invoice: Invoice }) {
  if (isPendingInvoice(invoice)) return <Badge className="bg-amber-100 text-amber-800">待補號碼</Badge>;
  const tone =
    invoice.invoice_status === INVOICE_ISSUED
      ? 'bg-green-100 text-green-800'
      : invoice.invoice_status === INVOICE_ALLOWANCE
        ? 'bg-blue-100 text-blue-800'
        : 'bg-muted text-muted-foreground';
  return <Badge className={tone}>{invoice.invoice_status}</Badge>;
}

type Props = {
  invoice: Invoice;
  /** 可單獨作廢（訂單需為「已完成」） */
  canVoid: boolean;
  /** 銷售發票：作廢或刪除後品項回到「未開發票」 */
  releasesItems: boolean;
  children?: React.ReactNode;
};

/** 一張發票：號碼、狀態、金額、日期、統編、備註與操作選單；children 為品項 */
export default function InvoiceBlock({ invoice, canVoid, releasesItems, children }: Props) {
  const [dialog, setDialog] = useState<'edit' | 'void' | 'delete' | null>(null);
  const pending = isPendingInvoice(invoice);
  const voided = invoice.invoice_status === INVOICE_VOID;
  const close = (open: boolean) => !open && setDialog(null);

  return (
    <section className={cn('flex flex-col gap-2 rounded-lg border p-3', voided && 'bg-muted/40')}>
      <div className="flex items-start gap-2">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn('font-medium', voided && 'text-muted-foreground line-through')}>
              {invoice.invoice_no || '（未填號碼）'}
            </span>
            <InvoiceStatusBadge invoice={invoice} />
          </div>
          <span className="text-xs text-muted-foreground">
            {[dateOnly(invoice.invoice_date), invoice.buyer_tax_id && `統編 ${invoice.buyer_tax_id}`, invoice.invoice_id]
              .filter(Boolean)
              .join('・')}
          </span>
        </div>
        <span className={cn('font-semibold', voided && 'text-muted-foreground line-through')}>{formatMoney(invoice.amount)}</span>
        {/* modal={false}：從選單開啟視窗時，避免 body 的 pointer-events 被鎖住 */}
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="-my-1 size-9" aria-label="發票操作">
              <EllipsisIcon />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-36">
            <DropdownMenuItem className="h-9" onSelect={() => setDialog('edit')}>
              <PencilIcon />
              {invoice.invoice_status === INVOICE_ISSUED ? (pending ? '補填號碼／編輯' : '編輯') : '編輯備註'}
            </DropdownMenuItem>
            {pending && (
              <DropdownMenuItem className="h-9" variant="destructive" onSelect={() => setDialog('delete')}>
                <Trash2Icon />
                刪除
              </DropdownMenuItem>
            )}
            {!pending && invoice.invoice_status === INVOICE_ISSUED && canVoid && (
              <DropdownMenuItem className="h-9" variant="destructive" onSelect={() => setDialog('void')}>
                <BanIcon />
                作廢
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {children}
      {invoice.note && <p className="text-xs whitespace-pre-wrap text-muted-foreground">{invoice.note}</p>}

      {dialog === 'edit' && <EditInvoiceDialog invoice={invoice} onOpenChange={close} />}
      {dialog === 'void' && <VoidInvoiceDialog invoice={invoice} releasesItems={releasesItems} onOpenChange={close} />}
      {dialog === 'delete' && <DeleteInvoiceDialog invoice={invoice} releasesItems={releasesItems} onOpenChange={close} />}
    </section>
  );
}
