/**
 * Transaction Rollback and Compensation Service
 * 
 * Implements compensating transactions for distributed operations.
 * Since we don't have distributed transactions across Firestore + Payment Gateway + Google Sheets,
 * we implement the Saga pattern with compensations.
 */

import logger from '@/lib/logger';
import { adminDb } from '@/lib/firebase/admin';
import { initiateRefund } from '@/lib/payment/razorpay';

export interface Transaction {
  id: string;
  type: 'payment' | 'subscription' | 'order' | 'google_sheets';
  status: 'pending' | 'completed' | 'failed' | 'rolled_back';
  data: any;
  compensationExecuted?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CompensationAction {
  type: string;
  action: () => Promise<void>;
  description: string;
}

const TRANSACTIONS_COLLECTION = 'saga_transactions';

/**
 * Store transaction step
 */
export async function recordTransaction(
  transactionId: string,
  type: Transaction['type'],
  data: any
): Promise<void> {
  if (!adminDb) {
    logger.warn('[Saga] Firestore not initialized, skipping transaction record');
    return;
  }
  
  try {
    await adminDb
      .collection(TRANSACTIONS_COLLECTION)
      .doc(`${transactionId}-${type}`)
      .set({
        id: transactionId,
        type,
        status: 'pending',
        data,
        compensationExecuted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    
    logger.info('[Saga] Transaction step recorded', {
      transactionId,
      type,
    });
  } catch (error) {
    logger.error('[Saga] Failed to record transaction', error as Error, {
      transactionId,
      type,
    });
  }
}

/**
 * Mark transaction step as completed
 */
export async function markTransactionCompleted(
  transactionId: string,
  type: Transaction['type']
): Promise<void> {
  if (!adminDb) return;
  
  try {
    await adminDb
      .collection(TRANSACTIONS_COLLECTION)
      .doc(`${transactionId}-${type}`)
      .update({
        status: 'completed',
        updatedAt: new Date(),
      });
    
    logger.info('[Saga] Transaction step completed', {
      transactionId,
      type,
    });
  } catch (error) {
    logger.error('[Saga] Failed to mark transaction completed', error as Error);
  }
}

/**
 * Execute compensating transactions (rollback)
 */
export async function executeCompensation(
  transactionId: string,
  compensations: CompensationAction[]
): Promise<void> {
  logger.info('[Saga] Starting compensation', {
    transactionId,
    steps: compensations.length,
  });
  
  const results: Array<{ type: string; success: boolean; error?: string }> = [];
  
  // Execute compensations in reverse order
  for (const compensation of compensations.reverse()) {
    try {
      logger.info('[Saga] Executing compensation', {
        type: compensation.type,
        description: compensation.description,
      });
      
      await compensation.action();
      
      results.push({ type: compensation.type, success: true });
      
      logger.info('[Saga] Compensation executed successfully', {
        type: compensation.type,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      logger.error('[Saga] Compensation failed', error as Error, {
        type: compensation.type,
        description: compensation.description,
      });
      
      results.push({
        type: compensation.type,
        success: false,
        error: errorMessage,
      });
      
      // Continue with other compensations even if one fails
    }
  }
  
  // Record compensation execution
  if (adminDb) {
    try {
      await adminDb
        .collection(TRANSACTIONS_COLLECTION)
        .doc(transactionId)
        .set({
          transactionId,
          compensationResults: results,
          compensationExecutedAt: new Date(),
        }, { merge: true });
    } catch (error) {
      logger.error('[Saga] Failed to record compensation results', error as Error);
    }
  }
  
  logger.info('[Saga] Compensation completed', {
    transactionId,
    successful: results.filter(r => r.success).length,
    failed: results.filter(r => !r.success).length,
  });
}

/**
 * Subscription Creation Saga with Rollback
 */
export async function createSubscriptionWithRollback(
  orderId: string,
  subscriptionData: any,
  invoiceData: any
): Promise<{ success: boolean; subscription?: any; error?: string }> {
  const transactionId = `subscription-${orderId}-${Date.now()}`;
  const compensations: CompensationAction[] = [];
  
  let subscription: any = null;
  let googleSheetsSuccess = false;
  
  try {
    // Step 1: Create subscription in Firestore
    logger.info('[Saga] Step 1: Creating subscription in Firestore', { transactionId });
    await recordTransaction(transactionId, 'subscription', subscriptionData);
    
    const { createSubscription } = await import('@/lib/firebase/firestore');
    subscription = await createSubscription(subscriptionData);
    
    await markTransactionCompleted(transactionId, 'subscription');
    
    // Add compensation for subscription creation
    compensations.push({
      type: 'delete_subscription',
      description: 'Delete subscription from Firestore',
      action: async () => {
        if (!adminDb || !subscription?.id) return;
        await adminDb
          .collection('subscriptions')
          .doc(subscription.id)
          .update({
            status: 'cancelled',
            cancelledAt: new Date(),
            cancellationReason: 'Transaction rollback - payment or data sync failed',
          });
        logger.info('[Saga] Compensation: Subscription cancelled', { subscriptionId: subscription.id });
      },
    });
    
    // Step 2: Submit to Google Sheets (truly non-blocking, best effort)
    // Fire and forget - don't await to prevent blocking subscription creation
    (async () => {
      try {
        // Check if Google Sheets URLs are configured
        const subscriptionsSheetUrl = process.env.NEXT_PUBLIC_SUBSCRIPTIONS_SHEET_URL;
        
        if (!subscriptionsSheetUrl || subscriptionsSheetUrl.includes('YOUR_')) {
          logger.info('[Saga] Google Sheets not configured, skipping sync', { transactionId });
          return;
        }
        
        logger.info('[Saga] Step 2: Syncing to Google Sheets (background)', { transactionId });
        await recordTransaction(transactionId, 'google_sheets', {
          orderId,
          email: subscriptionData.userEmail,
        });
        
        const { submitSubscriptionToSheet } = await import('@/lib/google-sheets');
        
        // Prepare subscription data for Google Sheets
        const sheetData = {
          name: subscriptionData.personalInfo?.fullName || '',
          email: subscriptionData.userEmail || '',
          phoneNumber: subscriptionData.personalInfo?.phoneNumber || '',
          age: subscriptionData.personalInfo?.age || 0,
          gender: subscriptionData.physicalInfo?.gender || '',
          height: subscriptionData.physicalInfo?.height || 0,
          weight: subscriptionData.physicalInfo?.weight || 0,
          goal: subscriptionData.goalSelection?.goal || '',
          diet: subscriptionData.dietSelection?.dietType || '',
          foodPreference: subscriptionData.foodPreferenceSelection?.foodPreference || '',
          physicalState: subscriptionData.activityAndDuration?.activityLevel || '',
          subscriptionType: subscriptionData.activityAndDuration?.duration || '',
          plan: subscriptionData.planSelection?.selectedMeals || [],
          subscriptionStartDate: subscriptionData.startDate?.toISOString() || new Date().toISOString(),
          paymentStatus: 'success' as const,
          transactionId: invoiceData.paymentId || '',
          orderId: orderId,
          amountPaid: invoiceData.totalAmount || 0,
          paymentMethod: 'online',
          paymentTimestamp: new Date().toISOString(),
        };
        
        await submitSubscriptionToSheet(sheetData);
        googleSheetsSuccess = true;
        
        await markTransactionCompleted(transactionId, 'google_sheets');
        
        logger.info('[Saga] Google Sheets sync successful', { transactionId });
      } catch (sheetsError) {
        // Google Sheets failure is non-critical, log but don't rollback
        logger.warn('[Saga] Google Sheets sync failed (non-critical)', {
          error: sheetsError instanceof Error ? sheetsError.message : 'Unknown error',
          transactionId,
        });
        
        // Store error for manual retry
        if (adminDb) {
          try {
            await adminDb
              .collection('failed_google_sheets_syncs')
              .add({
                orderId,
                subscriptionId: subscription.id,
                error: sheetsError instanceof Error ? sheetsError.message : 'Unknown error',
                retryCount: 0,
                createdAt: new Date(),
                status: 'pending_retry',
              });
          } catch (dbError) {
            logger.error('[Saga] Failed to store retry record', dbError as Error);
          }
        }
      }
    })().catch(err => {
      // Catch any unhandled promise rejection to prevent crashes
      logger.error('[Saga] Unhandled error in Google Sheets background sync', err as Error);
    });
    
    logger.info('[Saga] Subscription creation saga completed successfully', {
      transactionId,
      subscriptionId: subscription.id,
      googleSheetsSuccess,
    });
    
    return {
      success: true,
      subscription,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    logger.error('[Saga] Subscription creation saga failed, executing rollback', error as Error, {
      transactionId,
      step: compensations.length,
    });
    
    // Execute compensating transactions
    await executeCompensation(transactionId, compensations);
    
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Payment Refund with Retry
 */
export async function refundPaymentWithRetry(
  paymentId: string,
  amount?: number,
  reason?: string,
  maxRetries: number = 3
): Promise<{ success: boolean; refundId?: string; error?: string }> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      logger.info('[Saga] Attempting payment refund', {
        paymentId,
        amount,
        attempt: attempt + 1,
      });
      
      const refund = await initiateRefund(
        paymentId,
        amount ? Math.round(amount * 100) : undefined, // Convert to paise
        { reason: reason || 'Transaction rollback' }
      );
      
      logger.info('[Saga] Payment refunded successfully', {
        paymentId,
        refundId: refund.id,
      });
      
      return {
        success: true,
        refundId: refund.id,
      };
    } catch (error) {
      lastError = error as Error;
      
      logger.error('[Saga] Refund attempt failed', lastError, {
        paymentId,
        attempt: attempt + 1,
      });
      
      // Wait before retry
      if (attempt < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000 * (attempt + 1)));
      }
    }
  }
  
  // All retries failed - alert admin
  logger.error('[Saga] CRITICAL: Refund failed after all retries', lastError!, {
    paymentId,
    amount,
    message: 'Manual refund required',
  });
  
  return {
    success: false,
    error: lastError?.message || 'Refund failed after all retries',
  };
}
