/**
 * Google Apps Script for BHOOKR ACTIVE CUSTOMERS / PRINT SHEET
 * Spreadsheet ID: 1QGOfVihcDcaEhVJMn960zM0u0cenSyw_DHPYy6hE38E
 * 
 * SETUP INSTRUCTIONS:
 * 1. Open your Google Sheet (https://docs.google.com/spreadsheets/d/1QGOfVihcDcaEhVJMn960zM0u0cenSyw_DHPYy6hE38E/edit)
 * 2. Click Extensions > Apps Script
 * 3. Delete existing code, paste this code into Editor
 * 4. Click Deploy > New deployment
 * 5. Select type: Web App
 * 6. Set "Execute as": Me
 * 7. Set "Who has access": Anyone
 * 8. Click Deploy & Copy the Web App URL
 * 9. Paste the URL into your project's .env.local as:
 *    NEXT_PUBLIC_ACTIVE_CUSTOMERS_SHEET_URL="https://script.google.com/macros/s/..."
 */

function doGet(e) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    const data = sheet.getDataRange().getValues();
    
    if (data.length < 1) {
      return ContentService.createTextOutput(
        JSON.stringify({ success: true, rows: [], total: 0 })
      ).setMimeType(ContentService.MimeType.JSON);
    }
    
    const rawHeaders = data[0];
    const headers = rawHeaders.map(function(h) {
      return String(h || "").trim();
    });
    
    const rows = [];
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      // Skip empty rows
      if (!row || row.every(function(cell) { return cell === ""; })) continue;
      
      var obj = {};
      for (var j = 0; j < headers.length; j++) {
        var key = headers[j] || ('col_' + j);
        obj[key] = row[j];
      }
      rows.push(obj);
    }
    
    return ContentService.createTextOutput(
      JSON.stringify({
        success: true,
        rows: rows,
        total: rows.length,
        timestamp: new Date().toISOString()
      })
    ).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService.createTextOutput(
      JSON.stringify({
        success: false,
        error: error.toString(),
        rows: [],
        total: 0
      })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}
