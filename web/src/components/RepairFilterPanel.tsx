import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DateRangeFilter, FilterChip, FilterGroup } from '@/components/FilterControls';
import { useSettings } from '@/lib/api';
import { openStatuses, UNASSIGNED, type RepairFilters } from '@/lib/repairSearch';

type Props = {
  value: RepairFilters;
  onChange: (next: RepairFilters) => void;
};

const ALL = '__all__';

/** 維修分頁的條件篩選：狀態（可複選）、收件日期、經手人員、付款、逾期 */
export default function RepairFilterPanel({ value, onChange }: Props) {
  const { data: settings } = useSettings();
  const statuses = settings?.repair_status ?? [];
  const open = openStatuses(statuses);
  const set = (patch: Partial<RepairFilters>) => onChange({ ...value, ...patch });

  const sameSet = (a: string[], b: string[]) => a.length === b.length && a.every((s) => b.includes(s));
  const toggleStatus = (s: string) =>
    set({ statuses: value.statuses.includes(s) ? value.statuses.filter((x) => x !== s) : [...value.statuses, s] });

  return (
    <div className="flex flex-col gap-4 rounded-lg border bg-background p-3">
      <FilterGroup label="狀態">
        <FilterChip selected={value.statuses.length === 0} onClick={() => set({ statuses: [] })}>
          全部
        </FilterChip>
        <FilterChip selected={open.length > 0 && sameSet(value.statuses, open)} onClick={() => set({ statuses: open })}>
          未結案
        </FilterChip>
        <span className="mx-1 hidden h-6 w-px bg-border sm:block" />
        {statuses.map((s) => (
          <FilterChip key={s} selected={value.statuses.includes(s)} onClick={() => toggleStatus(s)}>
            {s}
          </FilterChip>
        ))}
      </FilterGroup>

      <DateRangeFilter label="收件日期" from={value.from} to={value.to} onChange={set} />

      <div className="grid gap-4 sm:grid-cols-[14rem_1fr]">
        <FilterGroup label="經手人員">
          <Select value={value.handler || ALL} onValueChange={(v) => set({ handler: v === ALL ? '' : v })}>
            <SelectTrigger className="h-9 w-full" aria-label="經手人員">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>全部</SelectItem>
              <SelectItem value={UNASSIGNED}>未指派</SelectItem>
              {(settings?.staff ?? []).map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterGroup>

        <FilterGroup label="付款">
          {(
            [
              ['', '全部'],
              ['unpaid', '未付清'],
              ['paid', '已付清'],
            ] as const
          ).map(([key, label]) => (
            <FilterChip key={key} selected={value.paid === key} onClick={() => set({ paid: key })}>
              {label}
            </FilterChip>
          ))}
          <div className="ml-2 flex items-center gap-2">
            <Checkbox
              id="filter-overdue"
              className="size-5"
              checked={value.overdue}
              onCheckedChange={(v) => set({ overdue: v === true })}
            />
            <Label htmlFor="filter-overdue">只顯示逾期</Label>
          </div>
        </FilterGroup>
      </div>
    </div>
  );
}
