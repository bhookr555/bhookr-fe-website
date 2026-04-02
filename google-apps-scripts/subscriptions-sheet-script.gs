/**
 * Google Apps Script for SUBSCRIPTIONS SHEET
 * Purpose: Track only users who successfully completed payment
 * 
 * SETUP INSTRUCTIONS:
 * 1. Create a new Google Sheet named "Bhookr Subscriptions"
 * 2. Open Tools > Script editor (Extensions > Apps Script)
 * 3. Paste this code
 * 4. Deploy > New deployment > Web app
 * 5. Set "Execute as" to "Me"
 * 6. Set "Who has access" to "Anyone"
 * 7. Copy the deployment URL and add to your .env.local as NEXT_PUBLIC_SUBSCRIPTIONS_SHEET_URL
 * 
 * SHEET COLUMNS (Row 1 - Headers):
 * A: timestamp | B: name | C: email | D: phoneNumber | E: age | F: gender 
 * G: height | H: weight | I: goal | J: diet | K: foodPreference 
 * L: physicalState | M: subscriptionType | N: plan | O: subscriptionStartDate 
 * P: paymentStatus | Q: transactionId | R: orderId | S: amountPaid 
 * T: paymentMethod | U: paymentTimestamp | V: status
 */

// Handle GET requests (for testing)
function doGet(e) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    const lastRow = sheet.getLastRow();
    
    return ContentService.createTextOutput(
      JSON.stringify({
        success: true,
        message: 'Subscriptions Sheet is working! Total rows: ' + lastRow,
        timestamp: new Date().toISOString()
      })
    ).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(
      JSON.stringify({
        success: false,
        error: error.toString(),
        message: 'Failed to connect to Subscriptions Sheet'
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
        'paymentStatus',
        'transactionId',
        'orderId',
        'amountPaid',
        'paymentMethod',
        'paymentTimestamp',
        'status'
      ];
      sheet.appendRow(headers);
      
      // Format header row
      const headerRange = sheet.getRange(1, 1, 1, headers.length);
      headerRange.setFontWeight('bold');
      headerRange.setBackground('#0f9d58');
      headerRange.setFontColor('#ffffff');
    }
    
    // Parse incoming data
    const data = JSON.parse(e.postData.contents);
    
    // Check if this is a status update request
    if (data.action === 'updateStatus') {
      return handleStatusUpdate(sheet, data);
    }
    
    // Validate required fields for new subscription
    if (!data.email || !data.name) {
      return ContentService.createTextOutput(
        JSON.stringify({
          success: false,
          error: 'Missing required fields: email and name are required'
        })
      ).setMimeType(ContentService.MimeType.JSON);
    }
    
    if (!data.orderId || !data.paymentStatus) {
      return ContentService.createTextOutput(
        JSON.stringify({
          success: false,
          error: 'Missing payment details: orderId and paymentStatus are required'
        })
      ).setMimeType(ContentService.MimeType.JSON);
    }
    
    // Check if subscription already exists (based on orderId)
    const orderIdColumn = 18; // Column R
    const lastRow = sheet.getLastRow();
    let existingRow = -1;
    
    if (lastRow > 1) {
      const orderIdValues = sheet.getRange(2, orderIdColumn, lastRow - 1, 1).getValues();
      for (let i = 0; i < orderIdValues.length; i++) {
        if (orderIdValues[i][0] === data.orderId) {
          existingRow = i + 2; // +2 because array is 0-indexed and we start from row 2
          break;
        }
      }
    }
    
    // If duplicate orderId found, return error (prevent double entries)
    if (existingRow > 0) {
      return ContentService.createTextOutput(
        JSON.stringify({
          success: false,
          error: 'Duplicate order detected',
          message: 'This order has already been recorded',
          orderId: data.orderId,
          existingRow: existingRow
        })
      ).setMimeType(ContentService.MimeType.JSON);
    }
    
    // Prepare row data
    const timestamp = new Date();
    const paymentTimestamp = data.paymentTimestamp ? new Date(data.paymentTimestamp) : timestamp;
    
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
      data.paymentStatus || 'pending',
      data.transactionId || '',
      data.orderId || '',
      data.amountPaid || 0,
      data.paymentMethod || '',
      paymentTimestamp,
      data.status || 'active'
    ];
    
    // Append new subscription
    sheet.appendRow(rowData);
    
    // Apply conditional formatting for payment status
    const newRow = sheet.getLastRow();
    const statusCell = sheet.getRange(newRow, 16); // Payment Status column
    
    if (data.paymentStatus === 'success') {
      statusCell.setBackground('#d4edda');
      statusCell.setFontColor('#155724');
    } else if (data.paymentStatus === 'failed') {
      statusCell.setBackground('#f8d7da');
      statusCell.setFontColor('#721c24');
    } else {
      statusCell.setBackground('#fff3cd');
      statusCell.setFontColor('#856404');
    }
    
    // Send email notification (optional)
    if (data.paymentStatus === 'success') {
      sendSuccessNotification(data.email, data.name, data.orderId);
    }
    
    return ContentService.createTextOutput(
      JSON.stringify({
        success: true,
        message: 'Subscription recorded successfully',
        rowNumber: newRow,
        orderId: data.orderId,
        email: data.email,
        paymentStatus: data.paymentStatus
      })
    ).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    // Log error and return error response
    Logger.log('Error: ' + error.toString());
    
    return ContentService.createTextOutput(
      JSON.stringify({
        success: false,
        error: error.toString(),
        message: 'Failed to process subscription'
      })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}

