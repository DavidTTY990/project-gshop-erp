import { useAllDevices, type Device } from './devices';
import { useAllRepairs, type Repair } from './repairs';

export type PastDevice = { device: Device; lastRepair: Repair; repairCount: number };

/**
 * 客人的維修紀錄（收件時間新到舊）與送修過的機器（依最近一次送修排序）。
 * Devices 不記錄客人，由 Repairs 的 customer_id + device_id 推出。
 */
export function useCustomerHistory(customerId: string) {
  const repairsQuery = useAllRepairs();
  const devicesQuery = useAllDevices();
  const allRepairs = repairsQuery.data ?? [];
  const allDevices = devicesQuery.data ?? [];

  const repairs = allRepairs
    .filter((r) => r.customer_id === customerId)
    .sort((a, b) => b.received_at.localeCompare(a.received_at));

  const byDevice = new Map<string, PastDevice>();
  const deviceById = new Map(allDevices.map((d) => [d.device_id, d]));
  for (const r of repairs) {
    const device = deviceById.get(r.device_id);
    if (!device) continue;
    const entry = byDevice.get(r.device_id);
    // repairs 已是新到舊，第一筆即最近一次送修
    if (entry) entry.repairCount += 1;
    else byDevice.set(r.device_id, { device, lastRepair: r, repairCount: 1 });
  }

  return {
    repairs,
    pastDevices: [...byDevice.values()],
    allRepairs,
    allDevices,
    isPending: repairsQuery.isPending || devicesQuery.isPending,
  };
}
