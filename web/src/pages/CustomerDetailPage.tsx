import { useState } from 'react';
import { Link, useLocation, useParams } from 'react-router';
import { Loader2Icon, PencilIcon, WrenchIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import BackButton from '@/components/BackButton';
import CustomerForm from '@/components/CustomerForm';
import RepairStatusBadge from '@/components/RepairStatusBadge';
import { useCustomerHistory } from '@/lib/customerHistory';
import { formatPhone, useCustomer, useUpdateCustomer, type Customer } from '@/lib/customers';
import { deviceLabel } from '@/lib/devices';
import { backStateFrom } from '@/lib/navigation';
import { dateOnly, isOverdue } from '@/lib/repairs';

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
    content = (
      <>
        <CustomerCard key={customer.customer_id} customer={customer} />
        <CustomerHistory customerId={customer.customer_id} />
      </>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
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
          <CardAction className="flex gap-2">
            <Button asChild variant="outline" className="h-9">
              <Link to={`/repairs/new?customer=${customer.customer_id}`}>
                <WrenchIcon />
                新增維修
              </Link>
            </Button>
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

/** 歷史維修（新到舊）與送修過的機器；點入維修單後可返回這裡 */
function CustomerHistory({ customerId }: { customerId: string }) {
  const location = useLocation();
  const backState = backStateFrom(location, '回客人資料');
  const { repairs, pastDevices, isPending } = useCustomerHistory(customerId);

  if (isPending) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2Icon className="size-4 animate-spin" />
        載入維修紀錄…
      </p>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>歷史維修</CardTitle>
        </CardHeader>
        <CardContent>
          {repairs.length === 0 ? (
            <p className="text-sm text-muted-foreground">尚無維修紀錄</p>
          ) : (
            <ul className="-mx-2 flex flex-col">
              {repairs.map((r) => {
                const device = pastDevices.find((p) => p.device.device_id === r.device_id)?.device;
                return (
                  <li key={r.repair_id}>
                    <Link
                      to={`/repairs/${r.repair_id}`}
                      state={backState}
                      className="flex flex-col gap-1 rounded-md p-2 hover:bg-accent active:bg-accent"
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span className="font-medium">{device ? deviceLabel(device) : r.device_id}</span>
                        <RepairStatusBadge status={r.status} />
                      </span>
                      <span className="truncate text-sm">{r.issue}</span>
                      <span className="text-sm text-muted-foreground">
                        {r.repair_id}・收件 {dateOnly(r.received_at)}
                        {r.estimated_done_date && (
                          <>
                            ・預計{' '}
                            <span className={isOverdue(r) ? 'font-medium text-destructive' : undefined}>
                              {dateOnly(r.estimated_done_date)}
                            </span>
                          </>
                        )}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>送修過的機器</CardTitle>
        </CardHeader>
        <CardContent>
          {pastDevices.length === 0 ? (
            <p className="text-sm text-muted-foreground">尚無機器</p>
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2">
              {pastDevices.map(({ device, lastRepair, repairCount }) => (
                <li key={device.device_id} className="flex flex-col gap-0.5 rounded-lg border p-3 text-sm">
                  <span className="font-medium">{deviceLabel(device)}</span>
                  {device.serial_no && <span className="text-muted-foreground">序號 {device.serial_no}</span>}
                  <span className="text-muted-foreground">
                    送修 {repairCount} 次・上次{' '}
                    <Link to={`/repairs/${lastRepair.repair_id}`} state={backState} className="underline underline-offset-2">
                      {dateOnly(lastRepair.received_at)}
                    </Link>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </>
  );
}
