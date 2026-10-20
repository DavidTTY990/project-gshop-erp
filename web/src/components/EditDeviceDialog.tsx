import { useState } from 'react';
import { Loader2Icon } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import DeviceFields from '@/components/DeviceFields';
import { ApiError } from '@/lib/apiError';
import { useUpdateDevice, type Device, type DeviceInput } from '@/lib/devices';
import { useFieldErrors } from '@/lib/useFieldErrors';

type Props = { device: Device; open: boolean; onOpenChange: (open: boolean) => void };

/** 編輯機器資料（影響這台機器的所有維修單）；父元件以 {open && …} 渲染，每次開啟都從目前資料開始 */
export default function EditDeviceDialog({ device, open, onOpenChange }: Props) {
  const [values, setValues] = useState<DeviceInput>(() => ({
    serial_no: device.serial_no,
    device_type: device.device_type,
    brand: device.brand,
    device_model: device.device_model,
    note: device.note,
  }));
  const field = useFieldErrors({ device_type: values.device_type ? undefined : '請選擇機器類型' });
  const update = useUpdateDevice(device.device_id);
  const duplicate = update.error instanceof ApiError && update.error.code === 'DUPLICATE_SERIAL';

  // 父元件只在開啟時渲染，關閉後狀態自然清空
  const close = (next: boolean) => {
    if (!update.isPending) onOpenChange(next);
  };

  const save = () => {
    if (!field.submit()) return;
    update.mutate(values, {
      onSuccess: () => {
        toast.success('機器資料已更新');
        onOpenChange(false);
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-h-[90svh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>編輯機器</DialogTitle>
          <DialogDescription>修改會套用到這台機器的所有維修單。</DialogDescription>
        </DialogHeader>
        <DeviceFields
          idPrefix="edit-device"
          value={values}
          onChange={setValues}
          errors={{ device_type: field.error('device_type'), serial_no: duplicate ? '此序號已登記為另一台機器' : undefined }}
          onBlurField={(f) => f === 'device_type' && field.touch('device_type')()}
        />
        <DialogFooter>
          <Button className="h-10" disabled={update.isPending} onClick={save}>
            {update.isPending && <Loader2Icon className="animate-spin" />}
            儲存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
