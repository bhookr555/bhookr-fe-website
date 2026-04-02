/**
 * Google Apps Script for ORDERS SHEET
 * Purpose: Track all menu item orders (one-time meal orders)
 * 
 * SETUP INSTRUCTIONS:
 * 1. Create a new Google Sheet named "Bhookr Orders"
 * 2. Open Tools > Script editor (Extensions > Apps Script)
 * 3. Paste this code
 * 4. Deploy > New deployment > Web app
 * 5. Set "Execute as" to "Me"
 * 6. Set "Who has access" to "Anyone"
 * 7. Copy the deployment URL and add to your .env.local as NEXT_PUBLIC_ORDERS_SHEET_URL
 * 
 * SHEET COLUMNS (Row 1 - Headers):
 * A: timestamp | B: orderId | C: customerName | D: customerEmail | E: customerPhone
 * F: deliveryFullName | G: deliveryPhone | H: deliveryAddress | I: deliveryCity
 * J: deliveryState | K: deliveryPinCode | L: items | M: itemCount
 * N: subtotal | O: itemGST | P: deliveryBase | Q: deliveryGST | R: grandTotal
 * S: paymentStatus | T: paymentId | U: paymentMethod | V: paymentTimestamp
 */

// Handle GET requests (for testing)
function doGet(e) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    const lastRow = sheet.getLastRow();
    
    return ContentService.createTextOutput(
      JSON.stringify({
        success: true,
        message: 'Orders Sheet is working! Total rows: ' + lastRow,
        timestamp: new Date().toISOString()
      })
    ).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(
      JSON.stringify({
        success: false,
        error: error.toString(),
        message: 'Failed to connect to Orders Sheet'
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
        'orderId',
        'customerName',
        'customerEmail',
        'customerPhone',
        'deliveryFullName',
        'deliveryPhone',
        'deliveryAddress',
        'deliveryCity',
        'deliveryState',
        'deliveryPinCode',
        'items',
        'itemCount',
        'subtotal',
        'itemGST',
        'deliveryBase',
        'deliveryGST',
        'grandTotal',
        'paymentStatus',
        'paymentId',
        'paymentMethod',
        'paymentTimestamp'
      ];
      sheet.appendRow(headers);
      
      // Format header row
      const headerRange = sheet.getRange(1, 1, 1, headers.length);
      headerRange.setFontWeight('bold');
      headerRange.setBackground('#ff6b35'); // Orange color for orders
      headerRange.setFontColor('#ffffff');
    }
    
    // Parse incoming data
    const data = JSON.parse(e.postData.contents);
    
    // Check if this is a status update request
    if (data.action === 'updateStatus') {
      return handleStatusUpdate(sheet, data);
    }
    
    // Validate required fields for new order
    if (!data.orderId || !data.customerEmail) {
      return ContentService.createTextOutput(
        JSON.stringify({
          success: false,
          error: 'Missing required fields: orderId and customerEmail are required'
        })
      ).setMimeType(ContentService.MimeType.JSON);
    }
    
    // Check if order already exists (based on orderId)
    const orderIdColumn = 2; // Column B
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
    
    // Format items as a readable string
    let itemsString = '';
    if (data.items && Array.isArray(data.items)) {
      itemsString = data.items.map(function(item) {
        return item.name + ' (x' + item.quantity + ') - ₹' + item.total;
      }).join('; ');
    }
    
    // Prepare row data
    const timestamp = new Date();
    const rowData = [
      timestamp,
      data.orderId || '',
      data.customerName || '',
      data.customerEmail || '',
      data.customerPhone || '',
      data.deliveryFullName || '',
      data.deliveryPhone || '',
      data.deliveryAddress || '',
      data.deliveryCity || '',
      data.deliveryState || '',
      data.deliveryPinCode || '',
      itemsString,
      data.itemCount || 0,
      data.subtotal || 0,
      data.itemGST || 0,
      data.deliveryBase || 0,
      data.deliveryGST || 0,
      data.grandTotal || 0,
      data.paymentStatus || 'success',
      data.paymentId || '',
      data.paymentMethod || '',
      data.paymentTimestamp || new Date().toISOString()
    ];
    
    // Update existing row or append new row
    if (existingRow > 0) {
      // Update existing order (preserve original timestamp)
      const existingTimestamp = sheet.getRange(existingRow, 1).getValue();
      rowData[0] = existingTimestamp;
      sheet.getRange(existingRow, 1, 1, rowData.length).setValues([rowData]);
      
      return ContentService.createTextOutput(
        JSON.stringify({
          success: true,
          message: 'Order updated successfully',
          rowNumber: existingRow,
          orderId: data.orderId
        })
      ).setMimeType(ContentService.MimeType.JSON);
    } else {
      // Append new order
      sheet.appendRow(rowData);
      
      return ContentService.createTextOutput(
        JSON.stringify({
          success: true,
          message: 'Order added successfully',
          rowNumber: sheet.getLastRow(),
          orderId: data.orderId
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
        message: 'Failed to process order submission'
      })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}

// Handle status updates (e.g., refunded, delivered)
function handleStatusUpdate(sheet, data) {
  try {
    if (!data.orderId) {
      return ContentService.createTextOutput(
        JSON.stringify({
          success: false,
          error: 'orderId is required for status update'
        })
      ).setMimeType(ContentService.MimeType.JSON);
    }
    
    const orderIdColumn = 2; // Column B
    const statusColumn = 19; // Column S - paymentStatus
    const lastRow = sheet.getLastRow();
    
    if (lastRow <= 1) {
      return ContentService.createTextOutput(
        JSON.stringify({
          success: false,
          error: 'No orders found in sheet'
        })
      ).setMimeType(ContentService.MimeType.JSON);
    }
    
    // Find the order
    const orderIdValues = sheet.getRange(2, orderIdColumn, lastRow - 1, 1).getValues();
    let orderRow = -1;
    
    for (let i = 0; i < orderIdValues.length; i++) {
      if (orderIdValues[i][0] === data.orderId) {
        orderRow = i + 2;
        break;
      }
    }
    
    if (orderRow === -1) {
      return ContentService.createTextOutput(
        JSON.stringify({
          success: false,
          error: 'Order not found: ' + data.orderId
        })
      ).setMimeType(ContentService.MimeType.JSON);
    }
    
    // Update status
    sheet.getRange(orderRow, statusColumn).setValue(data.status);
    
    // If cancelled/refunded, optionally add a note
    if (data.reason) {
      // Add reason to a notes column if needed
      Logger.log('Status update reason: ' + data.reason);
    }
    
    return ContentService.createTextOutput(
      JSON.stringify({
        success: true,
        message: 'Order status updated to: ' + data.status,
        orderId: data.orderId,
        rowNumber: orderRow
      })
    ).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    Logger.log('Error updating status: ' + error.toString());
    
    return ContentService.createTextOutput(
      JSON.stringify({
        success: false,
        error: error.toString()
      })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}

// Helper function to format currency
function formatCurrency(amount) {
  return '₹' + (amount || 0).toLocaleString('en-IN');
}

// Helper function to get order by orderId
function getOrderByOrderId(orderId) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    const orderIdColumn = 2;
    const lastRow = sheet.getLastRow();
    
    if (lastRow <= 1) return null;
    
    const orderIdValues = sheet.getRange(2, orderIdColumn, lastRow - 1, 1).getValues();
    for (let i = 0; i < orderIdValues.length; i++) {
      if (orderIdValues[i][0] === orderId) {
        const rowData = sheet.getRange(i + 2, 1, 1, 22).getValues()[0];
        return {
          timestamp: rowData[0],
          orderId: rowData[1],
          customerName: rowData[2],
          customerEmail: rowData[3],
          customerPhone: rowData[4],
          deliveryFullName: rowData[5],
          deliveryPhone: rowData[6],
          deliveryAddress: rowData[7],
          deliveryCity: rowData[8],
          deliveryState: rowData[9],
          deliveryPinCode: rowData[10],
          items: rowData[11],
          itemCount: rowData[12],
          subtotal: rowData[13],
          itemGST: rowData[14],
          deliveryBase: rowData[15],
          deliveryGST: rowData[16],
          grandTotal: rowData[17],
          paymentStatus: rowData[18],
          paymentId: rowData[19],
          paymentMethod: rowData[20],
          paymentTimestamp: rowData[21]
        };
      }
    }
    return null;
  } catch (error) {
    Logger.log('Error getting order: ' + error.toString());
    return null;
  }
}
