import type { InvoiceData } from "@/types/subscription";
import { format } from "date-fns";

/**
 * Generate and print invoice
 */
export function printInvoice(invoiceData: InvoiceData): void {
  const invoiceHTML = generateInvoiceHTML(invoiceData);
  
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    alert("Please allow popups to print the invoice");
    return;
  }

  printWindow.document.write(invoiceHTML);
  printWindow.document.close();
  
  // Wait for content to load before printing
  printWindow.onload = () => {
    printWindow.print();
    printWindow.onafterprint = () => {
      printWindow.close();
    };
  };
}

/**
 * Generate invoice HTML
 */
function generateInvoiceHTML(data: InvoiceData): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice - ${data.invoiceNumber}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      padding: 20px;
      color: #333;
    }
    
    .invoice-container {
      max-width: 800px;
      margin: 0 auto;
      background: white;
      padding: 40px;
      border: 1px solid #e5e5e5;
    }
    
    .header {
      display: flex;
      justify-content: space-between;
      align-items: start;
      margin-bottom: 40px;
      padding-bottom: 20px;
      border-bottom: 3px solid #E31E24;
    }
    
    .company-info h1 {
      color: #E31E24;
      font-size: 32px;
      margin-bottom: 5px;
    }
    
    .company-info p {
      color: #666;
      font-size: 14px;
    }
    
    .invoice-info {
      text-align: right;
    }
    
    .invoice-info h2 {
      font-size: 24px;
      color: #333;
      margin-bottom: 10px;
    }
    
    .invoice-info p {
      font-size: 14px;
      color: #666;
      margin: 3px 0;
    }
    
    .section {
      margin-bottom: 30px;
    }
    
    .section h3 {
      font-size: 16px;
      color: #E31E24;
      margin-bottom: 10px;
      text-transform: uppercase;
    }
    
    .customer-details, .payment-details {
      background: #f9f9f9;
      padding: 15px;
      border-radius: 5px;
    }
    
    .customer-details p, .payment-details p {
      margin: 5px 0;
      font-size: 14px;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }
    
    table th {
      background: #E31E24;
      color: white;
      padding: 12px;
      text-align: left;
      font-weight: 600;
    }
    
    table td {
      padding: 12px;
      border-bottom: 1px solid #e5e5e5;
    }
    
    .info-icon {
      display: inline-block;
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: #E31E24;
      color: white;
      text-align: center;
      line-height: 16px;
      font-size: 12px;
      font-weight: bold;
      cursor: help;
      margin-left: 5px;
    }
    
    .totals {
      margin-left: auto;
      width: 300px;
    }
    
    .totals table td {
      padding: 8px 12px;
    }
    
    .totals .grand-total {
      background: #f9f9f9;
      font-weight: bold;
      font-size: 18px;
      color: #E31E24;
    }
    
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e5e5e5;
      text-align: center;
      font-size: 12px;
      color: #666;
    }
    
    .stamp {
      margin-top: 40px;
      text-align: right;
      font-style: italic;
      color: #999;
    }
    
    @media print {
      body {
        padding: 0;
      }
      
      .invoice-container {
        border: none;
        padding: 20px;
      }
    }
  </style>
