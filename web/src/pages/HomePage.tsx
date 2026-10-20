import { Link, useSearchParams } from 'react-router';
import { PlusIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import CustomerSearch from '@/components/CustomerSearch';
import RepairSearch from '@/components/RepairSearch';

type Tab = 'repairs' | 'customers';

/**
 * 首頁：依類型分頁搜尋（維修｜客人；之後加入訂單）。
 * 分頁放在網址 ?tab=，切換分頁時清除另一個分頁的搜尋條件。
 */
export default function HomePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab: Tab = searchParams.get('tab') === 'customers' ? 'customers' : 'repairs';

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <Tabs value={tab} onValueChange={(v) => setSearchParams(v === 'repairs' ? {} : { tab: v })}>
          <TabsList>
            <TabsTrigger value="repairs" className="px-4">
              維修
            </TabsTrigger>
            <TabsTrigger value="customers" className="px-4">
              客人
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <Button asChild variant="outline" className="h-9">
          <Link to={tab === 'repairs' ? '/repairs/new' : '/customers/new'}>
            <PlusIcon />
            {tab === 'repairs' ? '新增維修' : '新增客人'}
          </Link>
        </Button>
      </div>

      {/* 以分頁為 key：切換時重設輸入框 */}
      {tab === 'repairs' ? <RepairSearch key="repairs" /> : <CustomerSearch key="customers" />}
    </div>
  );
}
