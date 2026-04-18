// ===== 家計簿スキャナー - Google Apps Script =====
// 全データシートと同じ形式で保存

const SHEET_NAME = '全データ';

function doGet(e) {
  const action = e.parameter.action;
  if (action === 'add') return addRecord(e.parameter);
  if (action === 'list') return getRecords();
  if (action === 'info') return getInfo();
  return ContentService.createTextOutput('家計簿API').setMimeType(ContentService.MimeType.TEXT);
}

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

function addRecord(params) {
  const sheet = getSheet();
  const lastRow = sheet.getLastRow();

  // 取引ID: 常にユニーク（行番号ベース）
  const torihikiId = lastRow;

  // サービスID: 同じレシート内は同じID
  // クライアントから渡された場合はそれを使用、なければ取引IDと同じ
  const serviceId = params.serviceId ? Number(params.serviceId) : torihikiId;

  sheet.appendRow([
    torihikiId,                    // 取引ID
    serviceId,                     // サービスID（同レシート内で共通）
    params.date || '',             // 日付
    params.service || '購入',      // サービス内容
    params.category1 || '',        // 品目1
    params.category2 || '',        // 品目2
    params.store || '',            // 店
    Number(params.amount) || 0,    // 金額
    params.payment1 || '',         // 支払い手段1
    params.payment2 || '',         // 支払い手段2
    new Date()                     // 記録日時
  ]);

  // 登録した取引IDを返す（次の同レシート登録時にサービスIDとして使用）
  return ContentService
    .createTextOutput(JSON.stringify({ status: 'ok', torihikiId, serviceId }))
    .setMimeType(ContentService.MimeType.JSON);
}

function getRecords() {
  const sheet = getSheet();
  const rows = sheet.getDataRange().getValues();

  const records = rows.slice(1).map(row => ({
    id: row[0],
    serviceId: row[1],
    date: row[2],
    service: row[3],
    category1: row[4],
    category2: row[5],
    store: row[6],
    amount: row[7],
    payment1: row[8],
    payment2: row[9],
  })).reverse(); // 新しい順

  return ContentService
    .createTextOutput(JSON.stringify({ status: 'ok', records }))
    .setMimeType(ContentService.MimeType.JSON);
}

function getSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(['取引ID', 'サービスID', '日付', 'サービス内容', '品目1', '品目2', '店', '金額', '支払い手段1', '支払い手段2', '記録日時']);
    sheet.setFrozenRows(1);

    const headerRange = sheet.getRange(1, 1, 1, 11);
    headerRange.setBackground('#10b981');
    headerRange.setFontColor('#ffffff');
    headerRange.setFontWeight('bold');

    sheet.setColumnWidth(1, 80);
    sheet.setColumnWidth(2, 80);
    sheet.setColumnWidth(3, 100);
    sheet.setColumnWidth(4, 120);
    sheet.setColumnWidth(5, 100);
    sheet.setColumnWidth(6, 120);
    sheet.setColumnWidth(7, 140);
    sheet.setColumnWidth(8, 100);
    sheet.setColumnWidth(9, 120);
    sheet.setColumnWidth(10, 120);
    sheet.setColumnWidth(11, 160);
  }

  return sheet;
}
