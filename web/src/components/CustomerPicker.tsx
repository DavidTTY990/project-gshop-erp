import { useState } from 'react';
import { Loader2Icon, PlusIcon, SearchIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import CustomerForm from '@/components/CustomerForm';
import { formatPhone, searchCustomers, useAllCustomers, useCreateCustomer, type Customer } from '@/lib/customers';

/** 選擇客人：即時搜尋既有客人，找不到時在彈出視窗新增 */
export default function CustomerPicker({ onSelect }: { onSelect: (customer: Customer) => void }) {
  const [keyword, setKeyword] = useState('');
  const [creating, setCreating] = useState(false);
  const { data: customers, isPending } = useAllCustomers();
  const create = useCreateCustomer();
  const results = customers && keyword.trim() ? searchCustomers(customers, keyword, 1).items : [];

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          className="h-10 pl-9"
          placeholder="輸入姓名、電話或 LINE ID 搜尋"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          autoFocus
        />
      </div>

      {isPending && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2Icon className="size-4 animate-spin" />
          載入客人…
        </p>
      )}
      {keyword.trim() && customers && results.length === 0 && (
        <p className="text-sm text-muted-foreground">找不到符合的客人</p>
      )}
      {results.length > 0 && (
        <ul className="flex flex-col gap-2">
          {results.map((c) => (
            <li key={c.customer_id}>
              <button
                type="button"
                onClick={() => onSelect(c)}
                className="flex w-full flex-col items-start gap-0.5 rounded-lg border p-3 text-left hover:bg-accent"
              >
                <span className="font-medium">{c.name}</span>
                <span className="text-sm text-muted-foreground">
                  {[formatPhone(c.phone), c.line_id && `LINE：${c.line_id}`].filter(Boolean).join('・')}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <Button type="button" variant="outline" className="h-10 self-start" onClick={() => setCreating(true)}>
        <PlusIcon />
        新增客人
      </Button>

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent className="max-h-[90svh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>新增客人</DialogTitle>
          </DialogHeader>
          <CustomerForm
            submitLabel="建立並選取"
            pending={create.isPending}
            error={create.error}
            onSubmit={(input) =>
              create.mutate(input, {
                onSuccess: (customer) => {
                  toast.success(`已建立客人「${customer.name}」`);
                  setCreating(false);
                  onSelect(customer);
                },
              })
            }
            onCancel={() => setCreating(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
