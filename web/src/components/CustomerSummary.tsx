import { formatPhone, useCustomer } from '@/lib/customers';

/** 已選取客人的摘要：姓名、電話、LINE */
export default function CustomerSummary({ id }: { id: string }) {
  const { data: customer, isPending, isError } = useCustomer(id);
  if (isPending) return <p className="text-sm text-muted-foreground">載入中…</p>;
  if (isError) return <p className="text-sm text-destructive">找不到客人（{id}）</p>;
  return (
    <div className="flex flex-col gap-0.5">
      <span className="font-medium">{customer.name}</span>
      <span className="text-sm text-muted-foreground">
        {[formatPhone(customer.phone), customer.line_id && `LINE：${customer.line_id}`].filter(Boolean).join('・')}
      </span>
    </div>
  );
}
