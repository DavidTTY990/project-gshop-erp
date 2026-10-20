import { CheckCircle2Icon, Loader2Icon } from 'lucide-react';
import { cn } from '@/lib/utils';
import DeviceFields from '@/components/DeviceFields';
import { deviceLabel, normalizeSerial, useAllDevices, type Device, type DeviceInput } from '@/lib/devices';
import { dateOnly, useAllRepairs } from '@/lib/repairs';

/** 沿用客人送修過的機器，或輸入其他機器 */
export type DeviceChoice = { kind: 'existing'; device_id: string } | { kind: 'new'; device: DeviceInput } | null;

type Props = {
  customerId: string;
  value: DeviceChoice;
  onChange: (choice: DeviceChoice) => void;
  error?: string;
  deviceErrors?: Partial<Record<keyof DeviceInput, string>>;
  onBlurDeviceField?: (field: keyof DeviceInput) => void;
};

/** 這位客人送修過的機器（依最近一次送修排序） */
function usePastDevices(customerId: string) {
  const repairs = useAllRepairs();
  const devices = useAllDevices();
  const isPending = repairs.isPending || devices.isPending;

  const lastReceived = new Map<string, string>();
  for (const r of repairs.data ?? []) {
    if (r.customer_id !== customerId) continue;
    const prev = lastReceived.get(r.device_id);
    if (!prev || r.received_at > prev) lastReceived.set(r.device_id, r.received_at);
  }
  const past = (devices.data ?? [])
    .filter((d) => lastReceived.has(d.device_id))
    .map((d) => ({ device: d, lastReceived: lastReceived.get(d.device_id)! }))
    .sort((a, b) => b.lastReceived.localeCompare(a.lastReceived));

  return { past, isPending, devices: devices.data ?? [], repairs: repairs.data ?? [] };
}

export default function DevicePicker({ customerId, value, onChange, error, deviceErrors, onBlurDeviceField }: Props) {
  const { past, isPending, devices, repairs } = usePastDevices(customerId);

  // 輸入的序號已存在：建立時後端會沿用該機器（只顯示機器資料與維修次數，不顯示前一位客人）
  const serial = value?.kind === 'new' ? normalizeSerial(value.device.serial_no) : '';
  const matched: Device | undefined = serial ? devices.find((d) => normalizeSerial(d.serial_no) === serial) : undefined;
  const matchedCount = matched ? repairs.filter((r) => r.device_id === matched.device_id).length : 0;

  if (isPending) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2Icon className="size-4 animate-spin" />
        載入機器…
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {past.length > 0 && <p className="text-sm text-muted-foreground">這位客人送修過的機器</p>}
      <div className="grid gap-2 sm:grid-cols-2">
        {past.map(({ device, lastReceived }) => (
          <ChoiceButton
            key={device.device_id}
            selected={value?.kind === 'existing' && value.device_id === device.device_id}
            onClick={() => onChange({ kind: 'existing', device_id: device.device_id })}
          >
            <span className="font-medium">{deviceLabel(device)}</span>
            <span className="text-sm text-muted-foreground">
              {[device.serial_no && `序號 ${device.serial_no}`, `上次送修 ${dateOnly(lastReceived)}`]
                .filter(Boolean)
                .join('｜')}
            </span>
          </ChoiceButton>
        ))}
        <ChoiceButton
          selected={value?.kind === 'new'}
          onClick={() =>
            value?.kind !== 'new' &&
            onChange({ kind: 'new', device: { serial_no: '', device_type: '', brand: '', device_model: '', note: '' } })
          }
        >
          <span className="font-medium">{past.length > 0 ? '其他機器' : '輸入機器資料'}</span>
          <span className="text-sm text-muted-foreground">第一次送修的機器</span>
        </ChoiceButton>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}

      {value?.kind === 'new' && (
        <div className="flex flex-col gap-3 rounded-lg border p-3">
          <DeviceFields
            value={value.device}
            onChange={(device) => onChange({ kind: 'new', device })}
            errors={deviceErrors}
            onBlurField={onBlurDeviceField}
          />
          {matched && (
            <p className="flex items-start gap-2 rounded-md bg-green-50 p-2 text-sm text-green-800">
              <CheckCircle2Icon className="mt-0.5 size-4 shrink-0" />
              <span>
                已找到既有機器：{deviceLabel(matched)}｜共 {matchedCount} 筆維修紀錄。建立後會沿用這台機器，上方其他欄位不會套用。
              </span>
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function ChoiceButton({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        'flex min-h-16 flex-col items-start justify-center gap-0.5 rounded-lg border p-3 text-left hover:bg-accent',
        selected && 'border-primary ring-2 ring-primary/30',
      )}
    >
      {children}
    </button>
  );
}
