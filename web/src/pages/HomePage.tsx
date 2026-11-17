import { Link, useSearchParams } from 'react-router';
import { PlusIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import CustomerSearch from '@/components/CustomerSearch';
import OrderSearch from '@/components/OrderSearch';
import RepairSearch from '@/components/RepairSearch';

type Tab = 'repairs' | 'orders' | 'customers';

const TABS: Record<Tab, { label: string; newPath: string; newLabel: string }> = {
  repairs: { label: '維修', newPath: '/repairs/new', newLabel: '新增維修' },
  orders: { label: '訂單', newPath: '/orders/new', newLabel: '新增訂單' },
  customers: { label: '客人', newPath: '/customers/new', newLabel: '新增客人' },
};

/**
 * 首頁：依類型分頁搜尋（維修｜訂單｜客人）。
 * 分頁放在網址 ?tab=（預設維修），切換分頁時清除其他分頁的搜尋條件。
 */
export default function HomePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const param = searchParams.get('tab');
  const tab: Tab = param === 'orders' || param === 'customers' ? param : 'repairs';

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <Tabs value={tab} onValueChange={(v) => setSearchParams(v === 'repairs' ? {} : { tab: v })}>
          <TabsList>
            {(Object.keys(TABS) as Tab[]).map((t) => (
              <TabsTrigger key={t} value={t} className="px-4">
                {TABS[t].label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <Button asChild variant="outline" className="h-9">
          <Link to={TABS[tab].newPath}>
            <PlusIcon />
            {TABS[tab].newLabel}
          </Link>
        </Button>
      </div>

      {/* 以分頁為 key：切換時重設輸入框 */}
      {tab === 'repairs' && <RepairSearch key="repairs" />}
      {tab === 'orders' && <OrderSearch key="orders" />}
      {tab === 'customers' && <CustomerSearch key="customers" />}
    </div>
  );
}
