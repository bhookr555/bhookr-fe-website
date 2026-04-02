import { z } from "zod";

/**
 * Coupon Validation Schemas
 */

export const couponCodeSchema = z.object({
  code: z
    .string()
    .min(3, "Coupon code must be at least 3 characters")
    .max(20, "Coupon code must be at most 20 characters")
    .regex(/^[A-Z0-9]+$/, "Coupon code must contain only uppercase letters and numbers")
    .transform((val) => val.toUpperCase()),
});

export const couponValidationRequestSchema = z.object({
  code: couponCodeSchema.shape.code,
  orderAmount: z.number().positive("Order amount must be positive"),
  type: z.enum(["menu", "subscription"]),
  userId: z.string().optional(),
});

export const couponSchema = z.object({
  id: z.string(),
  code: couponCodeSchema.shape.code,
  type: z.enum(["percentage", "fixed", "free_delivery"]),
  value: z.number().min(0),
  description: z.string(),
  minOrderAmount: z.number().positive().optional(),
  maxDiscountAmount: z.number().positive().optional(),
  usageLimit: z.number().positive().optional(),
  usageCount: z.number().min(0).optional(),
  userUsageLimit: z.number().positive().optional(),
  validFrom: z.date(),
  validUntil: z.date(),
  status: z.enum(["active", "inactive", "expired", "used"]),
  applicableFor: z.array(z.enum(["menu", "subscription"])).optional(),
  firstTimeUserOnly: z.boolean().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export type CouponValidationRequest = z.infer<typeof couponValidationRequestSchema>;
