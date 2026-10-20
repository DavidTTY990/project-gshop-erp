import { useMutation, useQuery } from '@tanstack/react-query';
import { callApi } from './api';
import { queryClient } from './queryClient';

export type Device = {
  device_id: string;
  serial_no: string;
  device_type: string;
  brand: string;
  device_model: string;
  note: string;
  created_at: string;
  updated_at: string;
};

/** 新增／編輯機器的欄位 */
export type DeviceInput = Pick<Device, 'serial_no' | 'device_type' | 'brand' | 'device_model' | 'note'>;

export const EMPTY_DEVICE: DeviceInput = { serial_no: '', device_type: '', brand: '', device_model: '', note: '' };

export const DEVICES_KEY = ['devices', 'all'];

/** 序號正規化：轉大寫、去除空白與連字號（與後端 normalizeSerial 相同） */
export function normalizeSerial(serial: string) {
  return serial.toUpperCase().replace(/[\s-]/g, '');
}

/** 顯示用名稱，例「Nintendo Switch OLED」；沒有機型時顯示類型 */
export function deviceLabel(d: Pick<Device, 'brand' | 'device_model' | 'device_type'>) {
  return [d.brand, d.device_model || d.device_type].filter(Boolean).join(' ');
}

export function useAllDevices() {
  return useQuery({
    queryKey: DEVICES_KEY,
    queryFn: () => callApi<Device[]>('allDevices'),
  });
}

/** 新增或編輯後更新全部機器的快取 */
export function upsertDeviceCache(device: Device) {
  queryClient.setQueryData<Device[]>(DEVICES_KEY, (list) => {
    if (!list) return list;
    const exists = list.some((d) => d.device_id === device.device_id);
    return exists ? list.map((d) => (d.device_id === device.device_id ? device : d)) : [...list, device];
  });
}

export function useUpdateDevice(id: string) {
  return useMutation({
    mutationFn: (input: DeviceInput) => callApi<Device>('updateDevice', { id, ...input }),
    onSuccess: (device) => {
      upsertDeviceCache(device);
      // 維修單詳情內含機器資料，一併更新
      queryClient.setQueriesData<RepairDetailLike>({ queryKey: ['repairs', 'detail'] }, (detail) =>
        detail && detail.device?.device_id === device.device_id ? { ...detail, device } : detail,
      );
    },
  });
}

type RepairDetailLike = { device: Device | null };
