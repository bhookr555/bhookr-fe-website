import { NextRequest, NextResponse } from "next/server";
import { createOrder } from "@/lib/firebase/firestore";
import { rateLimit, getIdentifier, RATE_LIMITS } from "@/lib/rate-limit";
import { verifyCsrfToken } from "@/lib/csrf";
import { orderCreateSchema } from "@/lib/validators";
import logger from "@/lib/logger";
import { generateIdempotencyKey, withIdempotency } from "@/lib/idempotency";
import { z } from "zod";

// In-memory fallback storage (if Firebase is not configured)
const orders = new Map<string, any>();

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const identifier = getIdentifier(request);
  
  try {
    // Log API request
    logger.apiRequest("POST", "/api/checkout/process-payment", { identifier });
    
    // Verify CSRF token
    if (!verifyCsrfToken(request, { consume: false })) {
      logger.security('CSRF token validation failed for checkout', { identifier });
      return NextResponse.json(
        { error: 'Invalid security token. Please refresh the page and try again.' },
        { status: 403 }
      );
    }
    
    // Apply rate limiting
    const rateLimitResult = rateLimit(identifier, RATE_LIMITS.CHECKOUT);

    if (!rateLimitResult.success) {
      logger.security("Rate limit exceeded for checkout", { identifier });
      return NextResponse.json(
        {
          message: "Too many checkout requests. Please try again later.",
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
    const body = await request.json();
    const validatedData = orderCreateSchema.parse(body);

    // Generate order ID
    const orderId = `ORD${Date.now()}${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    
    // Calculate proper pricing breakdown for invoice
    const itemAmount = validatedData.subtotal;
    const deliveryBase = 99; // Base delivery charge
    const deliveryGST = Math.round(deliveryBase * 0.18); // 18% GST on delivery
    const itemGST = Math.round(itemAmount * 0.05); // 5% GST on food
    
    // Idempotency check - prevent duplicate orders
    const idempotencyKey = generateIdempotencyKey('process-payment', {
      userId: validatedData.userId || validatedData.userEmail,
      amount: validatedData.grandTotal,
      items: JSON.stringify(validatedData.items.map(i => ({ id: i.planId, qty: i.quantity }))),
    });
    
    // Execute with idempotency protection
    const result = await withIdempotency(
      idempotencyKey,
      async () => {
        // Create order object with validated data
        const order = {
          orderId,
          userId: validatedData.userId || undefined,
          guestEmail: !validatedData.userId ? validatedData.userEmail : undefined,
          userEmail: validatedData.userEmail,
          userName: validatedData.userName,
          items: validatedData.items,
          deliveryAddress: validatedData.deliveryAddress,
          paymentMethod: validatedData.paymentMethod,
          orderType: 'menu', // Explicitly set order type
          subtotal: validatedData.subtotal,
          deliveryFee: validatedData.deliveryFee,
          tax: validatedData.tax,
          grandTotal: validatedData.grandTotal,
          // Pricing breakdown for invoice
          itemAmount,
          itemGST,
          deliveryBase,
          deliveryGST,
          deliveryCharges: deliveryBase + deliveryGST, // Total delivery with GST
          orderDate: new Date().toISOString(),
          status: "pending",
          paymentStatus: "pending_payment",
          estimatedDelivery: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days from now
          trackingUpdates: [
            {
              status: "pending",
              timestamp: new Date().toISOString(),
              message: "Order received and being processed",
            },
          ],
        };

        // Try to store in Firebase, fallback to in-memory
        try {
          await createOrder(order);
          logger.database("CREATE", "orders", { orderId });
        } catch (firebaseError) {
          logger.warn("Firebase save failed, using in-memory storage", { 
            orderId, 
            error: firebaseError 
          });
          orders.set(orderId, order);
        }

        // Log successful order creation
        logger.info("Order placed successfully", {
          orderId,
          userId: order.userId,
          total: order.grandTotal,
        });

        return {
          success: true,
          message: "Order placed successfully",
          order,
        };
      },
      {
        userId: validatedData.userId || validatedData.userEmail,
        amount: validatedData.grandTotal,
      }
    );

    const duration = Date.now() - startTime;
    logger.apiResponse("POST", "/api/checkout/process-payment", 200, duration);

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    const duration = Date.now() - startTime;
    
    // Handle validation errors
    if (error instanceof z.ZodError) {
      logger.warn("Checkout validation failed", { 
        errors: error.issues,
        identifier 
      });
      logger.apiResponse("POST", "/api/checkout/process-payment", 400, duration);
      
      return NextResponse.json(
        {
          message: "Validation failed",
          errors: error.issues.map(e => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        },
        { status: 400 }
      );
    }
    
    // Handle idempotency errors (duplicate request)
    if (error instanceof Error && error.message.includes('already in progress')) {
      logger.warn("Duplicate order attempt detected", { identifier });
      logger.apiResponse("POST", "/api/checkout/process-payment", 409, duration);
      
      return NextResponse.json(
        {
          message: error.message,
          code: 'DUPLICATE_REQUEST',
        },
        { status: 409 } // Conflict
      );
    }
    
    // Handle other errors
    logger.error(
      "Payment processing failed",
      error instanceof Error ? error : new Error(String(error)),
      { identifier }
    );
    logger.apiResponse("POST", "/api/checkout/process-payment", 500, duration);
    
    return NextResponse.json(
      { 
        message: "Payment processing failed. Please try again later.",
      },
      { status: 500 }
    );
  }
}

// GET endpoint to retrieve order details
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get("orderId");

    if (!orderId) {
      // Return all orders from memory (in production, fetch from Firebase)
      const allOrders = Array.from(orders.values());

      return NextResponse.json(
        { orders: allOrders },
        { status: 200 }
      );
    }

    // Return specific order from memory (in production, fetch from Firebase)
    const order = orders.get(orderId);
    
    if (!order) {
      return NextResponse.json(
        { message: "Order not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { order },
      { status: 200 }
    );
  } catch (error) {
    logger.error("[CHECKOUT] Error:", error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { message: "Failed to retrieve order" },
      { status: 500 }
    );
  }
}
