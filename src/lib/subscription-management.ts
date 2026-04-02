/**
 * Subscription Management Service
 * 
 * Handles pause/resume, upgrade/downgrade operations.
 */

import { adminDb } from '@/lib/firebase/admin';
import logger from '@/lib/logger';
import { calculateUpgradeProration } from './proration';
// DISABLED: Email notifications disabled
// import { sendEmail } from './email/service';
// import { 
//   generateSubscriptionPausedEmail, 
//   generateSubscriptionResumedEmail, 
//   generatePlanChangeEmail 
// } from './email/templates/subscription-status';
import { trackError, ErrorFactory } from './error-tracking';
import type { PlanType, SubscriptionDuration, DietType, FoodPreference } from '@/types/subscription';
import type { Timestamp } from 'firebase-admin/firestore';

/**
 * Helper function to convert Firestore Timestamp to Date
 */
function toDate(value: Date | Timestamp | string | any): Date {
  if (value instanceof Date) return value;
  if (typeof value === 'string') return new Date(value);
  if (value && typeof value.toDate === 'function') return value.toDate();
  return new Date();
}

export interface SubscriptionData {
  id: string;
  userId: string;
  userEmail: string;
  planName: string;
  planType: PlanType;
  status: 'active' | 'paused' | 'cancelled' | 'expired';
  startDate: Date;
  endDate: Date;
  price: number;
  orderId?: string;
  personalInfo?: any;
  physicalInfo?: any;
  planSelection?: any;
  activityAndDuration?: any;
  dietSelection?: any;
  foodPreferenceSelection?: any;
  pausedAt?: Date;
  pauseReason?: string;
  resumedAt?: Date;
}

/**
 * Pause subscription
 */
export async function pauseSubscription(
  subscriptionId: string,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  if (!adminDb) {
    return { success: false, error: 'Database not available' };
  }
  
  try {
    logger.info('[Subscription] Pausing subscription', { subscriptionId, reason });
    
    // Get subscription
    const subscriptionDoc = await adminDb
      .collection('subscriptions')
      .doc(subscriptionId)
      .get();
    
    if (!subscriptionDoc.exists) {
      throw ErrorFactory.subscription('Subscription not found', { subscriptionId });
    }
    
    const subscription = subscriptionDoc.data() as SubscriptionData;
    
    // Validate status
    if (subscription.status !== 'active') {
      return {
        success: false,
        error: 'Only active subscriptions can be paused',
      };
    }
    
    // Update subscription
    await subscriptionDoc.ref.update({
      status: 'paused',
      pausedAt: new Date(),
      pauseReason: reason || 'User requested',
      updatedAt: new Date(),
    });
    
    logger.info('[Subscription] Subscription paused successfully', { subscriptionId });
    
    // Send email notification
    // DISABLED: Email notifications disabled
    // try {
    //   const emailContent = generateSubscriptionPausedEmail({
    //     customerName: subscription.personalInfo?.fullName || 'Customer',
    //     planName: subscription.planName,
    //   });
    //   
    //   await sendEmail({
    //     to: subscription.userEmail,
    //     subject: emailContent.subject,
    //     html: emailContent.html,
    //     text: emailContent.text,
    //   });
    // } catch (emailError) {
    //   logger.error('[Subscription] Failed to send pause email', emailError as Error);
    //   // Don't fail operation if email fails
    // }
    
    return { success: true };
  } catch (error) {
    logger.error('[Subscription] Failed to pause subscription', error as Error, { subscriptionId });
    await trackError(error as Error, 'high', 'subscription', { subscriptionId });
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to pause subscription',
    };
  }
}

/**
 * Resume subscription
 */