// Handle GET requests (optional - for testing)
function doGet(e) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const lastRow = sheet.getLastRow();
  const totalSubscriptions = lastRow > 1 ? lastRow - 1 : 0;
  
  return ContentService.createTextOutput(
    JSON.stringify({
      status: 'active',
      message: 'Bhookr Subscriptions Sheet API is running',
      version: '1.0.0',
      totalSubscriptions: totalSubscriptions,
      endpoints: {
        POST: 'Submit subscription data with payment details'
      }
    })
  ).setMimeType(ContentService.MimeType.JSON);
}

// Helper function to send email notification (optional)
function sendSuccessNotification(email, name, orderId) {
  try {
    const subject = 'Bhookr Subscription Confirmed - Order #' + orderId;
    const body = `
Dear ${name},

Thank you for subscribing to Bhookr!

Your subscription has been successfully confirmed.
Order ID: ${orderId}

We'll start preparing your meals according to your preferences.

Best regards,
Bhookr Team
    `;
    
    // Uncomment the line below to enable email notifications
    // MailApp.sendEmail(email, subject, body);
    
    Logger.log('Email notification sent to: ' + email);
    return true;
  } catch (error) {
    Logger.log('Failed to send email: ' + error.toString());
    return false;
  }
}

// Helper function to get subscription by email
function getSubscriptionByEmail(email) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    const emailColumn = 3;
    const lastRow = sheet.getLastRow();
    
    if (lastRow > 1) {
      const data = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();
      const subscriptions = [];
      
      for (let i = 0; i < data.length; i++) {
        if (data[i][2] === email) { // Column C (index 2) is email
          subscriptions.push({
            row: i + 2,
            timestamp: data[i][0],
            name: data[i][1],
            email: data[i][2],
            orderId: data[i][17],
            paymentStatus: data[i][15],
            status: data[i][21]
          });
        }
      }
      
      return subscriptions;
    }
    return [];
  } catch (error) {
    Logger.log('Error getting subscription: ' + error.toString());
    return [];
  }
}

