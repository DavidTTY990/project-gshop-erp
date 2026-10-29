import { Input } from '@/components/ui/input';
import FormField from '@/components/FormField';
import { todayString } from '@/lib/repairs';
import type { InvoiceField, InvoiceInput } from '@/lib/invoices';

type Props = {
  idPrefix: string;
  values: InvoiceInput;
  onChange: (values: InvoiceInput) => void;
  error: (field: InvoiceField) => string | undefined;
  touch: (field: InvoiceField) => () => void;
  /** 新增訂單時日期等於訂單日期，不顯示 */
  withDate?: boolean;
};

/** 發票號碼、統編（選填）與發票日期 */
export default function InvoiceFields({ idPrefix, values, onChange, error, touch, withDate = true }: Props) {
  const set = (key: keyof InvoiceInput) => (v: string) => onChange({ ...values, [key]: v });
  const id = (f: InvoiceField) => `${idPrefix}-${f}`;

  return (
    <div className={withDate ? 'grid gap-4 sm:grid-cols-3' : 'grid gap-4 sm:grid-cols-2'}>
      <FormField id={id('invoice_no')} label="發票號碼" error={error('invoice_no')}>
        <Input
          id={id('invoice_no')}
          className="h-10 uppercase placeholder:normal-case"
          placeholder="待補（例：AB12345678）"
          autoComplete="off"
          value={values.invoice_no}
          onChange={(e) => set('invoice_no')(e.target.value)}
          onBlur={touch('invoice_no')}
          aria-invalid={!!error('invoice_no')}
        />
      </FormField>
      <FormField id={id('buyer_tax_id')} label="買方統編" error={error('buyer_tax_id')}>
        <Input
          id={id('buyer_tax_id')}
          className="h-10"
          inputMode="numeric"
          maxLength={8}
          placeholder="不需統編可留空"
          autoComplete="off"
          value={values.buyer_tax_id}
          onChange={(e) => set('buyer_tax_id')(e.target.value.trim())}
          onBlur={touch('buyer_tax_id')}
          aria-invalid={!!error('buyer_tax_id')}
        />
      </FormField>
      {withDate && (
        <FormField id={id('invoice_date')} label="發票日期" required error={error('invoice_date')}>
          <Input
            id={id('invoice_date')}
            type="date"
            className="h-10"
            max={todayString()}
            value={values.invoice_date}
            onChange={(e) => set('invoice_date')(e.target.value)}
            onBlur={touch('invoice_date')}
            aria-invalid={!!error('invoice_date')}
          />
        </FormField>
      )}
    </div>
  );
}
