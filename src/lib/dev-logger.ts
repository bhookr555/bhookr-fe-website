/**
 * Development Logger Utility
 * Provides enhanced console logging for localhost testing
 */

export const devLogger = {
  /**
   * Log email delivery status with visual indicators
   */
  emailDelivery: (status: {
    sent: boolean;
    messageId?: string;
    recipient?: string;
    error?: string;
  }) => {
    if (process.env.NODE_ENV !== 'development') return;

    const style = status.sent
      ? 'color: #22c55e; font-weight: bold; font-size: 14px;'
      : 'color: #ef4444; font-weight: bold; font-size: 14px;';

    console.groupCollapsed(
      `%c${status.sent ? '✅ EMAIL DELIVERED' : '❌ EMAIL FAILED'}`,
      style
    );
    
    console.log('📧 Recipient:', status.recipient || 'N/A');
    
    if (status.sent && status.messageId) {
      console.log('🆔 Message ID:', status.messageId);
      console.log('✅ Status: Email sent to Resend successfully');
      console.log('📬 Check inbox:', status.recipient);
    } else if (status.error) {
      console.error('❌ Error:', status.error);
      console.log('💡 Tip: Check RESEND_API_KEY and EMAIL_FROM in .env.local');
    }
    
    console.log('⏰ Timestamp:', new Date().toLocaleTimeString());
    console.groupEnd();
  },

  /**
   * Log API response with email delivery info
   */
  apiResponse: (response: any, endpoint: string) => {
    if (process.env.NODE_ENV !== 'development') return;

    console.groupCollapsed(`🔔 API Response: ${endpoint}`);
    
    if (response.emailDelivery) {
      console.log('\n📧 EMAIL DELIVERY STATUS:');
      devLogger.emailDelivery(response.emailDelivery);
    }
    
    console.log('\n📦 Full Response:', response);
    console.groupEnd();
  },
};

// Browser-only version for client components
export const browserDevLogger = {
  emailDelivery: (status: {
    sent: boolean;
    messageId?: string;
    recipient?: string;
    error?: string;
  }) => {
    if (typeof window === 'undefined') return;
    
    const isDev = window.location.hostname === 'localhost' || 
                  window.location.hostname === '127.0.0.1';
    
    if (!isDev) return;

    const style = status.sent
      ? 'background: #22c55e; color: white; padding: 4px 8px; border-radius: 3px; font-weight: bold;'
      : 'background: #ef4444; color: white; padding: 4px 8px; border-radius: 3px; font-weight: bold;';

    console.log(
      `%c${status.sent ? '✅ EMAIL SENT' : '❌ EMAIL FAILED'}`,
      style
    );
    
    if (status.sent) {
      console.table({
        Status: '✅ Delivered to Resend',
        Recipient: status.recipient,
        'Message ID': status.messageId,
        Timestamp: new Date().toLocaleString(),
      });
      console.log(`📬 Check inbox: ${status.recipient}`);
    } else {
      console.error('Error:', status.error);
      console.warn('💡 Using onboarding@resend.dev? Only sends to your verified Resend email');
    }
  },

  apiSuccess: (message: string, data?: any) => {
    if (typeof window === 'undefined') return;
    const isDev = window.location.hostname === 'localhost';
    if (!isDev) return;

    console.log(
      `%c✅ ${message}`,
      'background: #22c55e; color: white; padding: 2px 6px; border-radius: 3px;'
    );
    if (data) console.log(data);
  },
};
