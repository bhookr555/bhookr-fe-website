/**
 * Email Service
 * 
 * Handles all email sending operations with retry logic and error handling.
 */

import { getEmailClient, EMAIL_CONFIG } from './config';
import logger from '@/lib/logger';

export interface EmailParams {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  cc?: string[];
  bcc?: string[];
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Send email with retry logic
 */
export async function sendEmail(
  params: EmailParams,
  options: {
    maxRetries?: number;
    retryDelay?: number;
  } = {}
): Promise<EmailResult> {
  const { maxRetries = 3, retryDelay = 1000 } = options;
  
  let lastError: Error | null = null;
  
  // Validate API key exists
  if (!process.env.RESEND_API_KEY) {
    logger.error('[Email] RESEND_API_KEY not configured. Cannot send email.');
    return {
      success: false,
      error: 'Email service not configured (missing API key)',
    };
  }
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      logger.info('[Email] Sending email', {
        to: Array.isArray(params.to) ? params.to.join(', ') : params.to,
        subject: params.subject,
        from: EMAIL_CONFIG.from,
        attempt: attempt + 1,
        hasApiKey: !!process.env.RESEND_API_KEY,
      });
      
      const client = getEmailClient();
      
      const result = await client.emails.send({
        from: EMAIL_CONFIG.from,
        to: params.to,
        subject: params.subject,
        html: params.html,
        text: params.text,
        reply_to: params.replyTo || EMAIL_CONFIG.replyTo,
        cc: params.cc,
        bcc: params.bcc,
      });
      
      // Resend returns { data: { id: string } } or { id: string } depending on version
      const messageId = (result as any).data?.id || (result as any).id || 'unknown';
      
      logger.info('[Email] ✅ Email sent successfully!', {
        messageId,
        to: params.to,
        subject: params.subject,
      });
      
      return {
        success: true,
        messageId,
      };
    } catch (error) {
      lastError = error as Error;
      logger.error('[Email] ❌ Failed to send email', lastError, {
        to: params.to,
        subject: params.subject,
        attempt: attempt + 1,
        errorMessage: lastError.message,
        errorName: lastError.name,
      });
      
      // Wait before retry (exponential backoff)
      if (attempt < maxRetries - 1) {
        const delay = retryDelay * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  // All retries failed
  logger.error('[Email] Failed to send email after all retries', lastError!, {
    to: params.to,
    subject: params.subject,
    maxRetries,
  });
  
  return {
    success: false,
    error: lastError?.message || 'Failed to send email',
  };
}

/**
 * Send bulk emails (for batch operations)
 */
export async function sendBulkEmails(
  emails: EmailParams[],
  options: {
    batchSize?: number;
    delayBetweenBatches?: number;
  } = {}
): Promise<{ sent: number; failed: number; errors: string[] }> {
  const { batchSize = 10, delayBetweenBatches = 1000 } = options;
  
  let sent = 0;
  let failed = 0;
  const errors: string[] = [];
  
  // Process in batches to avoid rate limits
  for (let i = 0; i < emails.length; i += batchSize) {
    const batch = emails.slice(i, i + batchSize);
    
    const results = await Promise.allSettled(
      batch.map(email => sendEmail(email))
    );
    
    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value.success) {
        sent++;
      } else {
        failed++;
        const email = batch[index];
        const error = result.status === 'rejected' 
          ? result.reason 
          : result.value.error;
        errors.push(`Failed to send to ${email?.to}: ${error}`);
      }
    });
    
    // Delay between batches
    if (i + batchSize < emails.length) {
      await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
    }
  }
  
  logger.info('[Email] Bulk email sending completed', {
    total: emails.length,
    sent,
    failed,
  });
  
  return { sent, failed, errors };
}
