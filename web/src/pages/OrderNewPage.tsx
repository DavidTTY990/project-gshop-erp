import { useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { CheckIcon, Loader2Icon, UserIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import CustomerPicker from '@/components/CustomerPicker';
import CustomerSummary from '@/components/CustomerSummary';
import FormField from '@/components/FormField';
import OrderItemsEditor, { type ItemField } from '@/components/OrderItemsEditor';
import SettingSelect from '@/components/SettingSelect';
import { useSettings } from '@/lib/api';
import {
  discountByRate,
  lineTotal,
  newItemRow,
  rateLabel,
  useCreateOrder,
  WALK_IN_CUSTOMER_ID,
  type OrderItemRow,
} from '@/lib/orders';
import { formatMoney, todayString } from '@/lib/repairs';
import { useSession } from '@/lib/session';
import { useFieldErrors } from '@/lib/useFieldErrors';

/** 新增訂單：客人（可為散客）→ 品項 → 結帳 */
export default function OrderNewPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const customerId = searchParams.get('customer') ?? '';
  const [picking, setPicking] = useState(false);

  const selectCustomer = (id: string) => {
    setPicking(false);
    setSearchParams(id ? { customer: id } : {}, { replace: true });
  };

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
      <h1 className="text-xl font-semibold">新增訂單</h1>

      {/* 客人區在表單外：「新增客人」視窗的表單送出不會觸發訂單表單 */}
      <Card>
        <CardHeader>
          <CardTitle>1. 客人</CardTitle>
          <CardAction>
            {customerId ? (
              <Button type="button" variant="outline" className="h-9" onClick={() => selectCustomer('')}>
                改為散客
              </Button>
            ) : (
              !picking && (
                <Button type="button" variant="outline" className="h-9" onClick={() => setPicking(true)}>
                  <UserIcon />
                  選擇客人
                </Button>
              )
            )}
          </CardAction>
        </CardHeader>
        <CardContent>
          {customerId ? (
            <CustomerSummary id={customerId} />
          ) : picking ? (
            <div className="flex flex-col gap-3">
              <CustomerPicker onSelect={(c) => selectCustomer(c.customer_id)} />
              <Button type="button" variant="ghost" className="h-9 self-start" onClick={() => setPicking(false)}>
                維持散客
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">散客（不記錄客人資料）</p>
          )}
        </CardContent>
      </Card>

      <OrderForm customerId={customerId} />
    </div>
  );
}

/** 折扣：比例模式隨小計自動重算；手動輸入金額後改為固定金額 */
type Discount = { mode: 'rate'; rate: number } | { mode: 'amount'; amount: string };

type FieldKey = `${string}.${ItemField}` | 'discount' | 'payment_method' | 'order_date';

const isInt = (v: string) => /^\d+$/.test(v);

function validate(items: OrderItemRow[], discountAmount: string, subtotal: number, values: { payment_method: string; order_date: string }) {
  const errors: Partial<Record<FieldKey, string>> = {};
  for (const item of items) {
    if (!item.product_name.trim()) errors[`${item.uid}.product_name`] = '請填寫商品名稱';
    if (!item.category) errors[`${item.uid}.category`] = '請選擇類別';
    if (!isInt(item.unit_price)) errors[`${item.uid}.unit_price`] = item.unit_price ? '請輸入整數金額' : '請填寫單價';
    if (!isInt(item.qty) || Number(item.qty) < 1) errors[`${item.uid}.qty`] = '需為 1 以上';
  }
  if (discountAmount !== '' && !isInt(discountAmount)) errors.discount = '請輸入整數金額';
  else if (Number(discountAmount) > subtotal) errors.discount = '折扣不可大於小計';
  if (!values.payment_method) errors.payment_method = '請選擇付款方式';
  if (!values.order_date) errors.order_date = '請選擇訂單日期';
  else if (values.order_date > todayString()) errors.order_date = '不可晚於今天';
  return errors;
}

