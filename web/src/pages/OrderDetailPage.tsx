import { useState } from 'react';
import { Link, useLocation, useParams } from 'react-router';
import { Loader2Icon, PencilIcon, Undo2Icon, UserIcon, XCircleIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import BackButton from '@/components/BackButton';
import CloseOrderDialog from '@/components/CloseOrderDialog';
import CustomerPicker from '@/components/CustomerPicker';
import FormField from '@/components/FormField';
import OrderInvoicesCard from '@/components/OrderInvoicesCard';
import OrderStatusBadge from '@/components/OrderStatusBadge';
import SettingSelect from '@/components/SettingSelect';
import { formatPhone, useCustomer } from '@/lib/customers';
import { isPendingInvoice, isUninvoiced, type Invoice } from '@/lib/invoices';
import { backStateFrom, type BackState } from '@/lib/navigation';
import {
  isWalkIn,
  ORDER_CANCELLED,
  ORDER_COMPLETED,
  useOrder,
  useUpdateOrder,
  WALK_IN_CUSTOMER_ID,
  type Order,
  type OrderItem,
} from '@/lib/orders';
import { dateOnly, formatMoney } from '@/lib/repairs';

export default function OrderDetailPage() {
  const { id = '' } = useParams();
  const { data, isPending, isError } = useOrder(id);

  let content;
  if (isPending) {
    content = (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2Icon className="size-4 animate-spin" />
        載入中…
      </p>
    );
  } else if (isError) {
    content = <p className="text-muted-foreground">找不到訂單</p>;
  } else {
    // 以 id 為 key：切換到另一筆訂單時重設編輯狀態
    content = <OrderView key={data.order.order_id} order={data.order} items={data.items} invoices={data.invoices ?? []} />;
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-2">
      <BackButton fallback="/" fallbackLabel="回首頁" />
      {content}
    </div>
  );
}

function OrderView({ order, items, invoices }: { order: Order; items: OrderItem[]; invoices: Invoice[] }) {
  const [closing, setClosing] = useState<'cancel' | 'return' | null>(null);
  const location = useLocation();
  const backState = backStateFrom(location, '回訂單');
  const completed = order.status === ORDER_COMPLETED;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-xl font-semibold">{order.order_id}</h1>
        <OrderStatusBadge status={order.status} />
        {completed && items.some((i) => isUninvoiced(i, invoices)) && <Badge className="bg-amber-100 text-amber-800">未開發票</Badge>}
        {invoices.some(isPendingInvoice) && <Badge className="bg-amber-100 text-amber-800">發票待補號碼</Badge>}
        {completed && (
          <div className="ml-auto flex gap-2">
            <Button variant="outline" className="h-9" onClick={() => setClosing('return')}>
              <Undo2Icon />
              退貨
            </Button>
            <Button variant="outline" className="h-9 text-destructive" onClick={() => setClosing('cancel')}>
              <XCircleIcon />
              取消訂單
            </Button>
          </div>
        )}
      </div>
      {closing && <CloseOrderDialog order={order} invoices={invoices} kind={closing} onOpenChange={(o) => !o && setClosing(null)} />}

      {!completed && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <p className="font-medium">
            {order.status === ORDER_CANCELLED ? '已取消' : '已退貨'}於 {order.returned_at}
          </p>
          <p className="whitespace-pre-wrap">原因：{order.return_reason}</p>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <CustomerCard order={order} backState={backState} />
        <InfoCard order={order} />
      </div>
      <ItemsCard order={order} items={items} />
      <OrderInvoicesCard order={order} items={items} invoices={invoices} />
    </div>
  );
}

/** 客人：散客顯示「散客」；已完成時可補綁、更換或移除 */
function CustomerCard({ order, backState }: { order: Order; backState: BackState }) {
  const [picking, setPicking] = useState(false);
  const update = useUpdateOrder(order.order_id);
  const editable = order.status === ORDER_COMPLETED;
  const walkIn = isWalkIn(order.customer_id);

  const setCustomer = (customerId: string) =>
    update.mutate(
      { customer_id: customerId, payment_method: order.payment_method, staff: order.staff, note: order.note },
      {
        onSuccess: () => {
          toast.success(isWalkIn(customerId) ? '已改為散客' : '已設定客人');
          setPicking(false);
        },
      },
    );

  return (
    <Card>
      <CardHeader>
        <CardTitle>客人</CardTitle>
        {editable && (
          <CardAction className="flex gap-2">
            {!walkIn && (
              <Button variant="ghost" className="h-9" disabled={update.isPending} onClick={() => setCustomer(WALK_IN_CUSTOMER_ID)}>
                改為散客
              </Button>
            )}
            <Button variant="outline" className="h-9" disabled={update.isPending} onClick={() => setPicking(true)}>
              <UserIcon />
              {walkIn ? '設定客人' : '更換'}
            </Button>
          </CardAction>
        )}
      </CardHeader>
      <CardContent>
        {walkIn ? (
          <p className="text-sm text-muted-foreground">散客</p>
        ) : (
          <CustomerInfo customerId={order.customer_id} backState={backState} />
        )}
      </CardContent>

      {/* 視窗不在任何 <form> 內，客人表單送出不會冒泡到其他表單 */}
      <Dialog open={picking} onOpenChange={(o) => !update.isPending && setPicking(o)}>
        <DialogContent className="max-h-[90svh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{walkIn ? '設定客人' : '更換客人'}</DialogTitle>
          </DialogHeader>
          <CustomerPicker onSelect={(c) => setCustomer(c.customer_id)} />
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function CustomerInfo({ customerId, backState }: { customerId: string; backState: BackState }) {
  const { data: customer, isPending } = useCustomer(customerId);
  if (isPending) return <p className="text-sm text-muted-foreground">載入中…</p>;
  if (!customer) return <p className="text-sm text-muted-foreground">找不到客人（{customerId}）</p>;
  return (
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
  );
}

/** 付款資訊：已完成可改付款方式、店員、備註；取消或退貨後只能改備註 */
function InfoCard({ order }: { order: Order }) {
  const [editing, setEditing] = useState(false);
  const [values, setValues] = useState({ payment_method: order.payment_method, staff: order.staff, note: order.note });
  const update = useUpdateOrder(order.order_id);
  const completed = order.status === ORDER_COMPLETED;

  const startEdit = () => {
    setValues({ payment_method: order.payment_method, staff: order.staff, note: order.note });
    setEditing(true);
  };

  const save = () =>
    update.mutate(
      completed ? { customer_id: order.customer_id, ...values } : { ...order, note: values.note },
      {
        onSuccess: () => {
          toast.success('已儲存');
          setEditing(false);
        },
      },
    );

  return (
    <Card>
      <CardHeader>
        <CardTitle>付款資訊</CardTitle>
        {!editing && (
          <CardAction>
            <Button variant="outline" className="h-9" onClick={startEdit}>
              <PencilIcon />
              {completed ? '編輯' : '編輯備註'}
            </Button>
          </CardAction>
        )}
      </CardHeader>
      <CardContent>
        {editing ? (
          <div className="flex flex-col gap-4">
            {completed && (
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField id="payment_method" label="付款方式" required>
                  <SettingSelect
                    id="payment_method"
                    setting="payment_method"
                    value={values.payment_method}
                    onChange={(v) => setValues((s) => ({ ...s, payment_method: v }))}
                  />
                </FormField>
                <FormField id="staff" label="經手店員" required>
                  <SettingSelect id="staff" setting="staff" value={values.staff} onChange={(v) => setValues((s) => ({ ...s, staff: v }))} />
                </FormField>
              </div>
            )}
            <FormField id="note" label="備註">
              <Textarea id="note" rows={3} value={values.note} onChange={(e) => setValues((s) => ({ ...s, note: e.target.value }))} />
            </FormField>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="outline" className="h-10" disabled={update.isPending} onClick={() => setEditing(false)}>
                取消
              </Button>
              <Button className="h-10 sm:min-w-24" disabled={update.isPending} onClick={save}>
                {update.isPending && <Loader2Icon className="animate-spin" />}
                儲存
              </Button>
            </div>
          </div>
        ) : (
          <dl className="grid grid-cols-[5rem_1fr] gap-x-4 gap-y-2 text-sm">
            <Item label="訂單日期" value={dateOnly(order.order_date)} />
            <Item label="付款方式" value={order.payment_method} />
            <Item label="經手店員" value={order.staff} />
            <Item label="備註" value={order.note} />
            <Item label="建立時間" value={order.created_at} />
          </dl>
        )}
      </CardContent>
    </Card>
  );
}

function ItemsCard({ order, items }: { order: Order; items: OrderItem[] }) {
  const attrs = (i: OrderItem) => [i.category, i.platform, i.condition].filter(Boolean).join('・');

  return (
    <Card>
      <CardHeader>
        <CardTitle>品項</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {/* 手機：清單 */}
        <ul className="flex flex-col divide-y md:hidden">
          {items.map((i) => (
            <li key={i.item_id} className="flex flex-col gap-0.5 py-2 text-sm">
              <span className="font-medium">{i.product_name}</span>
              <span className="text-muted-foreground">{attrs(i)}</span>
              <span className="flex justify-between">
                <span className="text-muted-foreground">
                  {formatMoney(i.unit_price)} × {i.qty}
                </span>
                <span className="font-medium">{formatMoney(i.line_total)}</span>
              </span>
            </li>
          ))}
        </ul>
        {/* 平板／電腦：表格 */}
        <div className="hidden md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>商品名稱</TableHead>
                <TableHead>類別・平台・狀態</TableHead>
                <TableHead className="text-right">單價</TableHead>
                <TableHead className="text-right">數量</TableHead>
                <TableHead className="text-right">小計</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((i) => (
                <TableRow key={i.item_id}>
                  <TableCell className="font-medium">{i.product_name}</TableCell>
                  <TableCell className="text-muted-foreground">{attrs(i)}</TableCell>
                  <TableCell className="text-right">{formatMoney(i.unit_price)}</TableCell>
                  <TableCell className="text-right">{i.qty}</TableCell>
                  <TableCell className="text-right">{formatMoney(i.line_total)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <dl className="ml-auto grid w-full grid-cols-[auto_1fr] gap-x-6 gap-y-1 rounded-lg bg-muted/60 p-3 text-sm sm:w-72">
          <dt className="text-muted-foreground">小計</dt>
          <dd className="text-right">{formatMoney(order.subtotal)}</dd>
          <dt className="text-muted-foreground">折扣</dt>
          <dd className="text-right">− {formatMoney(order.discount)}</dd>
          <dt className="font-medium">總計</dt>
          <dd className="text-right text-lg font-semibold">{formatMoney(order.total)}</dd>
        </dl>
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
