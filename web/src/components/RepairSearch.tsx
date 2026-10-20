import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { SlidersHorizontalIcon, XIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import RepairFilterPanel from '@/components/RepairFilterPanel';
import RepairList from '@/components/RepairList';
import SearchInput from '@/components/SearchInput';
import { useAllCustomers } from '@/lib/customers';
import { useAllDevices } from '@/lib/devices';
import {
  countActiveFilters,
  EMPTY_FILTERS,
  parseRepairFilters,
  searchRepairs,
  writeRepairFilters,
  type RepairFilters,
} from '@/lib/repairSearch';
import { useAllRepairs } from '@/lib/repairs';

/** 首頁「維修」分頁：關鍵字＋條件篩選，全部在前端處理；條件與頁碼放在網址 */
export default function RepairSearch() {
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = parseRepairFilters(searchParams);
  const page = Number(searchParams.get('page')) || 1;
  // 輸入框用自己的 state，避免網址更新延遲干擾中文輸入法
  const [keyword, setKeyword] = useState(filters.q);
  const active = countActiveFilters(filters);
  // 有條件時預設展開，讓使用者看得到目前套用了什麼
  const [panelOpen, setPanelOpen] = useState(active > 0);

  const repairs = useAllRepairs();
  const customers = useAllCustomers();
  const devices = useAllDevices();
  const data =
    repairs.data && customers.data && devices.data
      ? searchRepairs(repairs.data, customers.data, devices.data, { ...filters, q: keyword }, page)
      : undefined;

  const update = (next: RepairFilters, p: number, replace: boolean) => {
    const params = new URLSearchParams(searchParams);
    writeRepairFilters(params, next);
    if (p > 1) params.set('page', String(p));
    else params.delete('page');
    setSearchParams(params, { replace });
  };

  const handleKeyword = (q: string) => {
    setKeyword(q);
    update({ ...filters, q }, 1, true);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <SearchInput value={keyword} onChange={handleKeyword} placeholder="單號、客人、電話、序號、機型、問題" />
        <Button
          variant={panelOpen ? 'secondary' : 'outline'}
          className="h-10 shrink-0"
          aria-label={active > 0 ? `篩選（已套用 ${active} 項）` : '篩選'}
          aria-expanded={panelOpen}
          onClick={() => setPanelOpen((o) => !o)}
        >
          <SlidersHorizontalIcon />
          <span className="hidden sm:inline">篩選</span>
          {active > 0 && <Badge className="h-5 min-w-5 px-1">{active}</Badge>}
        </Button>
      </div>

      {panelOpen && <RepairFilterPanel value={filters} onChange={(next) => update({ ...next, q: keyword }, 1, false)} />}

      {active > 0 && (
        <Button
          variant="ghost"
          className="-mt-2 h-8 self-start px-2 text-muted-foreground"
          onClick={() => update({ ...EMPTY_FILTERS, q: keyword }, 1, false)}
        >
          <XIcon />
          清除篩選（{active}）
        </Button>
      )}

      <RepairList
        data={data}
        isPending={repairs.isPending || customers.isPending || devices.isPending}
        isFetching={repairs.isFetching || customers.isFetching || devices.isFetching}
        onPageChange={(p) => update({ ...filters, q: keyword }, p, false)}
      />
    </div>
  );
}
