import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSettings } from '@/lib/api';

// Radix Select 不接受空字串選項，以此代表「未選擇」
const NONE = '__none__';

type Props = {
  /** Settings 分頁的欄名，例 'device_type'、'staff' */
  setting: string;
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** 提供「未選擇」選項時的文字，例「未指派」 */
  noneLabel?: string;
  invalid?: boolean;
  /** 選單關閉時呼叫（視同離開欄位）；觸發器本身的 onBlur 在選單展開時就會觸發，不適合用來檢核 */
  onBlur?: () => void;
};

/** 選項來自 Settings 分頁的下拉選單；目前值不在清單中時（例：選項已被刪除）仍會顯示 */
export default function SettingSelect({ setting, id, value, onChange, placeholder = '請選擇', noneLabel, invalid, onBlur }: Props) {
  const { data: settings } = useSettings();
  const options = settings?.[setting] ?? [];
  const all = value && !options.includes(value) ? [value, ...options] : options;

  return (
    <Select
      value={value || (noneLabel ? NONE : '')}
      onValueChange={(v) => onChange(v === NONE ? '' : v)}
      onOpenChange={(open) => !open && onBlur?.()}
    >
      <SelectTrigger id={id} className="h-10 w-full" aria-invalid={invalid}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {noneLabel && <SelectItem value={NONE}>{noneLabel}</SelectItem>}
        {all.map((o) => (
          <SelectItem key={o} value={o}>
            {o}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
