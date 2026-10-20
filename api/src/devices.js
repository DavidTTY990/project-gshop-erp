/** Devices：機器。不記錄客人，「客人送修過哪些機器」由 Repairs 的 customer_id + device_id 查出 */

const DEVICE_FIELDS = ['serial_no', 'device_type', 'brand', 'device_model', 'note'];

/** 序號正規化：轉大寫、去除空白與連字號，例 'xaw-1234 5' → 'XAW12345' */
function normalizeSerial(serial) {
  return String(serial ?? '').toUpperCase().replace(/[\s-]/g, '');
}

function normalizeDevice(d) {
  const device = { ...d, device_id: String(d.device_id) };
  DEVICE_FIELDS.forEach(f => (device[f] = String(d[f] ?? '')));
  return device;
}

function readDevices() {
  return readSheet('Devices').map(normalizeDevice);
}

function allDevices() {
  return readDevices();
}

/** 只取白名單欄位並整理、驗證 */
function validateDevice(params) {
  const data = {};
  DEVICE_FIELDS.forEach(f => (data[f] = toText(params[f])));
  data.serial_no = normalizeSerial(data.serial_no);
  if (!data.device_type) throw new AppError('請選擇機器類型', 'VALIDATION');
  return data;
}

/**
 * 有序號且已有相同序號的機器時沿用（例：二手機換了主人），否則新增。
 * 需在 withLock 內呼叫；devices 為目前全部機器。
 */
function findOrCreateDevice(devices, params) {
  const data = validateDevice(params);
  if (data.serial_no) {
    const existing = devices.find(d => normalizeSerial(d.serial_no) === data.serial_no);
    if (existing) return existing;
  }
  const now = new Date();
  const device = {
    device_id: nextId('D', devices.map(d => d.device_id)),
    ...data,
    created_at: now,
    updated_at: now,
  };
  appendRecord('Devices', device);
  return device;
}

/** 編輯機器（影響這台機器的所有維修單）；序號不可與其他機器重複 */
function updateDevice(params) {
  const id = String(params.id || '');
  const data = validateDevice(params);
  return withLock(() => {
    const devices = readDevices();
    if (!devices.some(d => d.device_id === id)) throw new AppError('找不到機器', 'NOT_FOUND');
    const dup = data.serial_no && devices.find(d => normalizeSerial(d.serial_no) === data.serial_no && d.device_id !== id);
    if (dup) throw new AppError('此序號已登記為另一台機器', 'DUPLICATE_SERIAL', { device_id: dup.device_id });
    return normalizeDevice(updateRecord('Devices', 'device_id', id, { ...data, updated_at: new Date() }));
  });
}

function test_allDevices() {
  console.log(JSON.stringify(allDevices(), null, 2));
}

function test_normalizeSerial() {
  console.log(normalizeSerial(' xaw-1234 5 '));
}
