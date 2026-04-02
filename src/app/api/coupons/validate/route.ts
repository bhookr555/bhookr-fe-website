import { NextRequest, NextResponse } from "next/server";
import { couponValidationRequestSchema } from "@/lib/validators/coupon";
import { DEMO_COUPONS } from "@/types/coupon";
import type { CouponValidationResponse } from "@/types/coupon";
import logger from "@/lib/logger";

/**
 * POST /api/coupons/validate
 * Validate a coupon code and calculate discount
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request body
    const validationResult = couponValidationRequestSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        {
          valid: false,
          error: "Invalid request data",
          errorCode: "INVALID_REQUEST",
        } as CouponValidationResponse,
        { status: 400 }
      );
    }

    const { code, orderAmount, type, userId } = validationResult.data;

    // Find coupon (in production, this would be a database query)
    const coupon = DEMO_COUPONS.find(
      (c) => c.code.toUpperCase() === code.toUpperCase()
    );

    if (!coupon) {
      return NextResponse.json(
        {
          valid: false,
          error: "Coupon code not found",
          errorCode: "NOT_FOUND",
        } as CouponValidationResponse,
        { status: 404 }
      );
    }

    // Validate coupon status
    if (coupon.status !== "active") {
      return NextResponse.json(
        {
          valid: false,
          error: "This coupon is not active",
          errorCode: "INACTIVE",
        } as CouponValidationResponse,
        { status: 400 }
      );
    }

    // Check if expired
    const now = new Date();
    if (now < coupon.validFrom || now > coupon.validUntil) {
      return NextResponse.json(
        {
          valid: false,
          error: "This coupon has expired or is not yet valid",
          errorCode: "EXPIRED",
        } as CouponValidationResponse,
        { status: 400 }
      );
    }

    // Check if applicable for the order type
    if (coupon.applicableFor && !coupon.applicableFor.includes(type)) {
      const applicableTypes = coupon.applicableFor.join(" or ");
      return NextResponse.json(
        {
          valid: false,
          error: `This coupon is only valid for ${applicableTypes}`,
          errorCode: "NOT_APPLICABLE",
        } as CouponValidationResponse,
        { status: 400 }
      );
    }

    // Check minimum order amount
    if (coupon.minOrderAmount && orderAmount < coupon.minOrderAmount) {
      return NextResponse.json(
        {
          valid: false,
          error: `Minimum order amount of ₹${coupon.minOrderAmount} required`,
          errorCode: "MIN_ORDER_NOT_MET",
        } as CouponValidationResponse,
        { status: 400 }
      );
    }

    // Check usage limit
    if (coupon.usageLimit && coupon.usageCount && coupon.usageCount >= coupon.usageLimit) {
      return NextResponse.json(
        {
          valid: false,
          error: "This coupon has reached its usage limit",
          errorCode: "USAGE_LIMIT_REACHED",
        } as CouponValidationResponse,
        { status: 400 }
      );
    }

    // Check first time user only (in production, check user order history)
    if (coupon.firstTimeUserOnly && userId) {
      // For demo purposes, we'll allow it
      // In production: check if user has previous orders
      logger.debug("First-time user check skipped for demo");
    }

    // Calculate discount
    let discountAmount = 0;

    switch (coupon.type) {
      case "percentage":
        discountAmount = Math.round((orderAmount * coupon.value) / 100);
        // Apply max discount cap if set
        if (coupon.maxDiscountAmount) {
          discountAmount = Math.min(discountAmount, coupon.maxDiscountAmount);
        }
        break;
      
      case "fixed":
        discountAmount = coupon.value;
        // Can't discount more than order amount
        discountAmount = Math.min(discountAmount, orderAmount);
        break;
      
      case "free_delivery":
        // Delivery is already free in this app
        discountAmount = 0;
        break;
      
      default:
        return NextResponse.json(
          {
            valid: false,
            error: "Invalid coupon type",
            errorCode: "INVALID_REQUEST",
          } as CouponValidationResponse,
          { status: 400 }
        );
    }

    const finalAmount = Math.max(0, orderAmount - discountAmount);

    logger.info("Coupon validated successfully", {
      code,
      type,
      orderAmount,
      discountAmount,
      finalAmount,
    });

    return NextResponse.json(
      {
        valid: true,
        coupon,
        discountAmount,
        finalAmount,
      } as CouponValidationResponse,
      { status: 200 }
    );
  } catch (error) {
    logger.error("Error validating coupon", error instanceof Error ? error : new Error(String(error)));
    
    return NextResponse.json(
      {
        valid: false,
        error: "Failed to validate coupon",
        errorCode: "INTERNAL_ERROR",
      } as CouponValidationResponse,
      { status: 500 }
    );
  }
}
