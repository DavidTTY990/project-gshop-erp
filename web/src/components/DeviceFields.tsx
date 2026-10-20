import { Input } from '@/components/ui/input';
import FormField from '@/components/FormField';
import SettingSelect from '@/components/SettingSelect';
import type { DeviceInput } from '@/lib/devices';

type Props = {
  value: DeviceInput;
  onChange: (value: DeviceInput) => void;
  /** 要顯示的錯誤（呼叫端已依 onBlur／送出決定是否顯示） */
  errors?: Partial<Record<keyof DeviceInput, string>>;
  /** 欄位離開焦點時呼叫 */
  onBlurField?: (field: keyof DeviceInput) => void;
  /** 欄位 id 前綴，同一頁有多組欄位時避免重複 */
  idPrefix?: string;
};

/** 機器欄位（新增維修單的「其他機器」與編輯機器共用） */
export default function DeviceFields({ value, onChange, errors = {}, onBlurField, idPrefix = 'device' }: Props) {
  const set = (field: keyof DeviceInput) => (v: string) => onChange({ ...value, [field]: v });
  const id = (field: string) => `${idPrefix}-${field}`;

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <FormField id={id('type')} label="類型" required error={errors.device_type}>
        <SettingSelect
          id={id('type')}
          setting="device_type"
          value={value.device_type}
          onChange={set('device_type')}
          onBlur={() => onBlurField?.('device_type')}
          invalid={!!errors.device_type}
        />
      </FormField>
      <FormField id={id('brand')} label="品牌">
        <SettingSelect id={id('brand')} setting="brand" value={value.brand} onChange={set('brand')} noneLabel="未填" />
      </FormField>
      <FormField id={id('model')} label="機型">
        <Input
          id={id('model')}
          className="h-10"
          placeholder="例：Switch OLED"
          value={value.device_model}
          onChange={(e) => set('device_model')(e.target.value)}
        />
      </FormField>
      <FormField id={id('serial')} label="序號" error={errors.serial_no}>
        <Input
          id={id('serial')}
          className="h-10"
          autoCapitalize="characters"
          placeholder="沒有可留空"
          value={value.serial_no}
          onChange={(e) => set('serial_no')(e.target.value)}
          onBlur={() => onBlurField?.('serial_no')}
          aria-invalid={!!errors.serial_no}
        />
      </FormField>
      <div className="sm:col-span-2">
        <FormField id={id('note')} label="機器備註">
          <Input
            id={id('note')}
            className="h-10"
            placeholder="例：外殼貼紙、顏色等辨識特徵"
            value={value.note}
            onChange={(e) => set('note')(e.target.value)}
          />
        </FormField>
      </div>
    </div>
  );
}
