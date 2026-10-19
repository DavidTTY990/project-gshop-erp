/**
 * Settings 分頁：每一欄是一種下拉選項，第 1 列為欄名，往下每列一個選項值（各欄長度可不同）。
 * 回傳 { staff: ['小明', ...], category: [...], ... }，略過空白儲存格。
 */
function getSettings() {
  const sheet = SpreadsheetApp.getActive().getSheetByName('Settings');
  if (!sheet) throw new Error('找不到分頁：Settings');

  const [headers, ...rows] = sheet.getDataRange().getValues();
  const settings = {};
  headers.forEach((h, i) => {
    if (h === '') return;
    settings[h] = rows.map(row => String(row[i]).trim()).filter(v => v !== '');
  });
  return settings;
}

function test_getSettings() {
  console.log(JSON.stringify(getSettings(), null, 2));
}
