/**
 * Subscription Expiry Handler Cron Job
 * 
 * Runs daily to:
 * 1. Mark expired subscriptions
 * 2. Send expiry notifications
 * 3. Apply pending plan downgrades
 * 
 * Schedule: Daily at midnight (0 0 * * *)
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import logger from '@/lib/logger';
// DISABLED: Email notifications disabled
// import { sendEmail, generateSubscriptionExpiredEmail } from '@/lib/email';
import { updateSubscriptionStatus } from '@/lib/google-sheets';

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET || 'dev-secret-change-in-production';
    
    if (authHeader !== `Bearer ${cronSecret}`) {
      logger.warn('[Cron] Unauthorized expiry check attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    if (!adminDb) {
      logger.error('[Cron] Firebase Admin not initialized');
      return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
    }
    
    const now = new Date();
    logger.info('[Cron] Starting subscription expiry check', {
      timestamp: now.toISOString(),
    });
    
    // Find all active subscriptions that have expired
    const expiredSnapshot = await adminDb
      .collection('subscriptions')
      .where('status', '==', 'active')
      .where('endDate', '<', now)
      .get();
    
    if (expiredSnapshot.empty) {
      logger.info('[Cron] No expired subscriptions found');
      return NextResponse.json({
        success: true,
        message: 'No expired subscriptions',
        expired: 0,
      });
    }
    
    const results: Array<{
      subscriptionId: string;
      status: 'success' | 'failed';
      error?: string;
    }> = [];
    
    // Process each expired subscription
    for (const doc of expiredSnapshot.docs) {
      const subscription = doc.data();
      const subscriptionId = doc.id;
      
      try {
        logger.info('[Cron] Processing expired subscription', {
          subscriptionId,
          userEmail: subscription.userEmail,
          planName: subscription.planName,
        });
        
        // Check if there's a pending plan change (downgrade)
        if (subscription.pendingPlanChange?.type === 'downgrade') {
          logger.info('[Cron] Applying pending downgrade', { subscriptionId });
          
          const newPlan = subscription.pendingPlanChange.newPlan;
          
          // Apply the downgrade
          await doc.ref.update({
            status: 'active', // Keep active with new plan
            planType: newPlan.planType,
            planName: `${newPlan.planType} Plan`,
            'dietSelection.dietType': newPlan.dietType,
            'foodPreferenceSelection.foodPreference': newPlan.foodPreference,
            'activityAndDuration.duration': newPlan.duration,
            pendingPlanChange: null,
            lastPlanChange: {
              from: subscription.planType,
              to: newPlan.planType,
              changedAt: now,
              type: 'downgrade',
            },
            updatedAt: now,
          });
          
          logger.info('[Cron] Downgrade applied successfully', { subscriptionId });
          
          results.push({ subscriptionId, status: 'success' });
          continue; // Don't mark as expired, keep active with new plan
        }
        
        // Mark as expired
        await doc.ref.update({
          status: 'expired',
          expiredAt: now,
          updatedAt: now,
        });
        
        // Update Google Sheets
        try {
          await updateSubscriptionStatus(
            subscription.orderId || subscriptionId,
            'expired',
            'Subscription period ended'
          );
        } catch (sheetsError) {
          logger.warn('[Cron] Failed to update Google Sheets', {
            error: sheetsError instanceof Error ? sheetsError.message : 'Unknown error',
            subscriptionId,
          });
        }
        
        // Send expiry email
        // DISABLED: Email notifications disabled
        // try {
        //   const emailContent = generateSubscriptionExpiredEmail({
        //     customerName: subscription.personalInfo?.fullName || 'Customer',
        //     planName: subscription.planName,
        //     endDate: subscription.endDate.toDate ? subscription.endDate.toDate() : subscription.endDate,
        //   });
        //   
        //   await sendEmail({
        //     to: subscription.userEmail,
        //     subject: emailContent.subject,
        //     html: emailContent.html,
        //     text: emailContent.text,
        //   });
        //   
        //   logger.info('[Cron] Expiry email sent', {
        //     subscriptionId,
        //     email: subscription.userEmail,
        //   });
        // } catch (emailError) {
        //   logger.error('[Cron] Failed to send expiry email', emailError as Error, {
        //     subscriptionId,
        //   });
        // }
        
        results.push({ subscriptionId, status: 'success' });
        
        logger.info('[Cron] Subscription marked as expired', { subscriptionId });
      } catch (error) {
        logger.error('[Cron] Failed to process expired subscription', error as Error, {
          subscriptionId,
        });
        
        results.push({
          subscriptionId,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
    
    const successCount = results.filter(r => r.status === 'success').length;
    const failedCount = results.filter(r => r.status === 'failed').length;
    
    logger.info('[Cron] Subscription expiry check completed', {
      total: results.length,
      successful: successCount,
      failed: failedCount,
    });
    
    return NextResponse.json({
      success: true,
      message: `Processed ${results.length} expired subscriptions`,
      total: results.length,
      successful: successCount,
      failed: failedCount,
      results,
    });
  } catch (error) {
    logger.error('[Cron] Subscription expiry check failed', error as Error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process expiries',
      },
      { status: 500 }
    );
  }
}
