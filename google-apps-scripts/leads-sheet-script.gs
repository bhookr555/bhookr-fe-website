/**
 * Google Apps Script for BHOOKR WEBSITE LEADS SHEET
 * Purpose: Track all users who complete Step 1 to Step 7 of the subscription form
 * Inserts NEW leads at ROW 2 (Top of Sheet, immediately under headers).
 * 
 * SETUP INSTRUCTIONS:
 * 1. Open your Google Sheet named "BHOOKER WEBSITE LEADS"
 * 2. Open Extensions > Apps Script
 * 3. Replace all code with this script
 * 4. Deploy > New deployment > Web app
 * 5. Set "Execute as" to "Me"
 * 6. Set "Who has access" to "Anyone"
 * 7. Copy the deployment URL and add to your .env.local as NEXT_PUBLIC_LEADS_SHEET_URL
 */

function doGet(e) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
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

    const headers = values[0].map(function(h) { return String(h).trim(); });
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
          rowObj[header] = val.toISOString();
        } else {
          rowObj[header] = val;
        }
      }

      // Ignore empty rows or rows without contact info
      if (!isEmpty && (rowObj.email || rowObj.phoneNumber || rowObj.name)) {
        rowObj.leadSource = "website";
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

// Handle POST requests (Step 1 and Step 7 form submissions)
function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return createJsonResponse({ success: false, error: 'Empty POST request body' });
    }

    const data = JSON.parse(e.postData.contents);
    
    // CRITICAL: Reject blank submissions to prevent empty rows
    const cleanName = String(data.name || '').trim();
    const cleanEmail = String(data.email || '').trim();
    const cleanPhone = String(data.phoneNumber || '').replace(/\D/g, '');

    if (!cleanName && !cleanEmail && !cleanPhone) {
      return createJsonResponse({
        success: false,
        error: 'Rejected blank lead submission: name, email, or phone is required'
      });
    }

    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    const headers = [
      'timestamp',
      'name',
      'email',
      'phoneNumber',
      'age',
      'gender',
      'height',
      'weight',
      'goal',
      'diet',
      'foodPreference',
      'physicalState',
      'subscriptionType',
      'plan',
      'subscriptionStartDate',
      'status',
      'lastStepCompleted',
      'checkoutVisited',
      'utmSource',
      'utmSubSource'
    ];

    // Initialize headers if sheet is completely empty
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(headers);
      const headerRange = sheet.getRange(1, 1, 1, headers.length);
      headerRange.setFontWeight('bold');
      headerRange.setBackground('#4285f4');
      headerRange.setFontColor('#ffffff');
    }

    const lastRow = sheet.getLastRow();
    let existingRow = -1;

    // Search for existing lead by Phone Number (Col D = 4) first, then Email (Col C = 3) second
    if (lastRow > 1) {
      const dataValues = sheet.getRange(2, 1, lastRow - 1, headers.length).getValues();
      for (var i = 0; i < dataValues.length; i++) {
        var rowEmail = String(dataValues[i][2] || '').trim().toLowerCase();
        var rowPhone = String(dataValues[i][3] || '').replace(/\D/g, '');

        var phoneMatch = cleanPhone && rowPhone && (rowPhone.slice(-10) === cleanPhone.slice(-10));
        var emailMatch = cleanEmail && rowEmail && (rowEmail === cleanEmail.toLowerCase());

        if (phoneMatch || emailMatch) {
          existingRow = i + 2;
          break;
        }
      }
    }

    const timestamp = new Date();
    const rowData = [
      timestamp,
      data.name || '',
      data.email || '',
      data.phoneNumber || '',
      data.age || '',
      data.gender || '',
      data.height || '',
      data.weight || '',
      data.goal || '',
      data.diet || '',
      data.foodPreference || '',
      data.physicalState || '',
      data.subscriptionType || '',
      Array.isArray(data.plan) ? data.plan.join(', ') : (data.plan || ''),
      data.subscriptionStartDate || '',
      data.status || 'lead',
      data.lastStepCompleted || 1,
      data.checkoutVisited || false,
      data.utmSource || '',
      data.utmSubSource || ''
    ];

    if (existingRow > 0) {
      // Update existing lead row in place (preserve original timestamp if present)
      const existingRange = sheet.getRange(existingRow, 1, 1, headers.length);
      const existingValues = existingRange.getValues()[0];
      
      // Preserve existing timestamp if secondary update
      if (existingValues[0]) {
        rowData[0] = existingValues[0];
      }

      // Merge non-empty values into existing row
      for (var k = 1; k < headers.length; k++) {
        if (!rowData[k] && existingValues[k]) {
          rowData[k] = existingValues[k];
        }
      }

      existingRange.setValues([rowData]);

      return createJsonResponse({
        success: true,
        message: 'Lead updated successfully',
        rowNumber: existingRow,
        email: data.email || data.phoneNumber
      });
    } else {
      // Insert NEW lead at Row 2 (Top of Sheet, right under headers)
      sheet.insertRowBefore(2);
      sheet.getRange(2, 1, 1, headers.length).setValues([rowData]);

      return createJsonResponse({
        success: true,
        message: 'Lead added successfully at top of sheet (Row 2)',
        rowNumber: 2,
        email: data.email || data.phoneNumber
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

// Helper to construct JSON response
function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
