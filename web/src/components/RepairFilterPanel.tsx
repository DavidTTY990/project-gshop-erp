import { CheckIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSettings } from '@/lib/api';
import { datePreset, openStatuses, UNASSIGNED, type RepairFilters } from '@/lib/repairSearch';

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

  const presets = [
    { key: 'today', label: '今天' },
    { key: 'week', label: '本週' },
    { key: 'month', label: '本月' },
  ] as const;

  return (
    <div className="flex flex-col gap-4 rounded-lg border bg-background p-3">
      <Group label="狀態">
        <Chip selected={value.statuses.length === 0} onClick={() => set({ statuses: [] })}>
          全部
        </Chip>
        <Chip selected={open.length > 0 && sameSet(value.statuses, open)} onClick={() => set({ statuses: open })}>
          未結案
        </Chip>
        <span className="mx-1 hidden h-6 w-px bg-border sm:block" />
        {statuses.map((s) => (
          <Chip key={s} selected={value.statuses.includes(s)} onClick={() => toggleStatus(s)}>
            {s}
          </Chip>
        ))}
      </Group>

      <Group label="收件日期">
        {presets.map((p) => {
          const range = datePreset(p.key);
          return (
            <Chip key={p.key} selected={value.from === range.from && value.to === range.to} onClick={() => set(range)}>
              {p.label}
            </Chip>
          );
        })}
        <div className="flex w-full items-center gap-2 sm:w-auto">
          <Input
            type="date"
            aria-label="收件日期起"
            className="h-9 min-w-0 flex-1 sm:w-40"
            value={value.from}
            onChange={(e) => set({ from: e.target.value })}
          />
          <span className="text-muted-foreground">～</span>
          <Input
            type="date"
            aria-label="收件日期迄"
            className="h-9 min-w-0 flex-1 sm:w-40"
            value={value.to}
            onChange={(e) => set({ to: e.target.value })}
          />
        </div>
      </Group>

      <div className="grid gap-4 sm:grid-cols-[14rem_1fr]">
        <Group label="經手人員">
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
        </Group>

        <Group label="付款">
          {(
            [
              ['', '全部'],
              ['unpaid', '未付清'],
              ['paid', '已付清'],
            ] as const
          ).map(([key, label]) => (
            <Chip key={key} selected={value.paid === key} onClick={() => set({ paid: key })}>
              {label}
            </Chip>
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
        </Group>
      </div>
    </div>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium">{label}</span>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}

function Chip({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <Button type="button" variant={selected ? 'default' : 'outline'} className="h-9" aria-pressed={selected} onClick={onClick}>
      {selected && <CheckIcon />}
      {children}
    </Button>
  );
}
