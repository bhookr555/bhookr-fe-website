/**
 * Razorpay Webhook Handler
 * POST /api/payment/webhook
 * 
 * This endpoint receives webhooks from Razorpay after payment events
 * Events: payment.authorized, payment.captured, payment.failed, refund.created, etc.
 * 
 * Documentation: https://razorpay.com/docs/webhooks/
 * 
 * Security: Webhook signature verification using HMAC SHA256
 */

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { adminDb } from '@/lib/firebase/admin';
import { updateOrderStatus } from '@/lib/repositories/payment-repository';
import logger from '@/lib/logger';

/**
 * Verify Razorpay webhook signature
 */
function verifyWebhookSignature(body: string, signature: string): boolean {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  
  if (!webhookSecret) {
    logger.warn('Razorpay webhook secret not configured');
    return false;
  }

  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(body)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    logger.info('[Webhook] Razorpay webhook received', {
      origin: request.headers.get('origin'),
      userAgent: request.headers.get('user-agent'),
    });

    // Get raw body for signature verification
    const bodyText = await request.text();
    const signature = request.headers.get('x-razorpay-signature');

    if (!signature) {
      logger.security('[Webhook] Missing Razorpay signature');
      return NextResponse.json(
        { error: 'Missing signature' },
        { status: 401 }
      );
    }

    // Verify signature (optional but recommended for production)
    if (process.env.RAZORPAY_WEBHOOK_SECRET) {
      const isValid = verifyWebhookSignature(bodyText, signature);
      
      if (!isValid) {
        logger.security('[Webhook] Invalid Razorpay signature');
        return NextResponse.json(
          { error: 'Invalid signature' },
          { status: 401 }
        );
      }
    }

    // Parse webhook payload
    const payload = JSON.parse(bodyText);
    const event = payload.event;
    const paymentEntity = payload.payload?.payment?.entity;
    const refundEntity = payload.payload?.refund?.entity;

    logger.info('[Webhook] Processing event', {
      event,
      paymentId: paymentEntity?.id,
      refundId: refundEntity?.id,
    });

    // Handle payment events
    if (event === 'payment.captured' || event === 'payment.authorized') {
      if (!paymentEntity) {
        return NextResponse.json({ error: 'Missing payment entity' }, { status: 400 });
      }

      const orderId = paymentEntity.notes?.orderId;
      const leadEmail = paymentEntity.notes?.leadEmail;
      
      if (orderId) {
        // Update order to PAID - this will reconcile orders that were in PENDING status
        // due to failed signature verification
        logger.info('[Webhook] Updating order to PAID via webhook', {
          orderId,
          paymentId: paymentEntity.id,
          event,
        });
        
        const webhookRazorpayData: any = {
          paymentId: paymentEntity.id,
          orderId: paymentEntity.order_id,
        };
        
        // Only add method if it exists
        if (paymentEntity.method) {
          webhookRazorpayData.method = paymentEntity.method;
        }
        
        await updateOrderStatus(orderId, 'PAID', {
          paidAt: new Date(),
          razorpayData: webhookRazorpayData,
        });
        
        // Log success for monitoring
        logger.info('[Webhook] Order successfully updated to PAID', {
          orderId,
          paymentId: paymentEntity.id,
        });
      }

      // Auto-reconcile CRM Lead Status to CONVERTED
      if (leadEmail && adminDb) {
        logger.info('[Webhook] Auto-reconciling CRM lead status to CONVERTED via payment note', {
          leadEmail,
          paymentId: paymentEntity.id,
          amount: paymentEntity.amount / 100,
        });

        const key = String(leadEmail).toLowerCase().trim();
        await adminDb.collection("crm_pipeline").doc(key).set({
          status: "converted",
          updatedAt: new Date().toISOString(),
          updatedBy: "system",
          paymentMethod: paymentEntity.method || "online",
          amount: paymentEntity.amount / 100,
          planType: paymentEntity.notes?.planType || "custom",
          notes: `Automatically converted via Razorpay Payment (ID: ${paymentEntity.id})`,
        }, { merge: true });
      }
    }

    // Handle payment failed event
    if (event === 'payment.failed') {
      if (!paymentEntity) {
        return NextResponse.json({ error: 'Missing payment entity' }, { status: 400 });
      }

      const orderId = paymentEntity.notes?.orderId;
      
      if (orderId) {
        const failedRazorpayData: any = {
          paymentId: paymentEntity.id,
          orderId: paymentEntity.order_id,
        };
        
        // Only add method if it exists
        if (paymentEntity.method) {
          failedRazorpayData.method = paymentEntity.method;
        }
        
        await updateOrderStatus(orderId, 'FAILED', {
          razorpayData: failedRazorpayData,
        });
      }
    }

    // Handle payment link paid event
    if (event === 'payment_link.paid') {
      const paymentLinkEntity = payload.payload?.payment_link?.entity;
      const leadEmail = paymentLinkEntity?.notes?.leadEmail;

      if (leadEmail && paymentLinkEntity && adminDb) {
        logger.info('[Webhook] Auto-reconciling CRM lead status to CONVERTED via payment link paid event', {
          leadEmail,
          paymentLinkId: paymentLinkEntity.id,
          amount: paymentLinkEntity.amount / 100,
        });

        const key = String(leadEmail).toLowerCase().trim();
        await adminDb.collection("crm_pipeline").doc(key).set({
          status: "converted",
          updatedAt: new Date().toISOString(),
          updatedBy: "system",
          paymentMethod: "online",
          amount: paymentLinkEntity.amount / 100,
          planType: paymentLinkEntity.notes?.planType || "custom",
          notes: `Automatically converted via Razorpay Payment Link (ID: ${paymentLinkEntity.id})`,
        }, { merge: true });
      }
    }

    // Handle refund events
    if (event === 'refund.created' || event === 'refund.processed') {
      if (!refundEntity) {
        return NextResponse.json({ error: 'Missing refund entity' }, { status: 400 });
      }

      const paymentId = refundEntity.payment_id;
      
      // Find order by payment ID and update refund status
      if (adminDb && paymentId) {
        const ordersSnapshot = await adminDb
          .collection('orders')
          .where('razorpayData.razorpayPaymentId', '==', paymentId)
          .limit(1)
          .get();

        if (!ordersSnapshot.empty) {
          const orderDoc = ordersSnapshot.docs[0];
          if (orderDoc) {
            await orderDoc.ref.update({
              refundStatus: event === 'refund.processed' ? 'completed' : 'processing',
              refundAmount: refundEntity.amount / 100,
              refundId: refundEntity.id,
              refundedAt: new Date(),
              updatedAt: new Date(),
            });
          }
        }
      }
    }

    const duration = Date.now() - startTime;
    logger.info('[Webhook] Webhook processed successfully', {
      event,
      duration,
    });

    // Always return 200 to acknowledge receipt
    return NextResponse.json({
      success: true,
      message: 'Webhook processed',
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error(
      '[Webhook] Webhook processing error',
      error instanceof Error ? error : new Error(String(error)),
      { duration }
    );

    // Return 200 even on error to prevent Razorpay from retrying repeatedly
    // Log the error for manual investigation
    return NextResponse.json({
      success: false,
      message: 'Webhook processing failed',
    });
  }
}
