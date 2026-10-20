import { useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { Loader2Icon } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import AccessoryInput from '@/components/AccessoryInput';
import CustomerPicker from '@/components/CustomerPicker';
import DevicePicker, { type DeviceChoice } from '@/components/DevicePicker';
import FormField from '@/components/FormField';
import SettingSelect from '@/components/SettingSelect';
import { formatPhone, useCustomer } from '@/lib/customers';
import { useCreateRepair } from '@/lib/repairs';
import { useSession } from '@/lib/session';
import { useFieldErrors } from '@/lib/useFieldErrors';

type IntakeFields = {
  issue: string;
  accessories: string;
  intake_condition: string;
  quote_amount: string;
  deposit: string;
  estimated_done_date: string;
  handler: string;
  note: string;
};

const EMPTY_INTAKE: IntakeFields = {
  issue: '',
  accessories: '',
  intake_condition: '',
  quote_amount: '',
  deposit: '',
  estimated_done_date: '',
  handler: '',
  note: '',
};

type ErrorField = 'device' | 'device_type' | 'issue' | 'quote_amount' | 'deposit';
type Errors = Partial<Record<ErrorField, string>>;

const isAmount = (v: string) => v === '' || /^\d+$/.test(v);

function validate(device: DeviceChoice, intake: IntakeFields): Errors {
  const errors: Errors = {};
  if (!device) errors.device = '請選擇機器';
  if (device?.kind === 'new' && !device.device.device_type) errors.device_type = '請選擇機器類型';
  if (!intake.issue.trim()) errors.issue = '請填寫問題描述';
  if (!isAmount(intake.quote_amount)) errors.quote_amount = '請輸入整數金額';
  if (!isAmount(intake.deposit)) errors.deposit = '請輸入整數金額';
  return errors;
}

/** 新增維修單：選客人（或從網址 ?customer= 帶入）→ 選機器 → 收件資訊 */
export default function RepairNewPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const customerId = searchParams.get('customer') ?? '';

  const selectCustomer = (id: string) => setSearchParams(id ? { customer: id } : {}, { replace: true });

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <h1 className="text-xl font-semibold">新增維修單</h1>

      {/* 客人區在表單外：「新增客人」視窗的表單送出不會觸發維修單表單 */}
      <Card>
        <CardHeader>
          <CardTitle>1. 客人</CardTitle>
          {customerId && (
            <CardAction>
              <Button type="button" variant="outline" className="h-9" onClick={() => selectCustomer('')}>
                更換
              </Button>
            </CardAction>
          )}
        </CardHeader>
        <CardContent>
          {customerId ? (
            <SelectedCustomer id={customerId} />
          ) : (
            <CustomerPicker onSelect={(c) => selectCustomer(c.customer_id)} />
          )}
        </CardContent>
      </Card>

      {/* 以客人為 key：更換客人時機器、收件資訊與檢核狀態全部重設 */}
      {customerId && <RepairIntakeForm key={customerId} customerId={customerId} />}
    </div>
  );
}

/** 機器與收件資訊（含送出） */
function RepairIntakeForm({ customerId }: { customerId: string }) {
  const navigate = useNavigate();
  const { staff } = useSession();

  const [device, setDevice] = useState<DeviceChoice>(null);
  const [intake, setIntake] = useState(EMPTY_INTAKE);
  // 欄位離開焦點後才檢核該欄，送出時檢核全部
  const field = useFieldErrors(validate(device, intake));
  const create = useCreateRepair();

  const set = (field: keyof IntakeFields) => (v: string) => setIntake((i) => ({ ...i, [field]: v }));

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!field.submit() || !device) return;

    create.mutate(
      {
        ...intake,
        customer_id: customerId,
        ...(device.kind === 'existing' ? { device_id: device.device_id } : { device: device.device }),
        staff: staff ?? '',
      },
      {
        onSuccess: ({ repair }) => {
          toast.success(`已建立維修單 ${repair.repair_id}`);
          navigate(`/repairs/${repair.repair_id}`, { replace: true });
        },
      },
    );
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>2. 機器</CardTitle>
        </CardHeader>
        <CardContent>
          <DevicePicker
            customerId={customerId}
            value={device}
            onChange={setDevice}
            error={field.error('device')}
            deviceErrors={{ device_type: field.error('device_type') }}
            onBlurDeviceField={(f) => f === 'device_type' && field.touch('device_type')()}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>3. 收件資訊</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <FormField id="issue" label="問題描述" required error={field.error('issue')}>
            <Textarea
              id="issue"
              rows={3}
              placeholder="客人描述的問題，例：無法開機、左手把飄移"
              value={intake.issue}
              onChange={(e) => set('issue')(e.target.value)}
              onBlur={field.touch('issue')}
              aria-invalid={!!field.error('issue')}
            />
          </FormField>
          <FormField id="accessories" label="配件">
            <AccessoryInput id="accessories" value={intake.accessories} onChange={set('accessories')} />
          </FormField>
          <FormField id="intake_condition" label="外觀狀況">
            <Textarea
              id="intake_condition"
              rows={2}
              placeholder="例：右上角刮傷、螢幕有細紋"
              value={intake.intake_condition}
              onChange={(e) => set('intake_condition')(e.target.value)}
            />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id="quote_amount" label="報價" error={field.error('quote_amount')}>
              <Input
                id="quote_amount"
                inputMode="numeric"
                className="h-10"
                placeholder="檢測後再填可留空"
                value={intake.quote_amount}
                onChange={(e) => set('quote_amount')(e.target.value.trim())}
                onBlur={field.touch('quote_amount')}
                aria-invalid={!!field.error('quote_amount')}
              />
            </FormField>
            <FormField id="deposit" label="訂金" error={field.error('deposit')}>
              <Input
                id="deposit"
                inputMode="numeric"
                className="h-10"
                placeholder="0"
                value={intake.deposit}
                onChange={(e) => set('deposit')(e.target.value.trim())}
                onBlur={field.touch('deposit')}
                aria-invalid={!!field.error('deposit')}
              />
            </FormField>
            <FormField id="estimated_done_date" label="預計完成日">
              <Input
                id="estimated_done_date"
                type="date"
                className="h-10"
                value={intake.estimated_done_date}
                onChange={(e) => set('estimated_done_date')(e.target.value)}
              />
            </FormField>
            <FormField id="handler" label="經手人員">
              <SettingSelect id="handler" setting="staff" value={intake.handler} onChange={set('handler')} noneLabel="未指派" />
            </FormField>
          </div>
          <FormField id="note" label="備註">
            <Textarea id="note" rows={2} value={intake.note} onChange={(e) => set('note')(e.target.value)} />
          </FormField>
        </CardContent>
      </Card>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" className="h-10" onClick={() => navigate('/')} disabled={create.isPending}>
          取消
        </Button>
        <Button type="submit" className="h-10 sm:min-w-32" disabled={create.isPending}>
          {create.isPending && <Loader2Icon className="animate-spin" />}
          建立維修單
        </Button>
      </div>
    </form>
  );
}

function SelectedCustomer({ id }: { id: string }) {
  const { data: customer, isPending, isError } = useCustomer(id);
  if (isPending) return <p className="text-sm text-muted-foreground">載入中…</p>;
  if (isError) return <p className="text-sm text-destructive">找不到客人，請按「更換」重新選擇</p>;
  return (
    <div className="flex flex-col gap-0.5">
      <span className="font-medium">{customer.name}</span>
      <span className="text-sm text-muted-foreground">
        {[formatPhone(customer.phone), customer.line_id && `LINE：${customer.line_id}`].filter(Boolean).join('・')}
      </span>
    </div>
  );
}
