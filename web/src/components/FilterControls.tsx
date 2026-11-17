import { CheckIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { datePreset } from '@/lib/dateRange';

/** 篩選面板的一組條件：標題與選項 */
export function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium">{label}</span>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}

export function FilterChip({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <Button type="button" variant={selected ? 'default' : 'outline'} className="h-9" aria-pressed={selected} onClick={onClick}>
      {selected && <CheckIcon />}
      {children}
    </Button>
  );
}

const PRESETS = [
  { key: 'today', label: '今天' },
  { key: 'week', label: '本週' },
  { key: 'month', label: '本月' },
] as const;

type DateRangeProps = {
  label: string;
  from: string;
  to: string;
  onChange: (range: { from: string; to: string }) => void;
};

/** 日期區間：今天／本週／本月快捷鈕與起迄日期 */
export function DateRangeFilter({ label, from, to, onChange }: DateRangeProps) {
  return (
    <FilterGroup label={label}>
      {PRESETS.map((p) => {
        const range = datePreset(p.key);
        return (
          <FilterChip key={p.key} selected={from === range.from && to === range.to} onClick={() => onChange(range)}>
            {p.label}
          </FilterChip>
        );
      })}
      <div className="flex w-full items-center gap-2 sm:w-auto">
        <Input
          type="date"
          aria-label={`${label}起`}
          className="h-9 min-w-0 flex-1 sm:w-40"
          value={from}
          onChange={(e) => onChange({ from: e.target.value, to })}
        />
        <span className="text-muted-foreground">～</span>
        <Input
          type="date"
          aria-label={`${label}迄`}
          className="h-9 min-w-0 flex-1 sm:w-40"
          value={to}
          onChange={(e) => onChange({ from, to: e.target.value })}
        />
      </div>
    </FilterGroup>
  );
}
