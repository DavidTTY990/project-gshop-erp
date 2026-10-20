import { useState } from 'react';
import { useSearchParams } from 'react-router';
import CustomerList from '@/components/CustomerList';
import SearchInput from '@/components/SearchInput';
import { searchCustomers, useAllCustomers } from '@/lib/customers';

/** 首頁「客人」分頁：前端即時搜尋；關鍵字與頁碼放在網址（?q=&page=） */
export default function CustomerSearch() {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Number(searchParams.get('page')) || 1;
  // 輸入框用自己的 state，避免網址更新延遲干擾中文輸入法
  const [keyword, setKeyword] = useState(searchParams.get('q') ?? '');
  const { data: customers, isPending, isFetching } = useAllCustomers();
  const data = customers && searchCustomers(customers, keyword, page);

  const search = (q: string, p: number, replace: boolean) => {
    const next = new URLSearchParams(searchParams);
    if (q.trim()) next.set('q', q);
    else next.delete('q');
    if (p > 1) next.set('page', String(p));
    else next.delete('page');
    setSearchParams(next, { replace });
  };

  const handleChange = (q: string) => {
    setKeyword(q);
    search(q, 1, true); // 打字時取代網址，不累積瀏覽紀錄
  };

  return (
    <div className="flex flex-col gap-4">
      <SearchInput value={keyword} onChange={handleChange} placeholder="姓名、電話或 LINE ID" />
      {!keyword.trim() && <p className="-mt-2 text-sm text-muted-foreground">最近新增的客人</p>}
      <CustomerList data={data} isPending={isPending} isFetching={isFetching} onPageChange={(p) => search(keyword, p, false)} />
    </div>
  );
}