function OrderForm({ customerId }: { customerId: string }) {
  const navigate = useNavigate();
  const { staff: currentStaff } = useSession();
  const { data: settings } = useSettings();
  const rates = (settings?.discount_rate ?? []).map(Number).filter((r) => r > 0 && r < 100);

  const [items, setItems] = useState<OrderItemRow[]>(() => [newItemRow()]);
  const [discount, setDiscount] = useState<Discount>({ mode: 'amount', amount: '' });
  const [values, setValues] = useState({
    order_date: todayString(),
    payment_method: '',
    staff: currentStaff ?? '',
    note: '',
  });
  const create = useCreateOrder();

  const subtotal = items.reduce((sum, item) => sum + (lineTotal(item) ?? 0), 0);
  const discountAmount = discount.mode === 'rate' ? String(discountByRate(subtotal, discount.rate)) : discount.amount;
  const total = subtotal - (isInt(discountAmount) ? Number(discountAmount) : 0);

  // 欄位離開焦點後才檢核該欄，送出時檢核全部
  const field = useFieldErrors(validate(items, discountAmount, subtotal, values));
  const set = (key: keyof typeof values) => (v: string) => setValues((s) => ({ ...s, [key]: v }));

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!field.submit()) return;
    create.mutate(
      {
        customer_id: customerId || WALK_IN_CUSTOMER_ID,
        items: items.map(({ uid: _uid, ...item }) => item),
        discount: discountAmount,
        ...values,
      },
      {
        onSuccess: ({ order }) => {
          toast.success(`已建立訂單 ${order.order_id}`);
          navigate(`/orders/${order.order_id}`, { replace: true });
        },
      },
    );
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>2. 品項</CardTitle>
        </CardHeader>
        <CardContent>
          <OrderItemsEditor
            items={items}
            onChange={setItems}
            error={(uid, f) => field.error(`${uid}.${f}`)}
            onBlurField={(uid, f) => field.touch(`${uid}.${f}`)()}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>3. 結帳</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <FormField id="discount" label="折扣" error={field.error('discount')}>
            <div className="flex flex-wrap items-center gap-2">
              <Input
                id="discount"
                inputMode="numeric"
                className="h-10 w-32"
                placeholder="0"
                value={discountAmount}
                onChange={(e) => setDiscount({ mode: 'amount', amount: e.target.value.trim() })}
                onBlur={field.touch('discount')}
                aria-invalid={!!field.error('discount')}
              />
              {rates.map((rate) => {
                const selected = discount.mode === 'rate' && discount.rate === rate;
                return (
                  <Button
                    key={rate}
                    type="button"
                    variant={selected ? 'default' : 'outline'}
                    className="h-9"
                    aria-pressed={selected}
                    onClick={() => setDiscount(selected ? { mode: 'amount', amount: '' } : { mode: 'rate', rate })}
                  >
                    {selected && <CheckIcon />}
                    {rateLabel(rate)}
                  </Button>
                );
              })}
            </div>
            {discount.mode === 'rate' && (
              <p className="text-sm text-muted-foreground">已套用 {rateLabel(discount.rate)}，品項變動時自動重算</p>
            )}
            <p className="text-sm text-muted-foreground">舊遊戲或主機折抵也記在折扣，並在備註寫明折抵內容</p>
          </FormField>

          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 rounded-lg bg-muted/60 p-3 text-sm">
            <dt className="text-muted-foreground">小計</dt>
            <dd className="text-right">{formatMoney(subtotal)}</dd>
            <dt className="text-muted-foreground">折扣</dt>
            <dd className="text-right">− {formatMoney(isInt(discountAmount) ? Number(discountAmount) : 0)}</dd>
            <dt className="font-medium">總計</dt>
            <dd className="text-right text-lg font-semibold">{formatMoney(total)}</dd>
          </dl>

          <div className="grid gap-4 sm:grid-cols-3">
            <FormField id="payment_method" label="付款方式" required error={field.error('payment_method')}>
              <SettingSelect
                id="payment_method"
                setting="payment_method"
                value={values.payment_method}
                onChange={set('payment_method')}
                onBlur={field.touch('payment_method')}
                invalid={!!field.error('payment_method')}
              />
            </FormField>
            <FormField id="order_date" label="訂單日期" required error={field.error('order_date')}>
              <Input
                id="order_date"
                type="date"
                className="h-10"
                max={todayString()}
                value={values.order_date}
                onChange={(e) => set('order_date')(e.target.value)}
                onBlur={field.touch('order_date')}
                aria-invalid={!!field.error('order_date')}
              />
            </FormField>
            <FormField id="staff" label="經手店員">
              <SettingSelect id="staff" setting="staff" value={values.staff} onChange={set('staff')} />
            </FormField>
          </div>
          <FormField id="note" label="備註">
            <Textarea id="note" rows={2} value={values.note} onChange={(e) => set('note')(e.target.value)} />
          </FormField>
        </CardContent>
      </Card>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" className="h-10" onClick={() => navigate('/')} disabled={create.isPending}>
          取消
        </Button>
        <Button type="submit" className="h-10 sm:min-w-32" disabled={create.isPending}>
          {create.isPending && <Loader2Icon className="animate-spin" />}
          建立訂單（{formatMoney(total)}）
        </Button>
      </div>
    </form>
  );
}
