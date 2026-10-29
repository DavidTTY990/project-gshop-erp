import { useState } from 'react';
import { ArrowRightLeftIcon, ReceiptTextIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import InvoiceBlock from '@/components/InvoiceBlock';
import { IssueInvoiceDialog } from '@/components/InvoiceDialogs';
import {
  isPendingInvoice,
  isUninvoiced,
  previewOrderInvoiceAmount,
  useIssueOrderInvoice,
  useMoveInvoiceItems,
  type Invoice,
} from '@/lib/invoices';
import { ORDER_COMPLETED, type Order, type OrderItem } from '@/lib/orders';
import { formatMoney } from '@/lib/repairs';

type Props = { order: Order; items: OrderItem[]; invoices: Invoice[] };

/**
 * 訂單的發票：每張發票與其品項，以及「未開發票」的品項。
 * 訂單「已完成」時可開立、在待補號碼的發票之間移動品項、單獨作廢；取消或退貨後只能編輯備註。
 */
export default function OrderInvoicesCard({ order, items, invoices }: Props) {
  const [issuing, setIssuing] = useState(false);
  const issue = useIssueOrderInvoice(order.order_id);
  const move = useMoveInvoiceItems(order.order_id);
  const completed = order.status === ORDER_COMPLETED;
  const uninvoiced = items.filter((i) => isUninvoiced(i, invoices));
  const pendingInvoices = invoices.filter(isPendingInvoice);

  const moveItem = (item: OrderItem, toInvoiceId: string) =>
    move.mutate(
      { item_ids: [item.item_id], to_invoice_id: toInvoiceId },
      { onSuccess: () => toast.success(toInvoiceId ? `已移動「${item.product_name}」` : `「${item.product_name}」已移出發票`) },
    );

  /** 品項列；只有未開發票或待補號碼發票中的品項可以移動 */
  const itemRow = (item: OrderItem, movable: boolean) => {
    const targets = pendingInvoices.filter((inv) => inv.invoice_id !== item.invoice_id);
    const canMoveOut = !isUninvoiced(item, invoices);
    return (
      <li key={item.item_id} className="flex items-center gap-2 text-sm">
        <span className="min-w-0 flex-1 truncate">
          {item.product_name}
          {item.qty > 1 && <span className="text-muted-foreground"> × {item.qty}</span>}
        </span>
        <span className="text-muted-foreground">{formatMoney(item.line_total)}</span>
        {movable && completed && (targets.length > 0 || canMoveOut) && (
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="-my-1 size-8" disabled={move.isPending} aria-label={`移動「${item.product_name}」`}>
                <ArrowRightLeftIcon />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-48">
              <DropdownMenuLabel>移到</DropdownMenuLabel>
              {targets.map((inv) => (
                <DropdownMenuItem key={inv.invoice_id} className="h-9" onSelect={() => moveItem(item, inv.invoice_id)}>
                  待補號碼發票 {inv.invoice_id}（{formatMoney(inv.amount)}）
                </DropdownMenuItem>
              ))}
              {canMoveOut && (
                <DropdownMenuItem className="h-9" onSelect={() => moveItem(item, '')}>
                  未開發票
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </li>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>發票</CardTitle>
        {completed && uninvoiced.length > 0 && (
          <CardAction>
            <Button variant="outline" className="h-9" onClick={() => setIssuing(true)}>
              <ReceiptTextIcon />
              開立發票
            </Button>
          </CardAction>
        )}
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {invoices.length === 0 && uninvoiced.length === 0 && <p className="text-sm text-muted-foreground">沒有發票</p>}
        {invoices.map((inv) => {
          const invItems = items.filter((i) => i.invoice_id === inv.invoice_id);
          return (
            <InvoiceBlock key={inv.invoice_id} invoice={inv} canVoid={completed} releasesItems={completed}>
              {invItems.length > 0 && (
                <ul className="flex flex-col gap-1 border-t pt-2">{invItems.map((i) => itemRow(i, isPendingInvoice(inv)))}</ul>
              )}
            </InvoiceBlock>
          );
        })}
        {uninvoiced.length > 0 && (
          <section className="flex flex-col gap-2 rounded-lg border border-dashed p-3">
            <div className="flex items-center gap-2">
              <Badge className="bg-amber-100 text-amber-800">未開發票</Badge>
              <span className="text-sm text-muted-foreground">
                {uninvoiced.length} 項・{formatMoney(uninvoiced.reduce((s, i) => s + i.line_total, 0))}（折扣前）
              </span>
            </div>
            <ul className="flex flex-col gap-1">{uninvoiced.map((i) => itemRow(i, true))}</ul>
          </section>
        )}
        {completed && pendingInvoices.length > 0 && (
          <p className="text-xs text-muted-foreground">
            待補號碼的發票可用 <ArrowRightLeftIcon className="inline size-3" /> 移動品項來拆分；填入號碼後品項就會鎖定。
          </p>
        )}
      </CardContent>

      {issuing && (
        <IssueInvoiceDialog
          title={`開立發票：${order.order_id}`}
          items={uninvoiced}
          amount={(ids) => previewOrderInvoiceAmount(order, items, invoices, ids)}
          pending={issue.isPending}
          onSubmit={(input, itemIds) =>
            issue.mutate(
              { ...input, item_ids: itemIds },
              {
                onSuccess: () => {
                  toast.success('已開立發票');
                  setIssuing(false);
                },
              },
            )
          }
          onOpenChange={setIssuing}
        />
      )}
    </Card>
  );
}