export async function resumeSubscription(
  subscriptionId: string
): Promise<{ success: boolean; error?: string }> {
  if (!adminDb) {
    return { success: false, error: 'Database not available' };
  }
  
  try {
    logger.info('[Subscription] Resuming subscription', { subscriptionId });
    
    // Get subscription
    const subscriptionDoc = await adminDb
      .collection('subscriptions')
      .doc(subscriptionId)
      .get();
    
    if (!subscriptionDoc.exists) {
      throw ErrorFactory.subscription('Subscription not found', { subscriptionId });
    }
    
    const subscription = subscriptionDoc.data() as SubscriptionData;
    
    // Validate status
    if (subscription.status !== 'paused') {
      return {
        success: false,
        error: 'Only paused subscriptions can be resumed',
      };
    }
    
    // Check if subscription has expired
    const now = new Date();
    const endDate = toDate(subscription.endDate as any);
    
    if (endDate < now) {
      return {
        success: false,
        error: 'Subscription has expired. Please create a new subscription.',
      };
    }
    
    // Calculate new delivery start date (tomorrow or user's next scheduled day)
    const resumeDate = new Date();
    resumeDate.setDate(resumeDate.getDate() + 1);
    
    // Update subscription
    await subscriptionDoc.ref.update({
      status: 'active',
      resumedAt: new Date(),
      nextDeliveryDate: resumeDate,
      updatedAt: new Date(),
    });
    
    logger.info('[Subscription] Subscription resumed successfully', { subscriptionId });
    
    // Send email notification
    // DISABLED: Email notifications disabled
    // try {
    //   const emailContent = generateSubscriptionResumedEmail({
    //     customerName: subscription.personalInfo?.fullName || 'Customer',
    //     planName: subscription.planName,
    //     startDate: resumeDate,
    //   });
    //   
    //   await sendEmail({
    //     to: subscription.userEmail,
    //     subject: emailContent.subject,
    //     html: emailContent.html,
    //     text: emailContent.text,
    //   });
    // } catch (emailError) {
    //   logger.error('[Subscription] Failed to send resume email', emailError as Error);
    //   // Don't fail operation if email fails
    // }
    
    return { success: true };
  } catch (error) {
    logger.error('[Subscription] Failed to resume subscription', error as Error, { subscriptionId });
    await trackError(error as Error, 'high', 'subscription', { subscriptionId });
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to resume subscription',
    };
  }
}

/**
 * Upgrade subscription plan
 */
export async function upgradeSubscription(
  subscriptionId: string,
  newPlan: {
    planType: PlanType;
    duration: SubscriptionDuration;
    dietType: DietType;
    foodPreference: FoodPreference;
  }
): Promise<{ 
  success: boolean; 
  prorationAmount?: number; 
  paymentRequired?: boolean;
  error?: string;
}> {
  if (!adminDb) {
    return { success: false, error: 'Database not available' };
  }
  
  try {
    logger.info('[Subscription] Upgrading subscription', { subscriptionId, newPlan });
    
    // Get subscription
    const subscriptionDoc = await adminDb
      .collection('subscriptions')
      .doc(subscriptionId)
      .get();
    
    if (!subscriptionDoc.exists) {
      throw ErrorFactory.subscription('Subscription not found', { subscriptionId });
    }
    
    const subscription = subscriptionDoc.data() as SubscriptionData;
    
    // Validate status
    if (subscription.status !== 'active') {
      return {
        success: false,
        error: 'Only active subscriptions can be upgraded',
      };
    }
    
    // Calculate proration
    const proration = calculateUpgradeProration(
      {
        planType: subscription.planType,
        duration: subscription.activityAndDuration?.duration || 'monthly',
        dietType: subscription.dietSelection?.dietType || 'balanced_meal',
        foodPreference: subscription.foodPreferenceSelection?.foodPreference || 'veg',
        paidAmount: subscription.price,
        startDate: toDate(subscription.startDate as any),
        endDate: toDate(subscription.endDate as any),
      },
      newPlan
    );
    
    logger.info('[Subscription] Proration calculated for upgrade', {
      subscriptionId,
      prorationAmount: proration.prorationAmount,
    });
    
    // If proration amount is positive, payment is required
    if (proration.prorationAmount > 0) {
      // Store pending upgrade for payment processing
      await adminDb
        .collection('pending_plan_changes')
        .add({
          subscriptionId,
          userId: subscription.userId,
          changeType: 'upgrade',
          oldPlan: {
            planType: subscription.planType,
            planName: subscription.planName,
          },
          newPlan,
          prorationAmount: proration.prorationAmount,
          status: 'pending_payment',
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
        });
      
      return {
        success: true,
        prorationAmount: proration.prorationAmount,
        paymentRequired: true,
      };
    }
    
    // No payment required (or credit available), apply upgrade immediately
    await subscriptionDoc.ref.update({
      planType: newPlan.planType,
      planName: `${newPlan.planType} Plan`,
      'dietSelection.dietType': newPlan.dietType,
      'foodPreferenceSelection.foodPreference': newPlan.foodPreference,
      'activityAndDuration.duration': newPlan.duration,
      lastPlanChange: {
        from: subscription.planType,
        to: newPlan.planType,
        changedAt: new Date(),
        prorationAmount: proration.prorationAmount,
      },
      updatedAt: new Date(),
    });
    
    logger.info('[Subscription] Subscription upgraded successfully', { subscriptionId });
    
    // Send email notification
    // DISABLED: Email notifications disabled
    // try {
    //   const emailContent = generatePlanChangeEmail({
    //     customerName: subscription.personalInfo?.fullName || 'Customer',
    //     planName: subscription.planName,
    //     oldPlan: subscription.planName,
    //     newPlan: `${newPlan.planType} Plan`,
    //     changeType: 'upgrade',
    //     proratedAmount: Math.abs(proration.prorationAmount),
    //     effectiveDate: new Date(),
    //     startDate: toDate(subscription.startDate as any),
    //     endDate: toDate(subscription.endDate as any),
    //   });
    //   
    //   await sendEmail({
    //     to: subscription.userEmail,
    //     subject: emailContent.subject,
    //     html: emailContent.html,
    //     text: emailContent.text,
    //   });
    // } catch (emailError) {
    //   logger.error('[Subscription] Failed to send upgrade email', emailError as Error);
    // }
    
    return {
      success: true,
      prorationAmount: proration.prorationAmount,
      paymentRequired: false,
    };
  } catch (error) {
    logger.error('[Subscription] Failed to upgrade subscription', error as Error, { subscriptionId });
    await trackError(error as Error, 'high', 'subscription', { subscriptionId });
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to upgrade subscription',
    };
  }
}

