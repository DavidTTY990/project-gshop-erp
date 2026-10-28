import { PlusIcon, Trash2Icon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import FormField from '@/components/FormField';
import { ProductNameInput, ProductSuggestionList } from '@/components/ProductNameInput';
import SettingSelect from '@/components/SettingSelect';
import { lineTotal } from '@/lib/orders';
import { formatMoney } from '@/lib/repairs';
import { newItemRow, type OrderItemInput, type OrderItemRow } from '@/lib/orders';

export type ItemField = 'product_name' | 'category' | 'unit_price' | 'qty';

type Props = {
  items: OrderItemRow[];
  onChange: (items: OrderItemRow[]) => void;
  /** 要顯示的錯誤（呼叫端依 onBlur／送出決定） */
  error: (uid: string, field: ItemField) => string | undefined;
  onBlurField: (uid: string, field: ItemField) => void;
};

/** 訂單品項：每個品項一張卡片，lg 以上欄位排成一列 */
export default function OrderItemsEditor({ items, onChange, error, onBlurField }: Props) {
  const update = (uid: string, patch: Partial<OrderItemInput>) =>
    onChange(items.map((item) => (item.uid === uid ? { ...item, ...patch } : item)));

  return (
    <div className="flex flex-col gap-3">
      <ProductSuggestionList />
      {items.map((item, i) => {
        const id = (f: string) => `item-${item.uid}-${f}`;
        const err = (f: ItemField) => error(item.uid, f);
        const blur = (f: ItemField) => () => onBlurField(item.uid, f);
        return (
          <div key={item.uid} className="flex flex-col gap-3 rounded-lg border p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">品項 {i + 1}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon-lg"
                aria-label={`刪除品項 ${i + 1}`}
                disabled={items.length === 1}
                onClick={() => onChange(items.filter((x) => x.uid !== item.uid))}
              >
                <Trash2Icon />
              </Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr]">
              <FormField id={id('name')} label="商品名稱" required error={err('product_name')}>
                <ProductNameInput
                  id={id('name')}
                  value={item.product_name}
                  onChange={(v) => update(item.uid, { product_name: v })}
                  onPick={(s) =>
                    update(item.uid, {
                      product_name: s.product_name,
                      category: s.category,
                      platform: s.platform,
                      condition: s.condition || item.condition,
                      unit_price: String(s.unit_price),
                    })
                  }
                  onBlur={blur('product_name')}
                  invalid={!!err('product_name')}
                />
              </FormField>
              <FormField id={id('category')} label="類別" required error={err('category')}>
                <SettingSelect
                  id={id('category')}
                  setting="category"
                  value={item.category}
                  onChange={(v) => update(item.uid, { category: v })}
                  onBlur={blur('category')}
                  invalid={!!err('category')}
                />
              </FormField>
              <FormField id={id('platform')} label="平台">
                <SettingSelect
                  id={id('platform')}
                  setting="platform"
                  value={item.platform}
                  onChange={(v) => update(item.uid, { platform: v })}
                  noneLabel="不適用"
                />
              </FormField>
              <FormField id={id('condition')} label="商品狀態">
                <SettingSelect
                  id={id('condition')}
                  setting="condition"
                  value={item.condition}
                  onChange={(v) => update(item.uid, { condition: v })}
                />
              </FormField>
            </div>
            <div className="grid grid-cols-[1fr_6rem] items-start gap-3 sm:grid-cols-[1fr_6rem_1fr]">
              <FormField id={id('price')} label="單價" required error={err('unit_price')}>
                <Input
                  id={id('price')}
                  inputMode="numeric"
                  className="h-10"
                  placeholder="0 為贈品"
                  value={item.unit_price}
                  onChange={(e) => update(item.uid, { unit_price: e.target.value.trim() })}
                  onBlur={blur('unit_price')}
                  aria-invalid={!!err('unit_price')}
                />
              </FormField>
              <FormField id={id('qty')} label="數量" required error={err('qty')}>
                <Input
                  id={id('qty')}
                  inputMode="numeric"
                  className="h-10"
                  value={item.qty}
                  onChange={(e) => update(item.uid, { qty: e.target.value.trim() })}
                  onBlur={blur('qty')}
                  aria-invalid={!!err('qty')}
                />
              </FormField>
              <div className="col-span-2 flex items-baseline justify-end gap-2 text-sm sm:col-span-1 sm:h-full sm:items-end sm:pb-2.5">
                <span className="text-muted-foreground">小計</span>
                <span className="text-base font-medium">{formatMoney(lineTotal(item))}</span>
              </div>
            </div>
          </div>
        );
      })}
      <Button type="button" variant="outline" className="h-10 self-start" onClick={() => onChange([...items, newItemRow()])}>
        <PlusIcon />
        新增品項
      </Button>
    </div>
  );
}
