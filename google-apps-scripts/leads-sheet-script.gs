/**
 * Google Apps Script for BHOOKR WEBSITE LEADS SHEET
 * Purpose: Track all user submissions from the subscription form in real-time.
 * 
 * Rules:
 * 1. One row per visit, updated by session_id (kept in hidden column I).
 * 2. Visible columns only: Date, Name, Phone, Email, Address, Other details, How far they got, Filled before?
 * 3. If "Filled before?" is "Yes", shade the row a light color.
 * 4. Plain words only - no technical jargon or internal codes.
 */

function getSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  return ss.getSheetByName("Sheet2") || ss.getSheetByName("Sheet1") || ss.getActiveSheet();
}

const HEADERS = [
  'Date',
  'Name',
  'Phone',
  'Email',
  'Address',
  'Other details',
  'How far they got',
  'Filled before?',
  'session_id'
];

function doGet(e) {
  try {
    const sheet = getSheet();
    const dataRange = sheet.getDataRange();
    const values = dataRange.getValues();

    if (!values || values.length <= 1) {
      return createJsonResponse({
        success: true,
        rows: [],
        total: 0,
        message: 'No leads found'
      });
    }

    const headers = values[0].map(function(h) {
      return String(h).trim();
    });
    const rows = [];

    for (var i = 1; i < values.length; i++) {
      var rowData = values[i];
      var rowObj = {};
      var isEmpty = true;

      for (var j = 0; j < headers.length; j++) {
        var header = headers[j];
        var val = rowData[j];
        if (val !== "" && val !== null && val !== undefined) {
          isEmpty = false;
        }

        if (val instanceof Date) {
          rowObj[header] = Utilities.formatDate(val, "Asia/Kolkata", "yyyy-MM-dd hh:mm a");
        } else {
          rowObj[header] = val;
        }
      }

      if (!isEmpty && (rowObj.Email || rowObj.Phone || rowObj.Name || rowObj.email || rowObj.phoneNumber || rowObj.name)) {
        rows.push(rowObj);
      }
    }

    return createJsonResponse({
      success: true,
      rows: rows,
      total: rows.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    Logger.log('doGet Error: ' + error.toString());
    return createJsonResponse({
      success: false,
      error: error.toString(),
      rows: [],
      total: 0
    });
  }
}

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return createJsonResponse({ success: false, error: 'Empty POST request body' });
    }

    const data = JSON.parse(e.postData.contents);
    const sheet = getSheet();

    // Ensure header row exists with visible columns and session_id as the 9th column
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(HEADERS);
      const headerRange = sheet.getRange(1, 1, 1, HEADERS.length);
      headerRange.setFontWeight('bold');
      headerRange.setBackground('#E31E24');
      headerRange.setFontColor('#ffffff');
      // Hide session_id column (column 9) to keep only visible columns
      sheet.hideColumns(9);
    }

    const sessionId = String(data.sessionId || data.session_id || '').trim();
    const lastRow = sheet.getLastRow();
    let existingRow = -1;

    // Search for existing row by session_id in Column 9 (Column I)
    if (sessionId && lastRow > 1) {
      const idValues = sheet.getRange(2, 9, lastRow - 1, 1).getValues();
      for (var i = 0; i < idValues.length; i++) {
        if (String(idValues[i][0]).trim() === sessionId) {
          existingRow = i + 2;
          break;
        }
      }
    }

    // Prepare human-readable plain fields
    const dateStr = data.date || Utilities.formatDate(new Date(), "Asia/Kolkata", "yyyy-MM-dd hh:mm a");
    const nameStr = String(data.name || '').trim();
    const phoneStr = String(data.phone || data.phoneNumber || '').trim();
    const emailStr = String(data.email || '').trim();
    const addressStr = String(data.address || '').trim();
    const otherDetailsStr = String(data.otherDetails || '').trim();
    const howFarStr = String(data.howFarTheyGot || (data.lastStepCompleted ? 'Step ' + data.lastStepCompleted + ' of 9' : 'Step 1 of 9')).trim();
    const filledBeforeStr = (data.filledBefore === 'Yes' || data.isRepeat === true || data.is_repeat === true) ? 'Yes' : 'No';

    const rowData = [
      dateStr,
      nameStr,
      phoneStr,
      emailStr,
      addressStr,
      otherDetailsStr,
      howFarStr,
      filledBeforeStr,
      sessionId
    ];

    const isRepeat = (filledBeforeStr === 'Yes');
    const highlightColor = isRepeat ? '#FFF3CD' : '#FFFFFF'; // Light yellow shading for repeat leads

    if (existingRow > 0) {
      // Update existing visit row in place
      const range = sheet.getRange(existingRow, 1, 1, HEADERS.length);
      range.setValues([rowData]);
      sheet.getRange(existingRow, 1, 1, 8).setBackground(highlightColor);

      return createJsonResponse({
        success: true,
        message: 'Lead updated by session_id in Google Sheet',
        rowNumber: existingRow,
        sessionId: sessionId
      });
    } else {
      // Insert new visit row at Row 2 (top of list under headers)
      sheet.insertRowBefore(2);
      const range = sheet.getRange(2, 1, 1, HEADERS.length);
      range.setValues([rowData]);
      sheet.getRange(2, 1, 1, 8).setBackground(highlightColor);

      return createJsonResponse({
        success: true,
        message: 'New lead added to Google Sheet',
        rowNumber: 2,
        sessionId: sessionId
      });
    }

  } catch (error) {
    Logger.log('doPost Error: ' + error.toString());
    return createJsonResponse({
      success: false,
      error: error.toString()
    });
  }
}

function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
