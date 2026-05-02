// ===== 家計簿スキャナー - Google Apps Script =====

const SHEET_NAME = '全データ';

function doGet(e) {
  const action = e.parameter.action;
  if (action === 'add') return addRecord(e.parameter);
  if (action === 'list') return getRecords();
  if (action === 'info') return getInfo();
  if (action === 'delete') return deleteRecord(e.parameter);
  if (action === 'update') return updateRecord(e.parameter);
  return ContentService.createTextOutput('家計簿API').setMimeType(ContentService.MimeType.TEXT);
}

function doPost(e) {
  const data = JSON.parse(e.postData.contents);
  if (data.action === 'batchAdd') return batchAddRecords(data.records);
  return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'unknown action' }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ===== レコード追加 =====

function addRecord(params) {
  const sheet = getSheet();
  const lastRow = sheet.getLastRow();
  const torihikiId = lastRow;
  const serviceId = params.serviceId ? Number(params.serviceId) : (() => {
    const rows = sheet.getLastRow() > 1 ? sheet.getRange(2, 2, sheet.getLastRow() - 1, 1).getValues() : [];
    return rows.reduce((max, r) => Math.max(max, Number(r[0]) || 0), 0) + 1;
  })();
  const quantity = params.quantity ? Number(params.quantity) : '';

  sheet.appendRow([
    torihikiId,
    serviceId,
    params.date || '',
    params.service || '購入',
    params.category1 || '',
    params.category2 || '',
    params.store || '',
    Number(params.amount) || 0,
    params.payment1 || '',
    params.payment2 || '',
    new Date(),
    quantity,
  ]);

  return ContentService
    .createTextOutput(JSON.stringify({ status: 'ok', torihikiId, serviceId }))
    .setMimeType(ContentService.MimeType.JSON);
}

function batchAddRecords(records) {
  const sheet = getSheet();
  const startRow = sheet.getLastRow() + 1;
  const now = new Date();

  const rows = records.map((r, i) => {
    const torihikiId = startRow - 1 + i;
    const serviceId = r.serviceId != null ? r.serviceId : torihikiId;
    return [
      torihikiId,
      serviceId,
      r.date || '',
      r.service || '購入',
      r.category1 || '',
      r.category2 || '',
      r.store || '',
      Number(r.amount) || 0,
      r.payment1 || '',
      r.payment2 || '',
      now,
      r.quantity ? Number(r.quantity) : '',
    ];
  });

  if (rows.length > 0) {
    sheet.getRange(startRow, 1, rows.length, 12).setValues(rows);
  }

  return ContentService
    .createTextOutput(JSON.stringify({ status: 'ok', count: rows.length }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ===== レコード更新 =====

function updateRecord(params) {
  const sheet = getSheet();
  const targetId = Number(params.id);
  const lastRow = sheet.getLastRow();

  for (let i = 2; i <= lastRow; i++) {
    if (Number(sheet.getRange(i, 1).getValue()) !== targetId) continue;

    if (params.date      !== undefined) sheet.getRange(i, 3).setValue(params.date);
    if (params.service   !== undefined) sheet.getRange(i, 4).setValue(params.service);
    if (params.category1 !== undefined) sheet.getRange(i, 5).setValue(params.category1);
    if (params.category2 !== undefined) sheet.getRange(i, 6).setValue(params.category2);
    if (params.store     !== undefined) sheet.getRange(i, 7).setValue(params.store);
    if (params.amount    !== undefined) sheet.getRange(i, 8).setValue(Number(params.amount) || 0);
    if (params.payment1  !== undefined) sheet.getRange(i, 9).setValue(params.payment1);
    if (params.payment2  !== undefined) sheet.getRange(i, 10).setValue(params.payment2);
    if (params.quantity  !== undefined) sheet.getRange(i, 12).setValue(params.quantity !== '' ? Number(params.quantity) : '');

    return ContentService
      .createTextOutput(JSON.stringify({ status: 'ok' }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  return ContentService
    .createTextOutput(JSON.stringify({ status: 'error', message: 'not found' }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ===== レコード削除 =====

function deleteRecord(params) {
  const sheet = getSheet();
  const targetId = Number(params.id);
  const lastRow = sheet.getLastRow();
  for (let i = lastRow; i >= 2; i--) {
    if (Number(sheet.getRange(i, 1).getValue()) === targetId) {
      sheet.deleteRow(i);
      return ContentService
        .createTextOutput(JSON.stringify({ status: 'ok' }))
        .setMimeType(ContentService.MimeType.JSON);
    }
  }
  return ContentService
    .createTextOutput(JSON.stringify({ status: 'error', message: 'not found' }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ===== データ取得 =====

function getInfo() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = getSheet();
  const count = Math.max(0, sheet.getLastRow() - 1);
  return ContentService
    .createTextOutput(JSON.stringify({
      status: 'ok',
      spreadsheetName: ss.getName(),
      spreadsheetId: ss.getId(),
      sheetName: SHEET_NAME,
      recordCount: count,
      url: ss.getUrl()
    }))
    .setMimeType(ContentService.MimeType.JSON);
}

function getRecords() {
  const sheet = getSheet();
  const rows = sheet.getDataRange().getValues();

  const tz = Session.getScriptTimeZone();
  const records = rows.slice(1).map(row => ({
    id: row[0],
    serviceId: row[1],
    date: row[2] instanceof Date
      ? Utilities.formatDate(row[2], tz, 'yyyy-MM-dd')
      : String(row[2] || '').slice(0, 10),
    service: row[3],
    category1: row[4],
    category2: row[5],
    store: row[6],
    amount: row[7],
    payment1: row[8],
    payment2: row[9],
    quantity: row[11] || '',
  })).reverse();

  return ContentService
    .createTextOutput(JSON.stringify({ status: 'ok', records }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ===== 既存データ移行 =====

function migrateShisanAdd() {
  const sheet = getSheet();
  const rows = sheet.getDataRange().getValues();
  let count = 0;

  for (let i = 1; i < rows.length; i++) {
    if (rows[i][3] !== '資産追加') continue;
    const oldCategory2 = rows[i][5]; // 品目2（旧: 資産名）
    const oldQuantity  = rows[i][11]; // 数量（旧）
    const hasNewFormat = rows[i][8] !== ''; // payment1 に既に値があれば新形式

    if (hasNewFormat) continue;
    if (!oldCategory2) continue;

    sheet.getRange(i + 1, 5).setValue('');                          // category1 → ''
    sheet.getRange(i + 1, 6).setValue('');                          // category2 → ''
    sheet.getRange(i + 1, 8).setValue(Number(oldQuantity) || 0);   // amount ← 旧quantity
    sheet.getRange(i + 1, 9).setValue(oldCategory2);                // payment1 ← 旧category2
    sheet.getRange(i + 1, 12).setValue('');                         // quantity → ''
    count++;
  }

  return ContentService
    .createTextOutput(JSON.stringify({ status: 'ok', migrated: count }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ===== シート管理 =====

function getSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(['取引ID', 'サービスID', '日付', 'サービス内容', '品目1', '品目2', '店', '金額', '支払い手段1', '支払い手段2', '記録日時', '数量']);
    sheet.setFrozenRows(1);

    const headerRange = sheet.getRange(1, 1, 1, 12);
    headerRange.setBackground('#10b981');
    headerRange.setFontColor('#ffffff');
    headerRange.setFontWeight('bold');

    [80,80,100,120,100,120,140,100,120,120,160,80].forEach((w, i) => {
      sheet.setColumnWidth(i + 1, w);
    });
  }

  return sheet;
}

