/**
 * Email Service Configuration
 * 
 * This module handles email service initialization and configuration.
 * Using Resend for transactional emails.
 * 
 * Setup:
 * 1. Sign up at https://resend.com
 * 2. Get API key
 * 3. Add to .env.local: RESEND_API_KEY=re_xxxxx
 * 4. Verify domain (for production)
 */

import { Resend } from 'resend';
import logger from '@/lib/logger';

let resendClient: Resend | null = null;

/**
 * Initialize Resend client
 */
export function getEmailClient(): Resend {
  if (!resendClient) {
    const apiKey = process.env.RESEND_API_KEY;
    
    if (!apiKey) {
      logger.warn('[Email] RESEND_API_KEY not configured. Emails will be logged only.');
      // Return a mock client for development
      return {
        emails: {
          send: async (params: any) => {
            logger.info('[Email] Mock send (no API key configured)', {
              to: params.to,
              subject: params.subject,
            });
            return { id: `mock-${Date.now()}`, from: params.from, to: params.to };
          },
        },
      } as any;
    }
    
    resendClient = new Resend(apiKey);
    logger.info('[Email] Resend client initialized');
  }
  
  return resendClient;
}

/**
 * Email configuration
 */
export const EMAIL_CONFIG = {
  from: process.env.EMAIL_FROM || 'Bhookr <noreply@bhookr.com>',
  replyTo: process.env.EMAIL_REPLY_TO || 'support@bhookr.com',
  
  // Email templates
  templates: {
    ORDER_CONFIRMATION: 'order-confirmation',
    PAYMENT_RECEIPT: 'payment-receipt',
    SUBSCRIPTION_ACTIVATED: 'subscription-activated',
    SUBSCRIPTION_PAUSED: 'subscription-paused',
    SUBSCRIPTION_RESUMED: 'subscription-resumed',
    SUBSCRIPTION_EXPIRED: 'subscription-expired',
    PLAN_UPGRADED: 'plan-upgraded',
    PLAN_DOWNGRADED: 'plan-downgraded',
    PAYMENT_FAILED: 'payment-failed',
  },
} as const;

/**
 * Validate email configuration
 */
export function validateEmailConfig(): {
  isConfigured: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  if (!process.env.RESEND_API_KEY) {
    errors.push('RESEND_API_KEY is not configured');
  }
  
  if (!process.env.EMAIL_FROM) {
    errors.push('EMAIL_FROM is not configured (using default)');
  }
  
  return {
    isConfigured: errors.length === 0,
    errors,
  };
}
