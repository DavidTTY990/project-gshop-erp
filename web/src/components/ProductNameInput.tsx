import { Input } from '@/components/ui/input';
import { useProductSuggestions, type ProductSuggestion } from '@/lib/orders';

type Props = {
  id: string;
  value: string;
  onChange: (value: string) => void;
  /** 輸入的名稱與過去用過的名稱完全相同時呼叫，用來帶入上次的屬性 */
  onPick: (suggestion: ProductSuggestion) => void;
  onBlur?: () => void;
  invalid?: boolean;
};

const LIST_ID = 'product-name-suggestions';

/** 商品名稱：自由輸入，並以瀏覽器原生 datalist 提示過去用過的名稱（手機也能用） */
export function ProductNameInput({ id, value, onChange, onPick, onBlur, invalid }: Props) {
  const { data: suggestions } = useProductSuggestions();

  return (
    <Input
      id={id}
      list={LIST_ID}
      className="h-10"
      placeholder="例：薩爾達傳說 王國之淚"
      autoComplete="off"
      value={value}
      onChange={(e) => {
        const next = e.target.value;
        onChange(next);
        const hit = suggestions?.find((s) => s.product_name === next);
        if (hit) onPick(hit);
      }}
      onBlur={onBlur}
      aria-invalid={invalid}
    />
  );
}

/** 整頁共用一份 datalist，放在品項列表外 */
export function ProductSuggestionList() {
  const { data: suggestions } = useProductSuggestions();
  return (
    <datalist id={LIST_ID}>
      {suggestions?.map((s) => (
        <option key={s.product_name} value={s.product_name} />
      ))}
    </datalist>
  );
}
