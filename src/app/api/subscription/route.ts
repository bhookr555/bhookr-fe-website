import { NextRequest, NextResponse } from "next/server";
import { rateLimit, getIdentifier, RATE_LIMITS } from "@/lib/rate-limit";
import { subscriptionCreateSchema } from "@/lib/validators";
import logger from "@/lib/logger";
import { z } from "zod";
import { requireAuth, AuthenticationError, AuthorizationError } from "@/lib/api-auth";
import { createSubscriptionWithRollback } from "@/lib/saga";
import { generateIdempotencyKey, withIdempotency } from "@/lib/idempotency";

/**
 * POST /api/subscription
 * Create a new subscription
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const identifier = getIdentifier(request);
  
  try {
    // Try to verify authentication, but allow guest users
    let authenticatedUser = null;
    try {
      authenticatedUser = await requireAuth(request);
    } catch (error) {
      // Allow guest subscriptions - authenticatedUser will be null
      logger.debug("Guest subscription request", { identifier });
    }
    
    // Log API request
    logger.apiRequest("POST", "/api/subscription", { 
      identifier,
      userId: authenticatedUser?.uid || "guest"
    });
    
    // Apply rate limiting
    const rateLimitResult = rateLimit(identifier, RATE_LIMITS.SUBSCRIPTION);

    if (!rateLimitResult.success) {
      logger.security("Rate limit exceeded for subscription", { identifier });
      return NextResponse.json(
        {
          error: "Too many subscription requests. Please try again later.",
          retryAfter: Math.ceil((rateLimitResult.reset - Date.now()) / 1000),
        },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": rateLimitResult.limit.toString(),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": rateLimitResult.reset.toString(),
          },
        }
      );
    }

    // Parse and validate request body
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      logger.error("Failed to parse request body", parseError instanceof Error ? parseError : new Error(String(parseError)));
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }
    
    // Log the incoming data for debugging
    logger.debug("Subscription request body", { 
      orderId: body.orderId,
      hasFormData: !!body.formData,
      hasInvoiceData: !!body.invoiceData,
      invoiceData: body.invoiceData
    });
    
    // Validate with Zod schema
    const validatedData = subscriptionCreateSchema.parse(body);
    const { formData, invoiceData } = validatedData;

    // Check for existing active subscriptions with similar plan
    if (authenticatedUser?.uid) {
      const { getUserSubscriptions } = await import('@/lib/firebase/firestore');
      const existingSubscriptions = await getUserSubscriptions(authenticatedUser.uid);
      
      // Check if subscription with this orderId already exists
      if (validatedData.orderId) {
        const existingWithOrderId = existingSubscriptions.find((sub: any) => 
          sub.orderId === validatedData.orderId
        ) as any;
        
        if (existingWithOrderId) {
          logger.info("Subscription already exists for this order", {
            orderId: validatedData.orderId,
            subscriptionId: existingWithOrderId.id,
            status: existingWithOrderId.status,
          });
          
          // Return the existing subscription instead of creating duplicate
          return NextResponse.json(
            {
              success: true,
              subscription: existingWithOrderId,
              message: "Subscription already exists for this order",
            },
            { status: 200 }
          );
        }
      }
      
      const activeSimilarPlan = existingSubscriptions.find((sub: any) => 
        sub.status === 'active' && 
        sub.planType === (formData.activityAndDuration?.duration?.includes("week") ? "weekly" : "monthly")
      ) as any;
      
      if (activeSimilarPlan) {
        logger.warn("User already has an active similar plan", {
          userId: authenticatedUser.uid,
          existingPlan: activeSimilarPlan.planName || 'Unknown',
        });
        
        return NextResponse.json(
          {
            error: "You already have an active subscription with a similar plan. Please cancel your current subscription before purchasing a new one.",
            existingSubscription: {
              id: activeSimilarPlan.id,
              planName: activeSimilarPlan.planName || 'Subscription',
              planType: activeSimilarPlan.planType || 'monthly',
            },
          },
          { status: 409 }
        );
      }
    }

    // Calculate subscription dates
    // Use user's selected start date from planSelection, or default to today
    const startDate = formData.planSelection?.startDate 
      ? new Date(formData.planSelection.startDate) 
      : new Date();
    
    const endDate = new Date(startDate);
    
    // Set end date based on duration
    if (formData.activityAndDuration?.duration) {
      const duration = formData.activityAndDuration.duration;
      if (duration.includes("week")) {
        const weeks = parseInt(duration) || 1;
        endDate.setDate(endDate.getDate() + (weeks * 7));
      } else if (duration.includes("month")) {
        const months = parseInt(duration) || 1;
        endDate.setMonth(endDate.getMonth() + months);
      }
    }

    // Calculate next billing date (same as end date for one-time subscriptions)
    // For monthly subscriptions, next billing is end date (renewal date)
    const nextBillingDate = new Date(endDate);

    // Idempotency check - prevent duplicate subscriptions
    const idempotencyKey = generateIdempotencyKey('create-subscription', {
      userId: authenticatedUser?.uid || formData.personalInfo.email,
      orderId: validatedData.orderId,
      planType: formData.planSelection?.planType,
      amount: invoiceData.totalAmount,
    });

    // Use saga pattern for subscription creation with rollback capability
    const savedSubscription = await withIdempotency(
      idempotencyKey,
      async () => {
        const subscription = {
          userId: authenticatedUser?.uid || `GUEST-${Date.now()}`, // Use authenticated user ID or generate guest ID
          userEmail: authenticatedUser?.email || formData.personalInfo.email,
          planName: `${formData.planSelection?.planType || "Custom"} ${formData.planSelection?.mealType || "Plan"}`,
          planType: formData.activityAndDuration?.duration?.includes("week") ? "weekly" : "monthly",
          price: invoiceData.totalAmount || 0,
          status: "pending", // Set to pending initially, will be activated after payment
          orderId: validatedData.orderId || null, // Link to payment order
          startDate: startDate,
          endDate: endDate,
          nextBillingDate: nextBillingDate,
          autoRenew: false,
          deliveryDays: formData.planSelection?.deliveryDays || [],
          preferredSlot: formData.planSelection?.preferredSlot || "Not specified",
          personalInfo: formData.personalInfo,
          physicalInfo: formData.physicalInfo,
          goalSelection: formData.goalSelection,
          dietSelection: formData.dietSelection,
          foodPreferenceSelection: formData.foodPreferenceSelection,
          activityAndDuration: formData.activityAndDuration,
          planSelection: formData.planSelection,
          billingDetails: formData.billingDetails,
          invoice: invoiceData,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        // Use saga pattern for atomic subscription creation with rollback
        const result = await createSubscriptionWithRollback(
          validatedData.orderId || `ORD-${Date.now()}`,
          subscription,
          invoiceData
        );
        
        if (!result.success) {
          throw new Error(result.error || 'Failed to create subscription');
        }
        
        return result.subscription;
      },
      {
        userId: authenticatedUser?.uid || formData.personalInfo.email,
        orderId: validatedData.orderId,
        amount: invoiceData.totalAmount,
      }
    );

    // Log successful subscription creation
    logger.info("Subscription created successfully", {
      id: savedSubscription.id,
      userId: savedSubscription.userId,
      plan: formData.planSelection.planType,
      duration: formData.activityAndDuration.duration,
      amount: invoiceData.totalAmount,
    });

    // Log API response
    const duration = Date.now() - startTime;
    logger.apiResponse("POST", "/api/subscription", 201, duration);

    // Return success response
    return NextResponse.json(
      {
        success: true,
        subscription: savedSubscription,
        message: "Subscription created successfully",
      },
      { status: 201 }
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    
    // Handle authentication/authorization errors
    if (error instanceof AuthenticationError) {
      logger.security("Unauthenticated subscription attempt", { identifier });
      logger.apiResponse("POST", "/api/subscription", 401, duration);
      
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }
    
    if (error instanceof AuthorizationError) {
      logger.security("Unauthorized subscription attempt", { identifier });
      logger.apiResponse("POST", "/api/subscription", 403, duration);
      
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }
    
    // Handle validation errors
    if (error instanceof z.ZodError) {
      logger.warn("Subscription validation failed", { 
        errors: error.issues,
        identifier 
      });
      logger.apiResponse("POST", "/api/subscription", 400, duration);
      
      return NextResponse.json(
        {
          error: "Validation failed",
          details: error.issues.map(e => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        },
        { status: 400 }
      );
    }
    
    // Handle other errors
    logger.error(
      "Subscription creation failed", 
      error instanceof Error ? error : new Error(String(error)),
      { identifier }
    );
    logger.apiResponse("POST", "/api/subscription", 500, duration);
    
    return NextResponse.json(
      {
        error: "Failed to create subscription",
        message: "An unexpected error occurred. Please try again later.",
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/subscription
 * Get user's subscriptions
 */
export async function GET() {
  try {
    // In a real application, fetch subscriptions from Firebase
    // For demo, return empty array
    const subscriptions: any[] = [];

    return NextResponse.json(
      {
        success: true,
        subscriptions,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Subscription fetch error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch subscriptions",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
