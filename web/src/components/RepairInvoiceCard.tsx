import { useState } from 'react';
import { ReceiptTextIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import InvoiceBlock from '@/components/InvoiceBlock';
import { IssueInvoiceDialog } from '@/components/InvoiceDialogs';
import { isValidInvoice, useIssueRepairInvoice, type Invoice } from '@/lib/invoices';
import { CANCELLED_STATUS, type Repair } from '@/lib/repairs';

/**
 * 維修單的發票：一張維修單只有一張有效發票，金額等於總金額。
 * 待補號碼時金額跟著總金額更新；已填號碼後要先作廢才能改總金額。
 */
export default function RepairInvoiceCard({ repair, invoices }: { repair: Repair; invoices: Invoice[] }) {
  const [issuing, setIssuing] = useState(false);
  const issue = useIssueRepairInvoice(repair.repair_id);
  const hasValid = invoices.some(isValidInvoice);
  const cancelled = repair.status === CANCELLED_STATUS;
  const canIssue = !hasValid && !cancelled && repair.final_amount !== null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>發票</CardTitle>
        {canIssue && (
          <CardAction>
            <Button variant="outline" className="h-9" onClick={() => setIssuing(true)}>
              <ReceiptTextIcon />
              開立發票
            </Button>
          </CardAction>
        )}
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {!hasValid && !cancelled && repair.final_amount === null && (
          <p className="text-sm text-muted-foreground">填寫總金額後可開立發票</p>
        )}
        {!hasValid && canIssue && invoices.length === 0 && <p className="text-sm text-muted-foreground">尚未開立發票</p>}
        {invoices.map((inv) => (
          <InvoiceBlock key={inv.invoice_id} invoice={inv} canVoid releasesItems={false} />
        ))}
      </CardContent>

      {issuing && repair.final_amount !== null && (
        <IssueInvoiceDialog
          title={`開立發票：${repair.repair_id}`}
          amount={() => repair.final_amount ?? 0}
          pending={issue.isPending}
          onSubmit={(input) =>
            issue.mutate(input, {
              onSuccess: () => {
                toast.success('已開立發票');
                setIssuing(false);
              },
            })
          }
          onOpenChange={setIssuing}
        />
      )}
    </Card>
  );
}
