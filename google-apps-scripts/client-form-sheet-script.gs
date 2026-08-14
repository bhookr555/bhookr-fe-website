/**
 * Google Apps Script for BHOOKR CLIENT FORM SHEET
 * Purpose: Sync and serve direct client intake / form submissions for Bhookr CRM
 * 
 * SETUP INSTRUCTIONS:
 * 1. Open your Google Sheet for Client Form Responses / Intake
 * 2. Go to Extensions > Apps Script
 * 3. Paste this entire script into Code.gs
 * 4. Click Deploy > New deployment
 * 5. Select type: "Web app"
 * 6. Set "Execute as": "Me"
 * 7. Set "Who has access": "Anyone"
 * 8. Deploy and copy the Web App URL.
 * 9. Add the URL to your project's .env.local (and Vercel environment variables):
 *    NEXT_PUBLIC_CLIENT_FORM_SHEET_URL=https://script.google.com/macros/s/.../exec
 */

function doGet(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var data = sheet.getDataRange().getValues();
    if (!data || data.length < 2) {
      return responseJSON({ success: true, rows: [], total: 0 });
    }

    var headers = data[0].map(function(h) { return String(h).trim(); });
    var rows = [];

    for (var i = 1; i < data.length; i++) {
      var rowData = data[i];
      var rowObj = {};
      var isEmpty = true;

      for (var j = 0; j < headers.length; j++) {
        var val = rowData[j];
        if (val !== "" && val !== null && val !== undefined) isEmpty = false;
        
        if (val instanceof Date) {
          rowObj[headers[j]] = val.toISOString();
        } else {
          rowObj[headers[j]] = val;
        }
      }

      if (!isEmpty) {
        rows.push({
          timestamp: rowObj["Timestamp"] || rowObj["timestamp"] || "",
          name: rowObj["NAME"] || rowObj["Name"] || rowObj["name"] || "",
          age: rowObj["AGE"] || rowObj["Age"] || rowObj["age"] || "",
          gender: rowObj["MALE"] || rowObj["GENDER"] || rowObj["Gender"] || rowObj["gender"] || "",
          phoneNumber: rowObj["MOBILE NUMBER"] || rowObj["Mobile Number"] || rowObj["phoneNumber"] || "",
          email: rowObj["EMAIL ID"] || rowObj["Email ID"] || rowObj["email"] || "",
          weight: rowObj["WEIGHT"] || rowObj["Weight"] || rowObj["weight"] || "",
          physicalState: rowObj["Are you Physically active Food choices"] || rowObj["physicalState"] || "",
          foodPreference: rowObj["Food choices"] || rowObj["foodPreference"] || "",
          foodLove: rowObj["Food you love (feel free to write)"] || rowObj["Food you love"] || rowObj["foodLove"] || "",
          leadSource: "client_form",
          source: "client_form",
          subscriptionType: rowObj["Food choices"] || rowObj["subscriptionType"] || "Client Form",
          lastStepCompleted: rowObj["lastStepCompleted"] || 7,
          checkoutVisited: rowObj["checkoutVisited"] || false
        });
      }
    }

    return responseJSON({ success: true, rows: rows, total: rows.length });
  } catch (err) {
    return responseJSON({ success: false, error: err.toString(), rows: [], total: 0 });
  }
}

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return responseJSON({ success: false, error: "Empty POST body" });
    }

    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var data = JSON.parse(e.postData.contents);
    var timestamp = new Date();

    sheet.appendRow([
      timestamp,
      data.name || '',
      data.email || '',
      data.phoneNumber || '',
      data.age || '',
      data.gender || '',
      data.weight || '',
      data.foodPreference || '',
      data.foodLove || ''
    ]);

    return responseJSON({
      success: true,
      message: "Client Form lead added successfully",
      rowNumber: sheet.getLastRow()
    });
  } catch (err) {
    return responseJSON({ success: false, error: err.toString() });
  }
}

function responseJSON(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