/**
 * Downgrade subscription plan (effective at end of current period)
 */
export async function downgradeSubscription(
  subscriptionId: string,
  newPlan: {
    planType: PlanType;
    duration: SubscriptionDuration;
    dietType: DietType;
    foodPreference: FoodPreference;
  }
): Promise<{ success: boolean; effectiveDate?: Date; error?: string }> {
  if (!adminDb) {
    return { success: false, error: 'Database not available' };
  }
  
  try {
    logger.info('[Subscription] Scheduling downgrade', { subscriptionId, newPlan });
    
    // Get subscription
    const subscriptionDoc = await adminDb
      .collection('subscriptions')
      .doc(subscriptionId)
      .get();
    
    if (!subscriptionDoc.exists) {
      throw ErrorFactory.subscription('Subscription not found', { subscriptionId });
    }
    
    const subscription = subscriptionDoc.data() as SubscriptionData;
    
    // Validate status
    if (subscription.status !== 'active') {
      return {
        success: false,
        error: 'Only active subscriptions can be downgraded',
      };
    }
    
    const endDate = toDate(subscription.endDate as any);
    
    // Store pending downgrade
    await subscriptionDoc.ref.update({
      pendingPlanChange: {
        type: 'downgrade',
        newPlan,
        effectiveDate: endDate,
        scheduledAt: new Date(),
      },
      updatedAt: new Date(),
    });
    
    logger.info('[Subscription] Downgrade scheduled successfully', {
      subscriptionId,
      effectiveDate: endDate,
    });
    
    // Send email notification
    // DISABLED: Email notifications disabled
    // try {
    //   const emailContent = generatePlanChangeEmail({
    //     customerName: subscription.personalInfo?.fullName || 'Customer',
    //     planName: subscription.planName,
    //     oldPlan: subscription.planName,
    //     newPlan: `${newPlan.planType.toUpperCase()} Plan`,
    //     changeType: 'downgrade',
    //     effectiveDate: endDate,
    //     startDate: toDate(subscription.startDate as any),
    //     endDate: endDate,
    //   });
    //   
    //   await sendEmail({
    //     to: subscription.userEmail,
    //     subject: emailContent.subject,
    //     html: emailContent.html,
    //     text: emailContent.text,
    //   });
    // } catch (emailError) {
    //   logger.error('[Subscription] Failed to send downgrade email', emailError as Error);
    // }
    
    return {
      success: true,
      effectiveDate: endDate,
    };
  } catch (error) {
    logger.error('[Subscription] Failed to schedule downgrade', error as Error, { subscriptionId });
    await trackError(error as Error, 'high', 'subscription', { subscriptionId });
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to schedule downgrade',
    };
  }
}
