/**
 * Coupon Types and Interfaces
 * Industry-standard coupon system types
 */

export type CouponType = "percentage" | "fixed" | "free_delivery";
export type CouponStatus = "active" | "inactive" | "expired" | "used";

export interface Coupon {
  id: string;
  code: string;
  type: CouponType;
  value: number; // percentage (0-100) or fixed amount in INR
  description: string;
  minOrderAmount?: number; // minimum order amount required
  maxDiscountAmount?: number; // max discount cap (for percentage coupons)
  usageLimit?: number; // total times coupon can be used
  usageCount?: number; // times already used
  userUsageLimit?: number; // times per user
  validFrom: Date;
  validUntil: Date;
  status: CouponStatus;
  applicableFor?: ("menu" | "subscription")[]; // where coupon can be used
  firstTimeUserOnly?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface AppliedCoupon {
  code: string;
  type: CouponType;
  discountAmount: number;
  originalAmount: number;
  finalAmount: number;
}

export interface CouponValidationRequest {
  code: string;
  orderAmount: number;
  type: "menu" | "subscription";
  userId?: string;
}

export interface CouponValidationResponse {
  valid: boolean;
  coupon?: Coupon;
  discountAmount?: number;
  finalAmount?: number;
  error?: string;
  errorCode?: 
    | "NOT_FOUND"
    | "EXPIRED"
    | "INACTIVE"
    | "MIN_ORDER_NOT_MET"
    | "USAGE_LIMIT_REACHED"
    | "USER_LIMIT_REACHED"
    | "NOT_APPLICABLE"
    | "FIRST_TIME_ONLY"
    | "INVALID_REQUEST"
    | "INTERNAL_ERROR";
}

// Predefined coupons for demo/testing
export const DEMO_COUPONS: Coupon[] = [
  // Subscription-only coupons
  {
    id: "1",
    code: "BHOOKRLITE",
    type: "fixed",
    value: 499,
    description: "Flat ₹499 off on BHOOKR Lite Plan",
    validFrom: new Date("2026-01-01"),
    validUntil: new Date("2026-12-31"),
    status: "active",
    applicableFor: ["subscription"], // Subscription only
  },
  {
    id: "2",
    code: "BHOOKRSTD",
    type: "fixed",
    value: 999,
    description: "Flat ₹999 off on BHOOKR Standard Plan",
    validFrom: new Date("2026-01-01"),
    validUntil: new Date("2026-12-31"),
    status: "active",
    applicableFor: ["subscription"], // Subscription only
  },
  {
    id: "3",
    code: "BHOOKRELITE3",
    type: "fixed",
    value: 1399,
    description: "Flat ₹1399 off on BHOOKR Elite Plan",
    validFrom: new Date("2026-01-01"),
    validUntil: new Date("2026-12-31"),
    status: "active",
    applicableFor: ["subscription"], // Subscription only
  },
  // Menu-only coupons
  {
    id: "4",
    code: "MENU50",
    type: "fixed",
    value: 50,
    description: "Flat ₹50 off on menu orders",
    minOrderAmount: 200,
    validFrom: new Date("2026-01-01"),
    validUntil: new Date("2026-12-31"),
    status: "active",
    applicableFor: ["menu"], // Menu only
  },
  {
    id: "5",
    code: "MENU100",
    type: "fixed",
    value: 100,
    description: "Flat ₹100 off on menu orders",
    minOrderAmount: 400,
    validFrom: new Date("2026-01-01"),
    validUntil: new Date("2026-12-31"),
    status: "active",
    applicableFor: ["menu"], // Menu only
  },
  {
    id: "6",
    code: "MENU20",
    type: "percentage",
    value: 20,
    description: "20% off on menu orders",
    minOrderAmount: 300,
    maxDiscountAmount: 150,
    validFrom: new Date("2026-01-01"),
    validUntil: new Date("2026-12-31"),
    status: "active",
    applicableFor: ["menu"], // Menu only
  },
  {
    id: "7",
    code: "FIRSTORDER",
    type: "percentage",
    value: 15,
    description: "15% off on your first menu order",
    maxDiscountAmount: 100,
    firstTimeUserOnly: true,
    validFrom: new Date("2026-01-01"),
    validUntil: new Date("2026-12-31"),
    status: "active",
    applicableFor: ["menu"], // Menu only
  },
];
