/**
 * Admin Alert Notifications
 * 
 * This module handles critical alerts that need admin attention,
 * such as payment verification failures where money was deducted.
 */

import logger from '@/lib/logger';

export interface AdminAlert {
  type: 'PAYMENT_VERIFICATION_FAILED' | 'REFUND_REQUIRED' | 'ORDER_ISSUE';
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  title: string;
  message: string;
  orderId?: string;
  paymentId?: string;
  userId?: string;
  amount?: number;
  metadata?: Record<string, any>;
  timestamp: Date;
}

/**
 * Send alert to admin
 * 
 * In production, this should:
 * 1. Send email to admin team
 * 2. Post to Slack/Teams channel
 * 3. Create ticket in support system
 * 4. Log to monitoring service (Sentry, DataDog, etc.)
 */
export async function sendAdminAlert(alert: AdminAlert): Promise<void> {
  try {
    // Log the alert
    logger.security(`[Admin Alert] ${alert.type}`, {
      ...alert,
      severity: alert.severity,
    });

    // Production: Implement email notification service
    // Integration options: SendGrid, AWS SES, Mailgun, Postmark
    // await sendEmail({
    //   to: process.env.ADMIN_EMAIL,
    //   subject: `[${alert.severity}] ${alert.title}`,
    //   body: formatAlertEmail(alert),
    // });

    // Production: Implement Slack/Teams notification for critical alerts
    // if (alert.severity === 'CRITICAL') {
    //   await postToSlack({
    //     channel: '#payment-alerts',
    //     message: formatSlackMessage(alert),
    //   });
    // }

    // Production: Store alert in Firestore for admin dashboard view
    // await saveAlertToDatabase(alert);

    // For now, just log to console in a visible format
    if (process.env.NODE_ENV === 'development') {
      console.error('\n' + '='.repeat(80));
      console.error(`🚨 ADMIN ALERT [${alert.severity}]: ${alert.type}`);
      console.error('='.repeat(80));
      console.error(`Title: ${alert.title}`);
      console.error(`Message: ${alert.message}`);
      if (alert.orderId) console.error(`Order ID: ${alert.orderId}`);
      if (alert.paymentId) console.error(`Payment ID: ${alert.paymentId}`);
      if (alert.userId) console.error(`User ID: ${alert.userId}`);
      if (alert.amount) console.error(`Amount: ₹${alert.amount}`);
      if (alert.metadata) console.error('Metadata:', JSON.stringify(alert.metadata, null, 2));
      console.error(`Timestamp: ${alert.timestamp.toISOString()}`);
      console.error('='.repeat(80) + '\n');
    }
  } catch (error) {
    logger.error('[Admin Alert] Failed to send admin alert', error as Error, {
      alertType: alert.type,
    });
  }
}

/**
 * Create alert for payment verification failure with captured payment
 */
export async function alertPaymentVerificationFailed(params: {
  orderId: string;
  paymentId: string;
  userId: string;
  amount: number;
  paymentStatus: string;
  razorpayOrderId: string;
}): Promise<void> {
  await sendAdminAlert({
    type: 'PAYMENT_VERIFICATION_FAILED',
    severity: 'CRITICAL',
    title: 'Payment Captured but Verification Failed',
    message: `Payment was successfully captured on Razorpay but signature verification failed. This requires immediate manual review to prevent customer loss.`,
    orderId: params.orderId,
    paymentId: params.paymentId,
    userId: params.userId,
    amount: params.amount,
    metadata: {
      paymentStatus: params.paymentStatus,
      razorpayOrderId: params.razorpayOrderId,
      action: 'MANUAL_REVIEW_REQUIRED',
      steps: [
        '1. Verify payment on Razorpay dashboard',
        '2. Check if signature keys match (test vs live)',
        '3. Manually update order status to PAID if payment is valid',
        '4. Investigate root cause of verification failure',
      ],
    },
    timestamp: new Date(),
  });
}

/**
 * Create alert for potential refund requirement
 */
export async function alertRefundRequired(params: {
  orderId: string;
  paymentId: string;
  userId: string;
  amount: number;
  reason: string;
}): Promise<void> {
  await sendAdminAlert({
    type: 'REFUND_REQUIRED',
    severity: 'HIGH',
    title: 'Refund Required',
    message: params.reason,
    orderId: params.orderId,
    paymentId: params.paymentId,
    userId: params.userId,
    amount: params.amount,
    timestamp: new Date(),
  });
}
