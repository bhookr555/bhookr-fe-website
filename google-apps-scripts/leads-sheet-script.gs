/**
 * Google Apps Script for LEADS SHEET
 * Purpose: Track all users who complete the 7-step subscription form
 * 
 * SETUP INSTRUCTIONS:
 * 1. Create a new Google Sheet named "Bhookr Leads"
 * 2. Open Tools > Script editor (Extensions > Apps Script)
 * 3. Paste this code
 * 4. Deploy > New deployment > Web app
 * 5. Set "Execute as" to "Me"
 * 6. Set "Who has access" to "Anyone"
 * 7. Copy the deployment URL and add to your .env.local as NEXT_PUBLIC_LEADS_SHEET_URL
 * 
 * SHEET COLUMNS (Row 1 - Headers):
 * A: timestamp | B: name | C: email | D: phoneNumber | E: age | F: gender 
 * G: height | H: weight | I: goal | J: diet | K: foodPreference 
 * L: physicalState | M: subscriptionType | N: plan | O: subscriptionStartDate 
 * P: status | Q: lastStepCompleted | R: checkoutVisited
 */

// Handle GET requests (for testing)
function doGet(e) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    const lastRow = sheet.getLastRow();
    
    return ContentService.createTextOutput(
      JSON.stringify({
        success: true,
        message: 'Leads Sheet is working! Total rows: ' + lastRow,
        timestamp: new Date().toISOString()
      })
    ).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(
      JSON.stringify({
        success: false,
        error: error.toString(),
        message: 'Failed to connect to Leads Sheet'
      })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}

// Main function to handle POST requests
function doPost(e) {
  try {
    // Log incoming request for debugging
    Logger.log('Received POST request at: ' + new Date().toISOString());
    Logger.log('Post data: ' + e.postData.contents);
    // Get the active spreadsheet
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    
    // Initialize headers if sheet is empty
    if (sheet.getLastRow() === 0) {
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
        'checkoutVisited'
      ];
      sheet.appendRow(headers);
      
      // Format header row
      const headerRange = sheet.getRange(1, 1, 1, headers.length);
      headerRange.setFontWeight('bold');
      headerRange.setBackground('#4285f4');
      headerRange.setFontColor('#ffffff');
    }
    
    // Parse incoming data
    const data = JSON.parse(e.postData.contents);
    
    // Validate required fields
    if (!data.email || !data.name) {
      return ContentService.createTextOutput(
        JSON.stringify({
          success: false,
          error: 'Missing required fields: email and name are required'
        })
      ).setMimeType(ContentService.MimeType.JSON);
    }
    
    // Check if lead already exists (based on email)
    const emailColumn = 3; // Column C
    const lastRow = sheet.getLastRow();
    let existingRow = -1;
    
    if (lastRow > 1) {
      const emailValues = sheet.getRange(2, emailColumn, lastRow - 1, 1).getValues();
      for (let i = 0; i < emailValues.length; i++) {
        if (emailValues[i][0] === data.email) {
          existingRow = i + 2; // +2 because array is 0-indexed and we start from row 2
          break;
        }
      }
    }
    
    // Prepare row data
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
      data.lastStepCompleted || 7,
      data.checkoutVisited || false
    ];
    
    // Update existing row or append new row
    if (existingRow > 0) {
      // Update existing lead (preserve original timestamp)
      const existingTimestamp = sheet.getRange(existingRow, 1).getValue();
      rowData[0] = existingTimestamp;
      sheet.getRange(existingRow, 1, 1, rowData.length).setValues([rowData]);
      
      return ContentService.createTextOutput(
        JSON.stringify({
          success: true,
          message: 'Lead updated successfully',
          rowNumber: existingRow,
          email: data.email
        })
      ).setMimeType(ContentService.MimeType.JSON);
    } else {
      // Append new lead
      sheet.appendRow(rowData);
      
      return ContentService.createTextOutput(
        JSON.stringify({
          success: true,
          message: 'Lead added successfully',
          rowNumber: sheet.getLastRow(),
          email: data.email
        })
      ).setMimeType(ContentService.MimeType.JSON);
    }
    
  } catch (error) {
    // Log error and return error response
    Logger.log('Error: ' + error.toString());
    
    return ContentService.createTextOutput(
      JSON.stringify({
        success: false,
        error: error.toString(),
        message: 'Failed to process lead submission'
      })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}

// Handle GET requests (optional - for testing)
function doGet(e) {
  return ContentService.createTextOutput(
    JSON.stringify({
      status: 'active',
      message: 'Bhookr Leads Sheet API is running',
      version: '1.0.0',
      endpoints: {
        POST: 'Submit lead data'
      }
    })
  ).setMimeType(ContentService.MimeType.JSON);
}

// Helper function to update checkout visited status
function updateCheckoutVisited(email) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    const emailColumn = 3;
    const checkoutColumn = 18; // Column R
    const lastRow = sheet.getLastRow();
    
    if (lastRow > 1) {
      const emailValues = sheet.getRange(2, emailColumn, lastRow - 1, 1).getValues();
      for (let i = 0; i < emailValues.length; i++) {
        if (emailValues[i][0] === email) {
          const rowNumber = i + 2;
          sheet.getRange(rowNumber, checkoutColumn).setValue(true);
          return true;
        }
      }
    }
    return false;
  } catch (error) {
    Logger.log('Error updating checkout visited: ' + error.toString());
    return false;
  }
}
