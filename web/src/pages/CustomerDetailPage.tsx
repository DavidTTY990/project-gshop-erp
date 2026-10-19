import { useState } from 'react';
import { useParams } from 'react-router';
import { Loader2Icon, PencilIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import BackButton from '@/components/BackButton';
import CustomerForm from '@/components/CustomerForm';
import { formatPhone, useCustomer, useUpdateCustomer, type Customer } from '@/lib/customers';

export default function CustomerDetailPage() {
  const { id = '' } = useParams();
  const { data: customer, isPending, isError } = useCustomer(id);

  let content;
  if (isPending) {
    content = (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2Icon className="size-4 animate-spin" />
        載入中…
      </p>
    );
  } else if (isError) {
    content = <p className="text-muted-foreground">找不到客人</p>;
  } else {
    // 以 id 為 key：切換到另一位客人時重設編輯狀態
    content = <CustomerCard key={customer.customer_id} customer={customer} />;
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-2">
      <BackButton fallback="/" fallbackLabel="回客人列表" />
      {content}
    </div>
  );
}

function CustomerCard({ customer }: { customer: Customer }) {
  const [editing, setEditing] = useState(false);
  const update = useUpdateCustomer(customer.customer_id);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">{customer.name}</CardTitle>
        {!editing && (
          <CardAction>
            <Button variant="outline" className="h-9" onClick={() => setEditing(true)}>
              <PencilIcon />
              編輯
            </Button>
          </CardAction>
        )}
      </CardHeader>
      <CardContent>
        {editing ? (
          <CustomerForm
            defaultValues={{
              name: customer.name,
              phone: customer.phone,
              line_id: customer.line_id,
              note: customer.note,
            }}
            submitLabel="儲存"
            pending={update.isPending}
            error={update.error}
            onSubmit={(input) =>
              update.mutate(input, {
                onSuccess: () => {
                  toast.success('已儲存');
                  setEditing(false);
                },
              })
            }
            onCancel={() => {
              update.reset();
              setEditing(false);
            }}
          />
        ) : (
          <dl className="grid grid-cols-[6rem_1fr] gap-x-4 gap-y-3 text-sm">
            <Item label="電話" value={formatPhone(customer.phone)} />
            <Item label="LINE ID" value={customer.line_id} />
            <Item label="備註" value={customer.note} />
            <Item label="客人編號" value={customer.customer_id} />
            <Item label="建立時間" value={customer.created_at} />
            <Item label="更新時間" value={customer.updated_at} />
          </dl>
        )}
      </CardContent>
    </Card>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="break-words whitespace-pre-wrap">{value || '—'}</dd>
    </>
  );
}
