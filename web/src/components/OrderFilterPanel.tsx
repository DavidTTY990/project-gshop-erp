import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DateRangeFilter, FilterChip, FilterGroup } from '@/components/FilterControls';
import { useSettings } from '@/lib/api';
import type { OrderFilters } from '@/lib/orderSearch';

type Props = {
  value: OrderFilters;
  onChange: (next: OrderFilters) => void;
};

const ALL = '__all__';

/** 訂單分頁的條件篩選：狀態（可複選）、訂單日期、付款方式、店員、發票 */
export default function OrderFilterPanel({ value, onChange }: Props) {
  const { data: settings } = useSettings();
  const set = (patch: Partial<OrderFilters>) => onChange({ ...value, ...patch });
  const toggleStatus = (s: string) =>
    set({ statuses: value.statuses.includes(s) ? value.statuses.filter((x) => x !== s) : [...value.statuses, s] });

  const select = (id: string, label: string, current: string, options: string[], onSelect: (v: string) => void) => (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Select value={current || ALL} onValueChange={(v) => onSelect(v === ALL ? '' : v)}>
        <SelectTrigger id={id} className="h-9 w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>全部</SelectItem>
          {options.map((o) => (
            <SelectItem key={o} value={o}>
              {o}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <div className="flex flex-col gap-4 rounded-lg border bg-background p-3">
      <FilterGroup label="狀態">
        <FilterChip selected={value.statuses.length === 0} onClick={() => set({ statuses: [] })}>
          全部
        </FilterChip>
        {(settings?.order_status ?? []).map((s) => (
          <FilterChip key={s} selected={value.statuses.includes(s)} onClick={() => toggleStatus(s)}>
            {s}
          </FilterChip>
        ))}
      </FilterGroup>

      <DateRangeFilter label="訂單日期" from={value.from} to={value.to} onChange={set} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[12rem_12rem_1fr]">
        {select('filter-payment', '付款方式', value.payment, settings?.payment_method ?? [], (payment) => set({ payment }))}
        {select('filter-staff', '經手店員', value.staff, settings?.staff ?? [], (staff) => set({ staff }))}
        <FilterGroup label="發票">
          {(
            [
              ['', '全部'],
              ['uninvoiced', '有未開發票'],
              ['pending', '有待補號碼'],
            ] as const
          ).map(([key, label]) => (
            <FilterChip key={key} selected={value.invoice === key} onClick={() => set({ invoice: key })}>
              {label}
            </FilterChip>
          ))}
        </FilterGroup>
      </div>
    </div>
  );
}