// Helper function to update payment status (for payment verification)
function updatePaymentStatus(orderId, newStatus, transactionId) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    const orderIdColumn = 18; // Column R
    const lastRow = sheet.getLastRow();
    
    if (lastRow > 1) {
      const orderIdValues = sheet.getRange(2, orderIdColumn, lastRow - 1, 1).getValues();
      for (let i = 0; i < orderIdValues.length; i++) {
        if (orderIdValues[i][0] === orderId) {
          const rowNumber = i + 2;
          
          // Update payment status (Column P)
          sheet.getRange(rowNumber, 16).setValue(newStatus);
          
          // Update transaction ID if provided (Column Q)
          if (transactionId) {
            sheet.getRange(rowNumber, 17).setValue(transactionId);
          }
          
          // Update payment timestamp (Column U)
          sheet.getRange(rowNumber, 21).setValue(new Date());
          
          return true;
        }
      }
    }
    return false;
  } catch (error) {
    Logger.log('Error updating payment status: ' + error.toString());
    return false;
  }
}

// Handle subscription status updates (for cancellations)
function handleStatusUpdate(sheet, data) {
  try {
    if (!data.orderId) {
      return ContentService.createTextOutput(
        JSON.stringify({
          success: false,
          error: 'Missing orderId for status update'
        })
      ).setMimeType(ContentService.MimeType.JSON);
    }
    
    const orderIdColumn = 18; // Column R (orderId)
    const statusColumn = 22;   // Column V (status)
    const lastRow = sheet.getLastRow();
    
    if (lastRow <= 1) {
      return ContentService.createTextOutput(
        JSON.stringify({
          success: false,
          error: 'No subscriptions found in sheet'
        })
      ).setMimeType(ContentService.MimeType.JSON);
    }
    
    // Find the row with matching orderId
    const orderIdValues = sheet.getRange(2, orderIdColumn, lastRow - 1, 1).getValues();
    let targetRow = -1;
    
    for (let i = 0; i < orderIdValues.length; i++) {
      if (orderIdValues[i][0] === data.orderId) {
        targetRow = i + 2; // +2 because array is 0-indexed and we start from row 2
        break;
      }
    }
    
    if (targetRow === -1) {
      return ContentService.createTextOutput(
        JSON.stringify({
          success: false,
          error: 'Subscription not found with orderId: ' + data.orderId
        })
      ).setMimeType(ContentService.MimeType.JSON);
    }
    
    // Update the status column (Column V)
    sheet.getRange(targetRow, statusColumn).setValue(data.status || 'cancelled');
    
    // Add status change info to notes
    const statusCell = sheet.getRange(targetRow, statusColumn);
    
    if (data.status === 'cancelled' && data.cancellationReason) {
      const cancelledAt = data.cancelledAt ? new Date(data.cancelledAt).toLocaleString() : new Date().toLocaleString();
      statusCell.setNote('Cancelled at: ' + cancelledAt + '\nReason: ' + data.cancellationReason);
      
      // Apply formatting for cancelled status
      statusCell.setBackground('#f8d7da');
      statusCell.setFontColor('#721c24');
    } else if (data.status === 'expired') {
      const expiredAt = data.cancelledAt ? new Date(data.cancelledAt).toLocaleString() : new Date().toLocaleString();
      const expiredReason = data.cancellationReason || 'Subscription period ended';
      statusCell.setNote('Expired at: ' + expiredAt + '\nReason: ' + expiredReason);
      
      // Apply formatting for expired status (gray)
      statusCell.setBackground('#e2e8f0');
      statusCell.setFontColor('#475569');
    } else if (data.status === 'active') {
      // Apply formatting for active status (green)
      statusCell.setBackground('#d4edda');
      statusCell.setFontColor('#155724');
    }
    
    Logger.log('Subscription status updated: ' + data.orderId + ' -> ' + data.status);
    
    return ContentService.createTextOutput(
      JSON.stringify({
        success: true,
        message: 'Subscription status updated successfully',
        orderId: data.orderId,
        status: data.status,
        rowNumber: targetRow
      })
    ).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    Logger.log('Error in handleStatusUpdate: ' + error.toString());
    return ContentService.createTextOutput(
      JSON.stringify({
        success: false,
        error: error.toString(),
        message: 'Failed to update subscription status'
      })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}
