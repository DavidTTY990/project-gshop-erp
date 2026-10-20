import { useState, type FormEvent } from 'react';
import { Loader2Icon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import AccessoryInput from '@/components/AccessoryInput';
import FormField from '@/components/FormField';
import SettingSelect from '@/components/SettingSelect';
import { dateOnly, type Repair, type RepairFieldsInput } from '@/lib/repairs';
import { useFieldErrors } from '@/lib/useFieldErrors';

type Props = {
  repair: Repair;
  pending: boolean;
  onSubmit: (input: RepairFieldsInput) => void;
  onCancel: () => void;
};

type AmountField = 'quote_amount' | 'final_amount' | 'deposit';
type Errors = Partial<Record<'issue' | AmountField, string>>;

const amountText = (n: number | null) => (n === null ? '' : String(n));

function validate(values: RepairFieldsInput): Errors {
  const errors: Errors = {};
  if (!values.issue.trim()) errors.issue = '請填寫問題描述';
  (['quote_amount', 'final_amount', 'deposit'] as const).forEach((f) => {
    if (values[f] !== '' && !/^\d+$/.test(values[f])) errors[f] = '請輸入整數金額';
  });
  return errors;
}

function toInput(r: Repair): RepairFieldsInput {
  return {
    issue: r.issue,
    accessories: r.accessories,
    intake_condition: r.intake_condition,
    diagnosis: r.diagnosis,
    quote_amount: amountText(r.quote_amount),
    final_amount: amountText(r.final_amount),
    deposit: amountText(r.deposit),
    is_paid: r.is_paid,
    estimated_done_date: dateOnly(r.estimated_done_date),
    handler: r.handler,
    note: r.note,
  };
}

/** 維修單詳情的編輯表單（狀態另以「變更狀態」修改） */
export default function RepairFieldsForm({ repair, pending, onSubmit, onCancel }: Props) {
  const [values, setValues] = useState(() => toInput(repair));
  // 欄位離開焦點後才檢核該欄，送出時檢核全部
  const field = useFieldErrors(validate(values));

  const set = <K extends keyof RepairFieldsInput>(field: K) => (v: RepairFieldsInput[K]) =>
    setValues((s) => ({ ...s, [field]: v }));

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (field.submit()) onSubmit(values);
  };

  const amount = (name: AmountField, label: string, placeholder?: string) => (
    <FormField id={name} label={label} error={field.error(name)}>
      <Input
        id={name}
        inputMode="numeric"
        className="h-10"
        placeholder={placeholder}
        value={values[name]}
        onChange={(e) => set(name)(e.target.value.trim())}
        onBlur={field.touch(name)}
        aria-invalid={!!field.error(name)}
      />
    </FormField>
  );

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <FormField id="issue" label="問題描述" required error={field.error('issue')}>
        <Textarea
          id="issue"
          rows={3}
          value={values.issue}
          onChange={(e) => set('issue')(e.target.value)}
          onBlur={field.touch('issue')}
          aria-invalid={!!field.error('issue')}
        />
      </FormField>
      <FormField id="diagnosis" label="檢測結果">
        <Textarea id="diagnosis" rows={3} value={values.diagnosis} onChange={(e) => set('diagnosis')(e.target.value)} />
      </FormField>
      <FormField id="accessories" label="配件">
        <AccessoryInput id="accessories" value={values.accessories} onChange={set('accessories')} />
      </FormField>
      <FormField id="intake_condition" label="外觀狀況">
        <Textarea id="intake_condition" rows={2} value={values.intake_condition} onChange={(e) => set('intake_condition')(e.target.value)} />
      </FormField>
      <div className="grid gap-4 sm:grid-cols-3">
        {amount('quote_amount', '報價')}
        {amount('deposit', '訂金', '0')}
        {amount('final_amount', '總金額', '完成後填寫')}
      </div>
      <div className="flex items-center gap-2">
        <Checkbox id="is_paid" checked={values.is_paid} onCheckedChange={(v) => set('is_paid')(v === true)} className="size-5" />
        <Label htmlFor="is_paid">已付清</Label>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id="estimated_done_date" label="預計完成日">
          <Input
            id="estimated_done_date"
            type="date"
            className="h-10"
            value={values.estimated_done_date}
            onChange={(e) => set('estimated_done_date')(e.target.value)}
          />
        </FormField>
        <FormField id="handler" label="經手人員">
          <SettingSelect id="handler" setting="staff" value={values.handler} onChange={set('handler')} noneLabel="未指派" />
        </FormField>
      </div>
      <FormField id="note" label="備註">
        <Textarea id="note" rows={2} value={values.note} onChange={(e) => set('note')(e.target.value)} />
      </FormField>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" className="h-10" onClick={onCancel} disabled={pending}>
          取消
        </Button>
        <Button type="submit" className="h-10 sm:min-w-28" disabled={pending}>
          {pending && <Loader2Icon className="animate-spin" />}
          儲存
        </Button>
      </div>
    </form>
  );
}
