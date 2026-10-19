import { useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router';
import { PlusIcon, SearchIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import CustomerList from '@/components/CustomerList';
import { useCustomers } from '@/lib/customers';

/**
 * 首頁：目前只有客人搜尋（之後成為首頁搜尋的「客人」分頁）。
 * 關鍵字與頁碼放在網址（?q=&page=），從客人頁返回時保留搜尋結果。
 */
export default function HomePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const keyword = searchParams.get('q') ?? '';
  const page = Number(searchParams.get('page')) || 1;
  const [input, setInput] = useState(keyword);
  const { data, isPending, isFetching } = useCustomers(keyword, page);

  const search = (q: string, p: number) => {
    const next = new URLSearchParams();
    if (q) next.set('q', q);
    if (p > 1) next.set('page', String(p));
    setSearchParams(next);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    search(input.trim(), 1);
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

      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          type="search"
          enterKeyHint="search"
          className="h-10"
          placeholder="姓名、電話或 LINE ID"
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <Button type="submit" className="h-10 shrink-0">
          <SearchIcon />
          搜尋
        </Button>
      </form>

      {!keyword && <p className="-mt-2 text-sm text-muted-foreground">最近新增的客人</p>}
      <CustomerList data={data} isPending={isPending} isFetching={isFetching} onPageChange={(p) => search(keyword, p)} />
    </div>
  );
}
