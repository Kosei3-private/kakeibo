// ===== 家計簿スキャナー - Google Apps Script =====

const SHEET_NAME = '家計簿記録';

function doGet(e) {
  const action = e.parameter.action;

  if (action === 'add') {
    return addRecord(e.parameter);
  } else if (action === 'list') {
    return getRecords();
  }

  return ContentService.createTextOutput('家計簿スキャナー API').setMimeType(ContentService.MimeType.TEXT);
}

function addRecord(params) {
  const sheet = getSheet();

  // 次の登録IDを取得
  const lastRow = sheet.getLastRow();
  const nextId = lastRow; // ヘッダー行があるのでlastRowがそのままIDになる

  sheet.appendRow([
    nextId,
    params.date || '',
    params.service || '購入',
    params.category1 || '',
    params.category2 || '',
    params.store || '',
    Number(params.amount) || 0,
    params.payment || '',
    new Date()
  ]);

  return ContentService
    .createTextOutput(JSON.stringify({ status: 'ok' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function getRecords() {
  const sheet = getSheet();
  const rows = sheet.getDataRange().getValues();

  const records = rows.slice(1).reverse().map(row => ({
    id: row[0],
    date: row[1],
    service: row[2],
    category1: row[3],
    category2: row[4],
    store: row[5],
    amount: row[6],
    payment: row[7],
    createdAt: row[8]
  }));

  return ContentService
    .createTextOutput(JSON.stringify({ status: 'ok', records }))
    .setMimeType(ContentService.MimeType.JSON);
}

function getSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(['登録ID', '日付', 'サービス内容', '品目1', '品目2', '店', '金額', '支払い手段', '記録日時']);
    sheet.setFrozenRows(1);

    const headerRange = sheet.getRange(1, 1, 1, 9);
    headerRange.setBackground('#10b981');
    headerRange.setFontColor('#ffffff');
    headerRange.setFontWeight('bold');

    sheet.setColumnWidth(1, 80);
    sheet.setColumnWidth(2, 100);
    sheet.setColumnWidth(3, 120);
    sheet.setColumnWidth(4, 100);
    sheet.setColumnWidth(5, 120);
    sheet.setColumnWidth(6, 140);
    sheet.setColumnWidth(7, 100);
    sheet.setColumnWidth(8, 120);
    sheet.setColumnWidth(9, 160);
  }

  return sheet;
}
