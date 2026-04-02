/**
 * Centralized Pricing Configuration
 * 
 * All pricing-related constants and calculation logic.
 * This ensures consistency across the application and makes it easy to update pricing.
 */

import type { PlanType } from "@/types/subscription";

/**
 * Pricing Constants
 */
export const PRICING_CONSTANTS = {
  /** Fixed delivery fee in INR (for cart orders) */
  DELIVERY_FEE: 99,
  
  /** Delivery fees by subscription plan type (excluding GST) */
  SUBSCRIPTION_DELIVERY_FEES: {
    lite: 999,
    standard: 999,
    elite: 1299,
  },
  
  /** GST rate for menu items (5%) */
  ITEM_GST_RATE: 0.05,
  
  /** GST rate for delivery fee (18%) */
  DELIVERY_GST_RATE: 0.18,
} as const;

/**
 * Get delivery fee based on subscription plan type
 */
export function getSubscriptionDeliveryFee(planType: PlanType): number {
  return PRICING_CONSTANTS.SUBSCRIPTION_DELIVERY_FEES[planType];
}

/**
 * Calculate item GST (5% of item total)
 */
export function calculateItemGST(itemTotal: number): number {
  return Math.round(itemTotal * PRICING_CONSTANTS.ITEM_GST_RATE);
}

/**
 * Calculate delivery GST (18% of delivery fee)
 */
export function calculateDeliveryGST(deliveryFee: number = PRICING_CONSTANTS.DELIVERY_FEE): number {
  return Math.round(deliveryFee * PRICING_CONSTANTS.DELIVERY_GST_RATE);
}

/**
 * Calculate total GST (item GST + delivery GST)
 */
export function calculateTotalGST(itemTotal: number, deliveryFee: number = PRICING_CONSTANTS.DELIVERY_FEE): number {
  return calculateItemGST(itemTotal) + calculateDeliveryGST(deliveryFee);
}

/**
 * Calculate grand total including items, delivery, and GST
 */
export function calculateGrandTotal(itemTotal: number, deliveryFee: number = PRICING_CONSTANTS.DELIVERY_FEE): number {
  const totalGST = calculateTotalGST(itemTotal, deliveryFee);
  return itemTotal + deliveryFee + totalGST;
}

/**
 * Get complete pricing breakdown
 */
export interface PricingBreakdown {
  itemTotal: number;
  deliveryFee: number;
  itemGST: number;
  deliveryGST: number;
  totalGST: number;
  grandTotal: number;
}

export function getPricingBreakdown(itemTotal: number, deliveryFee: number = PRICING_CONSTANTS.DELIVERY_FEE): PricingBreakdown {
  const itemGST = calculateItemGST(itemTotal);
  const deliveryGST = calculateDeliveryGST(deliveryFee);
  const totalGST = itemGST + deliveryGST;
  const grandTotal = itemTotal + deliveryFee + totalGST;

  return {
    itemTotal,
    deliveryFee,
    itemGST,
    deliveryGST,
    totalGST,
    grandTotal,
  };
}

/**
 * Get subscription pricing breakdown including plan-specific delivery fee
 */
export interface SubscriptionPricingBreakdown {
  subscriptionAmount: number;
  deliveryFee: number;
  subscriptionGST: number; // 5% GST on subscription
  deliveryGST: number; // 18% GST on delivery
  totalGST: number;
  grandTotal: number;
}

export function getSubscriptionPricingBreakdown(
  subscriptionAmount: number,
  planType: PlanType
): SubscriptionPricingBreakdown {
  const deliveryFee = getSubscriptionDeliveryFee(planType);
  const subscriptionGST = calculateItemGST(subscriptionAmount); // 5% GST
  const deliveryGST = calculateDeliveryGST(deliveryFee); // 18% GST
  const totalGST = subscriptionGST + deliveryGST;
  const grandTotal = subscriptionAmount + deliveryFee + totalGST;

  return {
    subscriptionAmount,
    deliveryFee,
    subscriptionGST,
    deliveryGST,
    totalGST,
    grandTotal,
  };
}
