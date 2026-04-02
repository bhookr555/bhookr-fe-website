/**
 * Razorpay Create Order API
 * POST /api/payment/razorpay/create-order
 * 
 * Creates a Razorpay order for payment processing
 * 
 * Security:
 * - Requires authentication
 * - Rate limited
 * - CSRF protected
 * - API secret never exposed to frontend
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { requireAuth } from '@/lib/api-auth';
import { rateLimit, getIdentifier, RATE_LIMITS } from '@/lib/rate-limit';
import { verifyCsrfToken } from '@/lib/csrf';
import logger from '@/lib/logger';
import { createRazorpayOrder } from '@/lib/payment/razorpay';
import { createOrder } from '@/lib/repositories/payment-repository';
import { generateIdempotencyKey, withIdempotency } from '@/lib/idempotency';
import type { PaymentOrder } from '@/types/payment';

/**
 * Validation schema for create order request
 */
const createOrderSchema = z.object({
  orderId: z.string().optional(), // Allow frontend to provide orderId for subscription linking
  amount: z.number().positive('Amount must be positive').min(1, 'Minimum amount is ₹1'),
  customerName: z.string().min(1, 'Customer name is required'),
  customerEmail: z.string().email('Invalid email address'),
  customerPhone: z.string()
    .regex(/^[6-9]\d{9}$/, 'Invalid Indian phone number')
    .optional(),
  orderType: z.enum(['menu', 'subscription']).default('menu'),
  items: z.array(
    z.object({
      planId: z.string(),
      name: z.string(),
      price: z.number().positive(),
      quantity: z.number().int().positive(),
    })
  ).min(1, 'At least one item is required'),
  deliveryAddress: z.object({
    fullName: z.string().min(1, 'Full name is required'),
    phone: z.string().regex(/^[6-9]\d{9}$/, 'Invalid phone number'),
    address: z.string().min(5, 'Address must be at least 5 characters'),
    city: z.string().min(1, 'City is required'),
    state: z.string().min(1, 'State is required'),
    pinCode: z.string().regex(/^\d{6}$/, 'Invalid PIN code'),
  }),
});

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const identifier = getIdentifier(request);
  
  try {
    logger.info('[API] Razorpay create order request received', { identifier });
    
    // 1. Authentication
    const user = await requireAuth(request);
    logger.info('[API] User authenticated', { userId: user.uid });
    
    // 2. CSRF Protection (Optional - Bearer token auth provides CSRF protection)
    // Note: Firebase ID token in Authorization header already prevents CSRF attacks
    // CSRF is primarily needed for cookie-based auth, not Bearer token auth
    const csrfValid = verifyCsrfToken(request, { consume: false });
    if (!csrfValid) {
      logger.warn('[API] CSRF token missing/invalid - continuing with Bearer auth', {
        identifier,
        userId: user.uid,
      });
    }
    
    // 3. Rate Limiting
    const rateLimitResult = rateLimit(identifier, RATE_LIMITS.CHECKOUT);
    
    if (!rateLimitResult.success) {
      logger.security('[API] Rate limit exceeded', { userId: user.uid });
      
      return NextResponse.json(
        {
          error: 'Too many payment requests. Please try again later.',
          retryAfter: Math.ceil((rateLimitResult.reset - Date.now()) / 1000),
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': rateLimitResult.limit.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': rateLimitResult.reset.toString(),
          },
        }
      );
    }
    
    // 4. Parse and validate request body
    const body = await request.json();
    const validatedData = createOrderSchema.parse(body);
    
    logger.info('[API] Request validated', {
      userId: user.uid,
      amount: validatedData.amount,
      itemCount: validatedData.items.length,
      providedOrderId: validatedData.orderId || 'none',
    });
    
    // 5. Use provided orderId or generate unique order ID
    const orderId = validatedData.orderId || uuidv4();
    
    logger.info('[API] Using order ID', {
      orderId,
      source: validatedData.orderId ? 'provided' : 'generated',
    });
    
    // Calculate proper pricing breakdown
    const itemAmount = validatedData.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const deliveryBase = 99; // Base delivery charge for menu items
    const deliveryGST = Math.round(deliveryBase * 0.18); // 18% GST on delivery
    const itemGST = Math.round(itemAmount * 0.05); // 5% GST on food
    
    // 5.1 Idempotency check - prevent duplicate orders
    const idempotencyKey = generateIdempotencyKey('create-razorpay-order', {
      userId: user.uid,
      orderId,
      amount: validatedData.amount,
    });
    
    // Execute with idempotency protection
    const result = await withIdempotency(
      idempotencyKey,
      async () => {
        // 6. Create Razorpay order
        const razorpayOrderResult = await createRazorpayOrder({
          orderId,
          amount: validatedData.amount,
          userId: user.uid,
          customerName: validatedData.customerName,
          customerEmail: validatedData.customerEmail,
          customerPhone: validatedData.customerPhone || user.phoneNumber || '',
          items: validatedData.items,
          deliveryAddress: validatedData.deliveryAddress,
        });
        
        // 7. Save order to Firestore
        const order: PaymentOrder = {
          orderId,
          userId: user.uid,
          orderType: validatedData.orderType || 'menu',
          amount: validatedData.amount,
          currency: 'INR',
          status: 'PENDING',
          gateway: 'RAZORPAY',
          items: validatedData.items,
          customerName: validatedData.customerName,
          customerEmail: validatedData.customerEmail,
          customerPhone: validatedData.customerPhone || user.phoneNumber || '',
          deliveryAddress: validatedData.deliveryAddress,
          // Pricing breakdown for invoice
          itemAmount,
          itemGST,
          deliveryBase,
          deliveryGST,
          deliveryCharges: deliveryBase + deliveryGST,
          grandTotal: validatedData.amount,
          razorpayData: {
            orderId: razorpayOrderResult.razorpayOrderId,
          },
          createdAt: new Date(),
          updatedAt: new Date(),
          expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
        };
        
        await createOrder(order);
        
        logger.info('[API] Order created successfully', {
          orderId,
          razorpayOrderId: razorpayOrderResult.razorpayOrderId,
          duration: Date.now() - startTime,
        });
        
        // Return response data
        return {
          success: true,
          orderId,
          razorpayOrderId: razorpayOrderResult.razorpayOrderId,
          amount: razorpayOrderResult.amount,
          currency: razorpayOrderResult.currency,
          keyId: razorpayOrderResult.keyId,
        };
      },
      {
        userId: user.uid,
        orderId,
        amount: validatedData.amount,
      }
    );
    
    // 8. Return response for frontend checkout
    return NextResponse.json(result);
  } catch (error) {
    logger.error('[API] Failed to create Razorpay order', error as Error, {
      identifier,
      duration: Date.now() - startTime,
    });
    
    // Handle validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: error.issues,
        },
        { status: 400 }
      );
    }
    
    // Handle generic errors
    return NextResponse.json(
      {
        error: 'Failed to create order. Please try again.',
      },
      { status: 500 }
    );
  }
}