</head>
<body>
  <div class="invoice-container">
    <!-- Header -->
    <div class="header">
      <div class="company-info">
        <h1>BHOOKR</h1>
        <p>Premium Meal Subscription Service</p>
        <p>Hyderabad, Telangana</p>
        <p>Email: bhookr555@gmail.com</p>
        <p>Phone: +91 95427 62906</p>
      </div>
      <div class="invoice-info">
        <h2>INVOICE</h2>
        <p><strong>Invoice #:</strong> ${data.invoiceNumber}</p>
        <p><strong>Date:</strong> ${format(data.orderDate, "dd MMM yyyy")}</p>
        <p><strong>Payment Method:</strong> ${data.paymentMethod}</p>
      </div>
    </div>
    
    <!-- Customer Details -->
    <div class="section">
      <h3>Bill To</h3>
      <div class="customer-details">
        <p><strong>Name:</strong> ${data.customerName}</p>
        <p><strong>Email:</strong> ${data.email}</p>
        <p><strong>Phone:</strong> ${data.phone}</p>
      </div>
    </div>
    
    <!-- Subscription Details -->
    <div class="section">
      <h3>${data.isSubscription ? 'Subscription Details' : 'Order Items'}</h3>
      <table>
        <thead>
          <tr>
            <th>Description</th>
            ${data.isSubscription ? '<th>Duration</th><th>Start Date</th>' : '<th>Quantity</th><th>Unit Price</th>'}
            <th style="text-align: right;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${data.isSubscription ? `
            <tr>
              <td>${data.planName}</td>
              <td>${data.duration}</td>
              <td>${format(data.startDate!, "dd MMM yyyy")}</td>
              <td style="text-align: right;">₹${data.subscriptionAmount!.toLocaleString()}</td>
            </tr>
          ` : data.items?.map(item => `
            <tr>
              <td>${item.name}</td>
              <td>${item.quantity}</td>
              <td>₹${item.price.toLocaleString()}</td>
              <td style="text-align: right;">₹${(item.price * item.quantity).toLocaleString()}</td>
            </tr>
          `).join('') || ''}
        </tbody>
      </table>
    </div>
    
    <!-- Totals -->
    <div class="totals">
      <table>
        ${data.isSubscription ? `
        <tr>
          <td>Subscription Amount:</td>
          <td style="text-align: right;">₹${data.subscriptionAmount!.toLocaleString()}</td>
        </tr>
        <tr>
          <td>GST (5%):</td>
          <td style="text-align: right;">₹${data.subscriptionGST!.toLocaleString()}</td>
        </tr>
        <tr>
          <td>Delivery Charges: <span class="info-icon" title="18% GST on delivery charges only. Basic & Standard: ₹999 + 18% GST, Elite: ₹1,299 + 18% GST">ⓘ</span></td>
          <td style="text-align: right;">₹${data.deliveryCharges!.toLocaleString()}</td>
        </tr>
        <tr>
          <td>Delivery GST (18%):</td>
          <td style="text-align: right;">₹${data.deliveryGST!.toLocaleString()}</td>
        </tr>
        ` : `
        <tr>
          <td>Item Amount:</td>
          <td style="text-align: right;">₹${data.itemAmount!.toLocaleString()}</td>
        </tr>
        <tr>
          <td>GST on Food (5%):</td>
          <td style="text-align: right;">₹${data.itemGST!.toLocaleString()}</td>
        </tr>
        <tr>
          <td>Delivery Charges (₹99 + 18% GST):</td>
          <td style="text-align: right;">₹${(data.deliveryBase! + Math.round(data.deliveryBase! * 0.18)).toLocaleString()}</td>
        </tr>
        `}
        <tr class="grand-total">
          <td>Total Payable Amount:</td>
          <td style="text-align: right;">₹${data.totalAmount.toLocaleString()}</td>
        </tr>
      </table>
    </div>
    
    <!-- Payment Details -->
    <div class="section">
      <h3>Payment Information</h3>
      <div class="payment-details">
        <p><strong>Payment Status:</strong> <span style="color: #22c55e;">PAID</span></p>
        <p><strong>Transaction ID:</strong> ${data.paymentId}</p>
        <p><strong>Payment Method:</strong> ${data.paymentMethod}</p>
        <p><strong>Payment Date:</strong> ${format(data.orderDate, "dd MMM yyyy, hh:mm a")}</p>
      </div>
    </div>
    
    <!-- Footer -->
    <div class="footer">
      <p>Thank you for choosing BHOOKR!</p>
      <p>For any queries, please contact us at bhookr555@gmail.com or call +91 95427 62906</p>
      <p style="margin-top: 10px; font-size: 11px;">
        This is a computer-generated invoice and does not require a signature.
      </p>
    </div>
    
    <div class="stamp">
      <p>Generated on ${format(new Date(), "dd MMM yyyy, hh:mm a")}</p>
    </div>
  </div>
</body>
</html>
  `;
}
