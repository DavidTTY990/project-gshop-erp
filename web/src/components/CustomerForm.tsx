import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { Loader2Icon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ApiError } from '@/lib/apiError';
import { normalizePhone, type CustomerInput, type DuplicatePhone } from '@/lib/customers';

type Props = {
  defaultValues?: CustomerInput;
  submitLabel: string;
  pending: boolean;
  /** 上次送出的錯誤；DUPLICATE_PHONE 顯示在電話欄位下方 */
  error: Error | null;
  onSubmit: (input: CustomerInput) => void;
  onCancel?: () => void;
};

type Errors = Partial<Record<keyof CustomerInput | 'contact', string>>;

const EMPTY: CustomerInput = { name: '', phone: '', line_id: '', note: '' };

/** 與後端 validateCustomer 相同的規則，先在前端擋下 */
function validate(input: CustomerInput): Errors {
  const errors: Errors = {};
  const phone = normalizePhone(input.phone);
  if (!input.name.trim()) errors.name = '請填寫姓名';
  if (!phone && !input.line_id.trim()) errors.contact = '電話與 LINE ID 至少填一項';
  if (phone && (phone.length < 8 || phone.length > 10)) errors.phone = '電話需為 8～10 碼數字';
  return errors;
}

/** 新增與編輯客人共用的表單 */
export default function CustomerForm({ defaultValues = EMPTY, submitLabel, pending, error, onSubmit, onCancel }: Props) {
  const [values, setValues] = useState(defaultValues);
  const [errors, setErrors] = useState<Errors>({});

  const duplicate =
    error instanceof ApiError && error.code === 'DUPLICATE_PHONE' ? (error.data as DuplicatePhone) : null;

  const set = (field: keyof CustomerInput) => (e: { target: { value: string } }) =>
    setValues((v) => ({ ...v, [field]: e.target.value }));

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const next = validate(values);
    setErrors(next);
    if (Object.keys(next).length === 0) onSubmit(values);
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <Field id="name" label="姓名" required error={errors.name}>
        <Input id="name" className="h-10" value={values.name} onChange={set('name')} aria-invalid={!!errors.name} />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="phone" label="電話" error={errors.phone}>
          <Input
            id="phone"
            type="tel"
            inputMode="tel"
            className="h-10"
            placeholder="0912-345-678"
            value={values.phone}
            onChange={set('phone')}
            aria-invalid={!!errors.phone || !!duplicate}
          />
          {duplicate && (
            <p className="text-sm text-destructive">
              此電話已登記為「
              <Link to={`/customers/${duplicate.customer_id}`} className="underline underline-offset-2">
                {duplicate.name}
              </Link>
              」
            </p>
          )}
        </Field>
        <Field id="line_id" label="LINE ID">
          <Input
            id="line_id"
            className="h-10"
            autoCapitalize="none"
            value={values.line_id}
            onChange={set('line_id')}
          />
        </Field>
      </div>
      {errors.contact && <p className="-mt-2 text-sm text-destructive">{errors.contact}</p>}

      <Field id="note" label="備註">
        <Textarea id="note" rows={3} value={values.note} onChange={set('note')} />
      </Field>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        {onCancel && (
          <Button type="button" variant="outline" className="h-10" onClick={onCancel} disabled={pending}>
            取消
          </Button>
        )}
        <Button type="submit" className="h-10 sm:min-w-28" disabled={pending}>
          {pending && <Loader2Icon className="animate-spin" />}
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}

function Field({
  id,
  label,
  required,
  error,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>
        {label}
        {required && <span className="text-destructive">*</span>}
      </Label>
      {children}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
