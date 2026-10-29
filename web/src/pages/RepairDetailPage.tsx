import { useState } from 'react';
import { Link, useLocation, useParams } from 'react-router';
import { ArrowRightLeftIcon, Loader2Icon, PencilIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import BackButton from '@/components/BackButton';
import ChangeStatusDialog from '@/components/ChangeStatusDialog';
import EditDeviceDialog from '@/components/EditDeviceDialog';
import RepairFieldsForm from '@/components/RepairFieldsForm';
import RepairInvoiceCard from '@/components/RepairInvoiceCard';
import RepairStatusBadge from '@/components/RepairStatusBadge';
import { formatPhone, useCustomer } from '@/lib/customers';
import { deviceLabel, type Device } from '@/lib/devices';
import { isPendingInvoice, type Invoice } from '@/lib/invoices';
import { backStateFrom, type BackState } from '@/lib/navigation';
import {
  balanceDue,
  dateOnly,
  formatMoney,
  isOverdue,
  useAllRepairs,
  useRepair,
  useUpdateRepair,
  type Repair,
  type RepairLog,
} from '@/lib/repairs';

export default function RepairDetailPage() {
  const { id = '' } = useParams();
  const { data, isPending, isError } = useRepair(id);

  let content;
  if (isPending) {
    content = (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2Icon className="size-4 animate-spin" />
        載入中…
      </p>
    );
  } else if (isError) {
    content = <p className="text-muted-foreground">找不到維修單</p>;
  } else {
    // 以 id 為 key：切換到另一張維修單時重設編輯狀態
    content = (
      <RepairView key={data.repair.repair_id} repair={data.repair} device={data.device} logs={data.logs} invoices={data.invoices ?? []} />
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-2">
      <BackButton fallback="/" fallbackLabel="回首頁" />
      {content}
    </div>
  );
}

function RepairView({ repair, device, logs, invoices }: { repair: Repair; device: Device | null; logs: RepairLog[]; invoices: Invoice[] }) {
  const [changingStatus, setChangingStatus] = useState(false);
  const location = useLocation();
  // 從這張單點到客人或其他維修單時，返回按鈕回到這裡（並保留這張單原本的返回目標）
  const backState = backStateFrom(location, '回維修單');

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-xl font-semibold">{repair.repair_id}</h1>
        <RepairStatusBadge status={repair.status} />
        {isOverdue(repair) && <Badge variant="destructive">逾期</Badge>}
        {invoices.some(isPendingInvoice) && <Badge className="bg-amber-100 text-amber-800">發票待補號碼</Badge>}
        <Button className="ml-auto h-9" onClick={() => setChangingStatus(true)}>
          <ArrowRightLeftIcon />
          變更狀態
        </Button>
      </div>
      {changingStatus && <ChangeStatusDialog repair={repair} open onOpenChange={setChangingStatus} />}

      <div className="grid gap-4 md:grid-cols-2">
        <CustomerCard customerId={repair.customer_id} backState={backState} />
        <DeviceCard device={device} currentRepairId={repair.repair_id} backState={backState} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
        <div className="flex flex-col gap-4">
          <RepairInfoCard repair={repair} />
          <RepairInvoiceCard repair={repair} invoices={invoices} />
        </div>
        <LogsCard logs={logs} />
      </div>
    </div>
  );
}

function CustomerCard({ customerId, backState }: { customerId: string; backState: BackState }) {
  const { data: customer, isPending } = useCustomer(customerId);

  return (
    <Card>
      <CardHeader>
        <CardTitle>客人</CardTitle>
      </CardHeader>
      <CardContent>
        {isPending ? (
          <p className="text-sm text-muted-foreground">載入中…</p>
        ) : customer ? (
          <dl className="grid grid-cols-[5rem_1fr] gap-x-4 gap-y-2 text-sm">
            <dt className="text-muted-foreground">姓名</dt>
            <dd>
              <Link to={`/customers/${customer.customer_id}`} state={backState} className="font-medium underline underline-offset-2">
                {customer.name}
              </Link>
            </dd>
            <Item label="電話" value={formatPhone(customer.phone)} />
            <Item label="LINE ID" value={customer.line_id} />
          </dl>
        ) : (
          <p className="text-sm text-muted-foreground">找不到客人（{customerId}）</p>
        )}
      </CardContent>
    </Card>
  );
}

/** 機器資料（可編輯）與這台機器的其他維修單（不顯示其他客人姓名） */
function DeviceCard({ device, currentRepairId, backState }: { device: Device | null; currentRepairId: string; backState: BackState }) {
  const [editing, setEditing] = useState(false);
  const { data: repairs } = useAllRepairs();
  const history = device
    ? (repairs ?? [])
        .filter((r) => r.device_id === device.device_id && r.repair_id !== currentRepairId)
        .sort((a, b) => b.received_at.localeCompare(a.received_at))
    : [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>機器</CardTitle>
        {device && (
          <CardAction>
            <Button variant="outline" className="h-9" onClick={() => setEditing(true)}>
              <PencilIcon />
              編輯
            </Button>
          </CardAction>
        )}
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {device ? (
          <dl className="grid grid-cols-[5rem_1fr] gap-x-4 gap-y-2 text-sm">
            <Item label="機器" value={deviceLabel(device)} />
            <Item label="類型" value={device.device_type} />
            <Item label="序號" value={device.serial_no} />
            <Item label="備註" value={device.note} />
          </dl>
        ) : (
          <p className="text-sm text-muted-foreground">找不到機器資料</p>
        )}
        {history.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium">這台機器的其他維修紀錄</p>
            <ul className="flex flex-col gap-1 text-sm">
              {history.map((r) => (
                <li key={r.repair_id}>
                  <Link to={`/repairs/${r.repair_id}`} state={backState} className="flex flex-wrap gap-x-2 rounded-md p-1 hover:bg-accent">
                    <span className="font-medium">{r.repair_id}</span>
                    <span className="text-muted-foreground">{dateOnly(r.received_at)}</span>
                    <span className="text-muted-foreground">{r.status}</span>
                    <span className="w-full truncate text-muted-foreground">{r.issue}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
      {editing && device && <EditDeviceDialog device={device} open onOpenChange={setEditing} />}
    </Card>
  );
}

function RepairInfoCard({ repair }: { repair: Repair }) {
  const [editing, setEditing] = useState(false);
  const update = useUpdateRepair(repair.repair_id);

  return (
    <Card>
      <CardHeader>
        <CardTitle>維修資訊</CardTitle>
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
          <RepairFieldsForm
            repair={repair}
            pending={update.isPending}
            onSubmit={(input) =>
              update.mutate(input, {
                onSuccess: () => {
                  toast.success('已儲存');
                  setEditing(false);
                },
              })
            }
            onCancel={() => setEditing(false)}
          />
        ) : (
          <div className="flex flex-col gap-4">
            <dl className="grid grid-cols-[6rem_1fr] gap-x-4 gap-y-3 text-sm">
              <Item label="問題描述" value={repair.issue} />
              <Item label="檢測結果" value={repair.diagnosis} />
              <Item label="配件" value={repair.accessories} />
              <Item label="外觀狀況" value={repair.intake_condition} />
              <Item label="經手人員" value={repair.handler || '未指派'} />
              <Item label="收件時間" value={repair.received_at} />
              <dt className="text-muted-foreground">預計完成日</dt>
              <dd className={isOverdue(repair) ? 'font-medium text-destructive' : undefined}>
                {dateOnly(repair.estimated_done_date) || '—'}
              </dd>
              <Item label="完成時間" value={repair.completed_at} />
              <Item label="取件時間" value={repair.picked_up_at} />
              <Item label="備註" value={repair.note} />
            </dl>
            <MoneySummary repair={repair} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function MoneySummary({ repair }: { repair: Repair }) {
  const balance = balanceDue(repair);
  return (
    <div className="grid grid-cols-2 gap-3 rounded-lg bg-muted/60 p-3 text-sm sm:grid-cols-5">
      <Money label="報價" value={formatMoney(repair.quote_amount)} />
      <Money label="訂金" value={formatMoney(repair.deposit)} />
      <Money label="總金額" value={formatMoney(repair.final_amount)} />
      <Money label="尾款" value={repair.is_paid ? '$0' : formatMoney(balance)} />
      <div className="flex flex-col">
        <span className="text-muted-foreground">付款</span>
        <span className={repair.is_paid ? 'font-medium text-green-700' : 'font-medium text-amber-700'}>
          {repair.is_paid ? '已付清' : '未付清'}
        </span>
      </div>
    </div>
  );
}

function Money({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function LogsCard({ logs }: { logs: RepairLog[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>歷程</CardTitle>
      </CardHeader>
      <CardContent>
        <ol className="flex flex-col gap-4 border-l pl-4">
          {logs.map((log) => (
            <li key={log.log_id} className="relative flex flex-col gap-0.5 text-sm">
              <span className="absolute top-1.5 -left-[1.3rem] size-2 rounded-full bg-primary" />
              <span className="font-medium">{log.status}</span>
              <span className="text-xs text-muted-foreground">
                {log.created_at}・{log.staff}
              </span>
              {log.note && <span className="whitespace-pre-wrap">{log.note}</span>}
            </li>
          ))}
        </ol>
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
