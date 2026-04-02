/**
 * Pro-rated Billing Calculator
 * 
 * Calculates pro-rated amounts for plan changes, pauses, and cancellations.
 */

import logger from '@/lib/logger';
import { calculateSubscriptionPrice } from '@/constants/subscription';
import { getSubscriptionPricingBreakdown } from '@/config/pricing';
import type { PlanType, SubscriptionDuration, DietType, FoodPreference } from '@/types/subscription';

export interface ProrationResult {
  unusedDays: number;
  totalDays: number;
  unusedAmount: number;
  newPlanAmount: number;
  prorationAmount: number; // Positive = charge, Negative = credit
  effectiveDate: Date;
}

/**
 * Calculate days between two dates
 */
function daysBetween(date1: Date, date2: Date): number {
  const oneDay = 24 * 60 * 60 * 1000;
  return Math.round(Math.abs((date2.getTime() - date1.getTime()) / oneDay));
}

/**
 * Get total days for subscription duration
 */
function getDurationDays(duration: SubscriptionDuration): number {
  switch (duration) {
    case '7_days':
      return 7;
    case 'monthly':
      return 30;
    default:
      return 30;
  }
}

/**
 * Calculate unused amount from current subscription
 */
export function calculateUnusedAmount(
  currentPlan: {
    planType: PlanType;
    duration: SubscriptionDuration;
    dietType: DietType;
    foodPreference: FoodPreference;
    paidAmount: number;
    startDate: Date;
    endDate: Date;
  }
): { unusedDays: number; unusedAmount: number } {
  const now = new Date();
  
  // If subscription hasn't started yet, full refund
  if (now < currentPlan.startDate) {
    const totalDays = getDurationDays(currentPlan.duration);
    return {
      unusedDays: totalDays,
      unusedAmount: currentPlan.paidAmount,
    };
  }
  
  // If subscription has ended, no refund
  if (now >= currentPlan.endDate) {
    return {
      unusedDays: 0,
      unusedAmount: 0,
    };
  }
  
  // Calculate pro-rated refund
  const totalDays = daysBetween(currentPlan.startDate, currentPlan.endDate);
  const usedDays = daysBetween(currentPlan.startDate, now);
  const unusedDays = totalDays - usedDays;
  
  const dailyRate = currentPlan.paidAmount / totalDays;
  const unusedAmount = Math.round(dailyRate * unusedDays);
  
  logger.info('[Proration] Calculated unused amount', {
    totalDays,
    usedDays,
    unusedDays,
    paidAmount: currentPlan.paidAmount,
    unusedAmount,
  });
  
  return {
    unusedDays,
    unusedAmount,
  };
}

/**
 * Calculate proration for plan upgrade
 */
export function calculateUpgradeProration(
  currentPlan: {
    planType: PlanType;
    duration: SubscriptionDuration;
    dietType: DietType;
    foodPreference: FoodPreference;
    paidAmount: number;
    startDate: Date;
    endDate: Date;
  },
  newPlan: {
    planType: PlanType;
    duration: SubscriptionDuration;
    dietType: DietType;
    foodPreference: FoodPreference;
  }
): ProrationResult {
  // Calculate unused amount from current plan
  const { unusedDays, unusedAmount } = calculateUnusedAmount(currentPlan);
  
  // Calculate new plan cost for remaining period
  const newPlanPricing = calculateSubscriptionPrice(
    newPlan.planType,
    newPlan.duration,
    newPlan.dietType,
    newPlan.foodPreference
  );
  
  // Get total with delivery fees and GST
  const fullPricing = getSubscriptionPricingBreakdown(
    newPlanPricing.itemAmount,
    newPlan.planType
  );
  
  const totalDays = getDurationDays(newPlan.duration);
  const dailyRateNewPlan = fullPricing.grandTotal / totalDays;
  const newPlanAmountForRemainingDays = Math.round(dailyRateNewPlan * unusedDays);
  
  // Proration amount = (New plan cost for remaining days) - (Unused amount from current plan)
  const prorationAmount = newPlanAmountForRemainingDays - unusedAmount;
  const effectiveDate = new Date(); // Immediate effect
  
  logger.info('[Proration] Upgrade calculation', {
    unusedDays,
    unusedAmount,
    newPlanAmountForRemainingDays,
    prorationAmount,
    willCharge: prorationAmount > 0,
  });
  
  return {
    unusedDays,
    totalDays,
    unusedAmount,
    newPlanAmount: newPlanAmountForRemainingDays,
    prorationAmount,
    effectiveDate,
  };
}

/**
 * Calculate proration for plan downgrade
 */
export function calculateDowngradeProration(
  currentPlan: {
    planType: PlanType;
    duration: SubscriptionDuration;
    dietType: DietType;
    foodPreference: FoodPreference;
    paidAmount: number;
    startDate: Date;
    endDate: Date;
  },
  _newPlan: {
    planType: PlanType;
    duration: SubscriptionDuration;
    dietType: DietType;
    foodPreference: FoodPreference;
  }
): ProrationResult {
  // For downgrades, apply change at end of current period (no immediate refund)
  // User continues with current plan until end date, then new plan starts
  
  const effectiveDate = new Date(currentPlan.endDate);
  
  logger.info('[Proration] Downgrade calculation - deferred to period end', {
    currentPlanEndDate: currentPlan.endDate,
    effectiveDate,
  });
  
  return {
    unusedDays: 0,
    totalDays: getDurationDays(currentPlan.duration),
    unusedAmount: 0,
    newPlanAmount: 0,
    prorationAmount: 0, // No immediate charge or credit
    effectiveDate,
  };
}

/**
 * Calculate refund for subscription cancellation
 */
export function calculateCancellationRefund(
  subscription: {
    paidAmount: number;
    startDate: Date;
    endDate: Date;
  }
): { refundAmount: number; refundPercentage: number } {
  const { unusedDays, unusedAmount } = calculateUnusedAmount({
    ...subscription,
    planType: 'standard' as PlanType, // Dummy values for calculation
    duration: 'monthly' as SubscriptionDuration,
    dietType: 'balanced_meal' as DietType,
    foodPreference: 'veg' as FoodPreference,
  });
  
  const totalDays = daysBetween(subscription.startDate, subscription.endDate);
  const refundPercentage = totalDays > 0 ? (unusedDays / totalDays) * 100 : 0;
  
  logger.info('[Proration] Cancellation refund calculation', {
    unusedDays,
    totalDays,
    unusedAmount,
    refundPercentage: refundPercentage.toFixed(2),
  });
  
  return {
    refundAmount: unusedAmount,
    refundPercentage: Math.round(refundPercentage),
  };
}

/**
 * Calculate pause credit (for future use)
 */
export function calculatePauseCredit(
  subscription: {
    paidAmount: number;
    startDate: Date;
    endDate: Date;
    pauseDate: Date;
  }
): { pausedDays: number; creditAmount: number } {
  const totalDays = daysBetween(subscription.startDate, subscription.endDate);
  const usedDays = daysBetween(subscription.startDate, subscription.pauseDate);
  const pausedDays = totalDays - usedDays;
  
  const dailyRate = subscription.paidAmount / totalDays;
  const creditAmount = Math.round(dailyRate * pausedDays);
  
  logger.info('[Proration] Pause credit calculation', {
    totalDays,
    usedDays,
    pausedDays,
    creditAmount,
  });
  
  return {
    pausedDays,
    creditAmount,
  };
}
