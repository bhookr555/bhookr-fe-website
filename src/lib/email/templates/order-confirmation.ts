/**
 * Order Confirmation Email Template
 */

export interface OrderConfirmationData {
  customerName: string;
  orderId: string;
  orderDate: Date;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
  totalAmount: number;
  paymentMethod: string;
  transactionId: string;
  deliveryAddress?: {
    fullName: string;
    address: string;
    city: string;
    state: string;
    pinCode: string;
    phone: string;
  };
  subscriptionDetails?: {
    planName: string;
    duration: string;
    startDate: Date;
  };
}

export function generateOrderConfirmationEmail(data: OrderConfirmationData): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = `Order Confirmed - ${data.orderId}`;
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Order Confirmation</title>
  <style>
    body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #ef4444 0%, #f97316 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .header h1 { margin: 0; font-size: 28px; }
    .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
    .success-badge { background: #10b981; color: white; padding: 8px 16px; border-radius: 20px; display: inline-block; font-weight: bold; margin-bottom: 20px; }
    .order-info { background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .order-info h2 { margin-top: 0; color: #1f2937; font-size: 18px; }
    .info-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
    .info-row:last-child { border-bottom: none; }
    .info-label { color: #6b7280; }
    .info-value { font-weight: 600; color: #1f2937; }
    .items-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    .items-table th { background: #f3f4f6; padding: 12px; text-align: left; font-weight: 600; }
    .items-table td { padding: 12px; border-bottom: 1px solid #e5e7eb; }
    .total-row { font-weight: bold; font-size: 18px; color: #10b981; }
    .address-box { background: #fef3c7; padding: 15px; border-left: 4px solid #f59e0b; margin: 20px 0; border-radius: 4px; }
    .cta-button { display: inline-block; background: #ef4444; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0; }
    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
    .divider { border-top: 2px solid #e5e7eb; margin: 30px 0; }
  </style>
</head>
<body>
  <div class="header">
    <h1>🎉 Order Confirmed!</h1>
  </div>
  
  <div class="content">
    <div class="success-badge">✓ Payment Successful</div>
    
    <p>Hi <strong>${data.customerName}</strong>,</p>
    
    <p>Thank you for your order! We've received your payment and ${data.subscriptionDetails ? 'your subscription is now active' : 'your order will be delivered in 2-3 days'}.</p>
    
    <div class="order-info">
      <h2>Order Details</h2>
      <div class="info-row">
        <span class="info-label">Order ID:</span>
        <span class="info-value">${data.orderId}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Order Date:</span>
        <span class="info-value">${data.orderDate.toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Payment Method:</span>
        <span class="info-value">${data.paymentMethod}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Transaction ID:</span>
        <span class="info-value">${data.transactionId}</span>
      </div>
    </div>
    
    ${data.subscriptionDetails ? `
    <div class="order-info">
      <h2>📅 Subscription Details</h2>
      <div class="info-row">
        <span class="info-label">Plan:</span>
        <span class="info-value">${data.subscriptionDetails.planName}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Duration:</span>
        <span class="info-value">${data.subscriptionDetails.duration}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Start Date:</span>
        <span class="info-value">${data.subscriptionDetails.startDate.toLocaleDateString('en-IN')}</span>
      </div>
    </div>
    ` : ''}
    
    <table class="items-table">
      <thead>
        <tr>
          <th>Item</th>
          <th style="text-align: center;">Qty</th>
          <th style="text-align: right;">Price</th>
        </tr>
      </thead>
      <tbody>
        ${data.items.map(item => `
        <tr>
          <td>${item.name}</td>
          <td style="text-align: center;">${item.quantity}</td>
          <td style="text-align: right;">₹${item.price.toLocaleString()}</td>
        </tr>
        `).join('')}
        <tr class="total-row">
          <td colspan="2">Total Amount Paid</td>
          <td style="text-align: right;">₹${data.totalAmount.toLocaleString()}</td>
        </tr>
      </tbody>
    </table>
    
    ${data.deliveryAddress ? `
    <div class="address-box">
      <h3 style="margin-top: 0;">📍 Delivery Address</h3>
      <p style="margin: 5px 0;"><strong>${data.deliveryAddress.fullName}</strong></p>
      <p style="margin: 5px 0;">${data.deliveryAddress.address}</p>
      <p style="margin: 5px 0;">${data.deliveryAddress.city}, ${data.deliveryAddress.state} - ${data.deliveryAddress.pinCode}</p>
      <p style="margin: 5px 0;">📞 ${data.deliveryAddress.phone}</p>
    </div>
    ` : ''}
    
    <div class="divider"></div>
    
    <h3>What's Next?</h3>
    <ul>
      <li>${data.subscriptionDetails ? `Your subscription will start on ${data.subscriptionDetails.startDate.toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}` : 'Your order will be delivered in 2-3 days'}</li>
      <li>You'll receive delivery updates via email and SMS</li>
      ${data.subscriptionDetails ? '<li>Manage your subscription anytime from your dashboard</li>' : '<li>Our team will contact you for delivery confirmation</li>'}
      <li>Contact us anytime for support</li>
    </ul>
    
    ${data.subscriptionDetails ? `
    <center>
      <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://bhookr.com'}/my-subscription" class="cta-button">View Subscription</a>
    </center>
    ` : ''}
  </div>
  
  <div class="footer">
    <p>Need help? Contact us at <a href="mailto:support@bhookr.com">support@bhookr.com</a></p>
    <p>© ${new Date().getFullYear()} Bhookr. All rights reserved.</p>
  </div>
</body>
</html>
  `.trim();
  
  const text = `
Order Confirmed - ${data.orderId}

Hi ${data.customerName},

Thank you for your order! We've received your payment and ${data.subscriptionDetails ? 'your subscription is now active' : 'your order will be delivered in 2-3 days'}.

Order Details:
- Order ID: ${data.orderId}
- Order Date: ${data.orderDate.toLocaleDateString('en-IN')}
- Payment Method: ${data.paymentMethod}
- Transaction ID: ${data.transactionId}

${data.subscriptionDetails ? `
Subscription Details:
- Plan: ${data.subscriptionDetails.planName}
- Duration: ${data.subscriptionDetails.duration}
- Start Date: ${data.subscriptionDetails.startDate.toLocaleDateString('en-IN')}
` : ''}

Items:
${data.items.map(item => `- ${item.name} (x${item.quantity}): ₹${item.price.toLocaleString()}`).join('\n')}

Total Amount Paid: ₹${data.totalAmount.toLocaleString()}

${data.deliveryAddress ? `
Delivery Address:
${data.deliveryAddress.fullName}
${data.deliveryAddress.address}
${data.deliveryAddress.city}, ${data.deliveryAddress.state} - ${data.deliveryAddress.pinCode}
Phone: ${data.deliveryAddress.phone}
` : ''}

What's Next?
- ${data.subscriptionDetails ? `Your subscription will start on ${data.subscriptionDetails.startDate.toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}` : 'Your order will be delivered in 2-3 days'}
- You'll receive delivery updates via email and SMS
${data.subscriptionDetails ? `- Manage your subscription at: ${process.env.NEXT_PUBLIC_APP_URL || 'https://bhookr.com'}/my-subscription` : '- Our team will contact you for delivery confirmation'}

Need help? Contact us at support@bhookr.com

© ${new Date().getFullYear()} Bhookr. All rights reserved.
  `.trim();
  
  return { subject, html, text };
}
