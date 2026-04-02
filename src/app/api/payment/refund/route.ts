/**
 * Razorpay Refund Initiation API
 * POST /api/payment/refund
 * 
 * Initiates a refund for a completed payment
 * Documentation: https://razorpay.com/docs/api/refunds/
 * 
 * Security: Requires authentication, CSRF protection, and rate limiting
 */

import { NextRequest, NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import { requireAuth } from '@/lib/api-auth';
import { rateLimit, getIdentifier, RATE_LIMITS } from '@/lib/rate-limit';
import { verifyCsrfToken } from '@/lib/csrf';
import { adminDb } from '@/lib/firebase/admin';
import logger from '@/lib/logger';
import { z } from 'zod';

// Validation schema
const refundSchema = z.object({
  orderId: z.string().uuid('Invalid order ID'),
  razorpayPaymentId: z.string().min(1, 'Payment ID is required'),
  amount: z.number().positive('Amount must be positive').optional(), // Optional for partial refund
  reason: z.string().max(255).optional(),
});

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const identifier = getIdentifier(request);

  try {
    logger.info('Refund request received', {
      identifier,
    });

    // Verify authentication
    const user = await requireAuth(request);
    
    // Only admin users can initiate refunds (you can adjust this based on your requirements)
    // For now, we'll allow the order owner to request refund
    logger.info('User authenticated for refund', {
      userId: user.uid,
      email: user.email,
    });

    // Verify CSRF token
    if (!verifyCsrfToken(request, { consume: false })) {
      logger.security('CSRF token validation failed for refund', { 
        identifier,
        userId: user.uid,
      });
      return NextResponse.json(
        { error: 'Invalid or missing CSRF token' },
        { status: 403 }
      );
    }
    
    logger.apiRequest('POST', '/api/payment/refund', {
      identifier,
      userId: user.uid,
    });

    // Rate limiting
    const rateLimitResult = rateLimit(identifier, RATE_LIMITS.CHECKOUT);
    if (!rateLimitResult.success) {
      logger.security('Rate limit exceeded for refund', { 
        userId: user.uid 
      });
      
      return NextResponse.json(
        {
          error: 'Too many refund requests. Please try again later.',
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

    // Parse and validate request
    const body = await request.json();
    const validatedData = refundSchema.parse(body);

    // Check if order exists and belongs to user (or user is admin)
    if (adminDb) {
      const orderRef = adminDb.collection('orders').doc(validatedData.orderId);
      const orderSnap = await orderRef.get();

      if (!orderSnap.exists) {
        logger.warn('Order not found for refund', {
          orderId: validatedData.orderId,
          userId: user.uid,
        });
        return NextResponse.json(
          { error: 'Order not found' },
          { status: 404 }
        );
      }

      const orderData = orderSnap.data();
      
      // Verify order belongs to user (you might want to add admin check here)
      if (orderData?.userId !== user.uid) {
        logger.security('Unauthorized refund attempt', {
          orderId: validatedData.orderId,
          userId: user.uid,
          orderUserId: orderData?.userId,
        });
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 403 }
        );
      }

      // Check if order is paid
      if (orderData?.status !== 'COMPLETED') {
        logger.warn('Refund requested for unpaid order', {
          orderId: validatedData.orderId,
          status: orderData?.status,
        });
        return NextResponse.json(
          { error: 'Order is not completed' },
          { status: 400 }
        );
      }

      // Check if refund already initiated
      if (orderData?.refundStatus && orderData.refundStatus !== 'none') {
        logger.warn('Refund already initiated', {
          orderId: validatedData.orderId,
          refundStatus: orderData?.refundStatus,
        });
        return NextResponse.json(
          { error: 'Refund already initiated or completed' },
          { status: 400 }
        );
      }
    }

    // Initialize Razorpay
    const razorpay = new Razorpay({
      key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID!,
      key_secret: process.env.RAZORPAY_KEY_SECRET!,
    });

    // Initiate refund with Razorpay
    logger.info('[Refund] Initiating Razorpay refund', {
      orderId: validatedData.orderId,
      paymentId: validatedData.razorpayPaymentId,
      amount: validatedData.amount,
    });

    const refundData: any = {};
    if (validatedData.amount) {
      refundData.amount = Math.round(validatedData.amount * 100); // Convert to paise
    }
    if (validatedData.reason) {
      refundData.notes = { reason: validatedData.reason };
    }

    const refund = await razorpay.payments.refund(
      validatedData.razorpayPaymentId,
      refundData
    );

    logger.info('[Refund] Razorpay refund initiated', {
      orderId: validatedData.orderId,
      refundId: refund.id,
      amount: refund.amount ? refund.amount / 100 : undefined,
      status: refund.status,
    });

    // Update order with refund information
    if (adminDb) {
      try {
        const orderRef = adminDb.collection('orders').doc(validatedData.orderId);
        await orderRef.update({
          refundStatus: 'processing',
          refundId: refund.id,
          refundAmount: refund.amount ? refund.amount / 100 : undefined,
          refundReason: validatedData.reason || 'Customer requested',
          refundInitiatedAt: new Date(),
          refundInitiatedBy: user.uid,
          updatedAt: new Date(),
        });
      } catch (dbError) {
        logger.error('[Refund] Failed to update order', dbError instanceof Error ? dbError : new Error(String(dbError)), {
          orderId: validatedData.orderId,
        });
      }
    }

    const duration = Date.now() - startTime;
    logger.info('[Refund] Refund completed', {
      orderId: validatedData.orderId,
      refundId: refund.id,
      duration,
    });

    return NextResponse.json({
      success: true,
      refundId: refund.id,
      amount: refund.amount ? refund.amount / 100 : undefined,
      status: refund.status,
      message: 'Refund initiated successfully',
    });

  } catch (error) {
    const duration = Date.now() - startTime;

    if (error instanceof z.ZodError) {
      logger.warn('[Refund] Validation failed', {
        errors: error.issues,
        identifier,
      });

      return NextResponse.json(
        {
          error: 'Validation failed',
          details: error.issues.map(e => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        },
        { status: 400 }
      );
    }

    logger.error(
      '[Refund] Refund initiation failed',
      error instanceof Error ? error : new Error(String(error)),
      { identifier, duration }
    );

    return NextResponse.json(
      { error: 'Failed to initiate refund. Please try again.' },
      { status: 500 }
    );
  }
}
