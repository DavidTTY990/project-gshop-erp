import { useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router';
import { PlusIcon, SearchIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import CustomerList from '@/components/CustomerList';
import { searchCustomers, useAllCustomers } from '@/lib/customers';

/**
 * 首頁：目前只有客人搜尋（之後成為首頁搜尋的「客人」分頁）。
 * 邊打字邊在前端搜尋；關鍵字與頁碼放在網址（?q=&page=），從客人頁返回時保留搜尋結果。
 */
export default function HomePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Number(searchParams.get('page')) || 1;
  // 輸入框用自己的 state，避免網址更新延遲干擾中文輸入法
  const [keyword, setKeyword] = useState(searchParams.get('q') ?? '');
  const { data: customers, isPending, isFetching } = useAllCustomers();
  const data = customers && searchCustomers(customers, keyword, page);

  const search = (q: string, p: number, replace: boolean) => {
    const next = new URLSearchParams();
    if (q.trim()) next.set('q', q);
    if (p > 1) next.set('page', String(p));
    setSearchParams(next, { replace });
  };

  const handleChange = (q: string) => {
    setKeyword(q);
    search(q, 1, true); // 打字時取代網址，不累積瀏覽紀錄
  };

  // 鍵盤上的「搜尋」只收起鍵盤
  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    (document.activeElement as HTMLElement | null)?.blur();
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">客人</h1>
        <Button asChild variant="outline" className="h-9">
          <Link to="/customers/new">
            <PlusIcon />
            新增客人
          </Link>
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="relative">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          enterKeyHint="search"
          className="h-10 pl-9"
          placeholder="姓名、電話或 LINE ID"
          value={keyword}
          onChange={(e) => handleChange(e.target.value)}
        />
      </form>

      {!keyword.trim() && <p className="-mt-2 text-sm text-muted-foreground">最近新增的客人</p>}
      <CustomerList data={data} isPending={isPending} isFetching={isFetching} onPageChange={(p) => search(keyword, p, false)} />
    </div>
  );
}
