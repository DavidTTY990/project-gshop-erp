/** Repairs／RepairLogs：維修單的新增、編輯與狀態變更 */

/** 建立後可在詳情頁編輯的欄位（狀態只能經 changeRepairStatus 變更） */
const REPAIR_TEXT_FIELDS = ['issue', 'accessories', 'intake_condition', 'diagnosis', 'handler', 'note'];

/**
 * 依狀態名稱自動處理時間欄位；狀態值來自 Settings 的 repair_status，改名時需同步修改這裡。
 * - 完成：填入 completed_at（已有則保留）
 * - 處理中：清除 completed_at（例：可取件後發現還沒修好）
 */
const REPAIR_INITIAL_STATUS = '已收件';
const REPAIR_COMPLETED_STATUSES = ['可取件', '無法維修'];
const REPAIR_PICKED_UP_STATUS = '已取件';
const REPAIR_ACTIVE_STATUSES = ['已收件', '檢測中', '待報價', '待零件', '維修中'];

function normalizeRepair(r) {
  const repair = { ...r };
  ['repair_id', 'customer_id', 'device_id', 'status', ...REPAIR_TEXT_FIELDS].forEach(f => (repair[f] = String(r[f] ?? '')));
  repair.quote_amount = toAmount(r.quote_amount);
  repair.final_amount = toAmount(r.final_amount);
  repair.deposit = toAmount(r.deposit) ?? 0;
  repair.is_paid = toBool(r.is_paid);
  return repair;
}

function readRepairs() {
  return readSheet('Repairs').map(normalizeRepair);
}

function readRepairLogs() {
  return readSheet('RepairLogs').map(l => ({
    ...l,
    log_id: String(l.log_id),
    repair_id: String(l.repair_id),
    status: String(l.status),
    note: String(l.note ?? ''),
    staff: String(l.staff ?? ''),
  }));
}

function allRepairs() {
  return readRepairs();
}

/** 維修單、機器與歷程（新到舊） */
function getRepair({ id }) {
  const repair = readRepairs().find(r => r.repair_id === String(id));
  if (!repair) throw new AppError('找不到維修單', 'NOT_FOUND');
  const device = readDevices().find(d => d.device_id === repair.device_id) || null;
  const logs = readRepairLogs()
    .filter(l => l.repair_id === repair.repair_id)
    .reverse();
  return { repair, device, logs };
}

/** 驗證可編輯欄位；回傳可寫入的物件 */
function validateRepairFields(params) {
  const data = {};
  REPAIR_TEXT_FIELDS.forEach(f => (data[f] = toText(params[f])));
  if (!data.issue) throw new AppError('請填寫問題描述', 'VALIDATION');
  data.quote_amount = parseAmount(params.quote_amount, '報價');
  data.final_amount = parseAmount(params.final_amount, '總金額');
  data.deposit = parseAmount(params.deposit, '訂金') ?? 0;
  data.estimated_done_date = parseDate(params.estimated_done_date, '預計完成日');
  return data;
}

function requireStaff(staff) {
  const s = toText(staff);
  if (!s) throw new AppError('缺少目前店員，請重新登入', 'VALIDATION');
  return s;
}

function appendRepairLog(repairId, status, note, staff, now) {
  const log = {
    log_id: nextId('L', readRepairLogs().map(l => l.log_id)),
    repair_id: repairId,
    status,
    note: toText(note),
    staff,
    created_at: now,
  };
  appendRecord('RepairLogs', log);
  return log;
}

/**
 * 新增維修單：params 含 customer_id、device_id（沿用既有機器）或 device（新機器資料）、收件欄位、staff。
 * 狀態固定為「已收件」，並寫入第一筆 RepairLogs（staff 為收件人）。
 */
function createRepair(params) {
  const staff = requireStaff(params.staff);
  const data = validateRepairFields(params);
  data.final_amount = null;  // 收件時尚無總金額
  const customerId = String(params.customer_id || '');

  return withLock(() => {
    if (!readCustomers().some(c => c.customer_id === customerId)) throw new AppError('找不到客人', 'NOT_FOUND');

    const devices = readDevices();
    let device;
    if (params.device_id) {
      device = devices.find(d => d.device_id === String(params.device_id));
      if (!device) throw new AppError('找不到機器', 'NOT_FOUND');
    } else {
      device = findOrCreateDevice(devices, params.device || {});
    }

    const now = new Date();
    const repair = normalizeRepair({
      repair_id: nextId('R', readRepairs().map(r => r.repair_id)),
      customer_id: customerId,
      device_id: device.device_id,
      received_at: now,
      status: REPAIR_INITIAL_STATUS,
      ...data,
      is_paid: false,
      completed_at: '',
      picked_up_at: '',
      created_at: now,
      updated_at: now,
    });
    appendRecord('Repairs', repair);
    const log = appendRepairLog(repair.repair_id, REPAIR_INITIAL_STATUS, '收件', staff, now);
    return { repair, device, logs: [log] };
  });
}

/** 編輯維修單欄位（不含狀態、客人、機器、收件時間），不寫 RepairLogs */
function updateRepair(params) {
  const id = String(params.id || '');
  const data = validateRepairFields(params);
  data.is_paid = toBool(params.is_paid);
  return withLock(() => {
    if (!readRepairs().some(r => r.repair_id === id)) throw new AppError('找不到維修單', 'NOT_FOUND');
    return normalizeRepair(updateRecord('Repairs', 'repair_id', id, { ...data, updated_at: new Date() }));
  });
}

/**
 * 變更狀態並寫入 RepairLogs；依狀態自動填入／清除 completed_at、填入 picked_up_at。
 * mark_paid 為 true 時同時標記已付清（取件時收款）。
 */
function changeRepairStatus(params) {
  const id = String(params.id || '');
  const status = toText(params.status);
  const staff = requireStaff(params.staff);
  if (!(getSettings().repair_status || []).includes(status)) throw new AppError(`無效的狀態：${status}`, 'VALIDATION');

  return withLock(() => {
    const current = readRepairs().find(r => r.repair_id === id);
    if (!current) throw new AppError('找不到維修單', 'NOT_FOUND');

    const now = new Date();
    const patch = { status, updated_at: now };
    if (REPAIR_COMPLETED_STATUSES.includes(status) && !current.completed_at) patch.completed_at = now;
    if (REPAIR_ACTIVE_STATUSES.includes(status)) patch.completed_at = '';
    if (status === REPAIR_PICKED_UP_STATUS) {
      patch.picked_up_at = now;
      if (!current.completed_at) patch.completed_at = now;
    }
    if (params.mark_paid) patch.is_paid = true;

    const repair = normalizeRepair(updateRecord('Repairs', 'repair_id', id, patch));
    const log = appendRepairLog(id, status, params.note, staff, now);
    return { repair, log };
  });
}

function test_allRepairs() {
  console.log(JSON.stringify(allRepairs(), null, 2));
}

function test_createRepair() {
  const [customer] = readCustomers();
  const result = createRepair({
    customer_id: customer.customer_id,
    device: { device_type: '主機', brand: 'Nintendo', device_model: 'Switch OLED', serial_no: 'test-001' },
    issue: '測試：無法開機',
    deposit: 500,
    estimated_done_date: '2026-12-31',
    staff: '測試',
  });
  console.log(JSON.stringify(result, null, 2));
}

function test_changeRepairStatus() {
  const repairs = readRepairs();
  const last = repairs[repairs.length - 1];
  console.log(JSON.stringify(changeRepairStatus({ id: last.repair_id, status: '檢測中', note: '測試', staff: '測試' }), null, 2));
}
