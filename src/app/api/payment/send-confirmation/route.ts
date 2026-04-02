/**
 * Send Order Confirmation Email API
 * POST /api/payment/send-confirmation
 * 
 * Sends order confirmation email after successful payment
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import logger from '@/lib/logger';
import { adminDb } from '@/lib/firebase/admin';
import { sendEmail, generateOrderConfirmationEmail } from '@/lib/email';
import type { OrderConfirmationData } from '@/lib/email/templates/order-confirmation';

const confirmationSchema = z.object({
  orderId: z.string().min(1, 'Order ID is required'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderId } = confirmationSchema.parse(body);

    logger.info('[API] Sending order confirmation email', { orderId });

    // Fetch order details
    const orderRef = adminDb?.collection('orders').doc(orderId);
    
    if (!adminDb || !orderRef) {
      logger.error('[API] Database service unavailable', new Error('adminDb not initialized'));
      return NextResponse.json(
        { success: false, error: 'Database service unavailable' },
        { status: 503 }
      );
    }

    const orderDoc = await orderRef.get();

    if (!orderDoc.exists) {
      logger.warn('[API] Order not found', { orderId });
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      );
    }

    const orderData = orderDoc.data();

    if (!orderData) {
      logger.error('[API] Order data is empty', new Error('Empty order data'), { orderId });
      return NextResponse.json(
        { success: false, error: 'Invalid order data' },
        { status: 500 }
      );
    }

    if (orderData.status !== 'PAID') {
      logger.warn('[API] Order is not paid', { orderId, status: orderData.status });
      return NextResponse.json(
        { success: false, error: 'Order is not paid' },
        { status: 400 }
      );
    }

    // Get subscription details if it's a subscription order
    let subscriptionDetails: any = null;
    if (orderData.orderType === 'subscription') {
      const subscriptionSnapshot = await adminDb.collection('subscriptions')
        .where('orderId', '==', orderId)
        .limit(1)
        .get();
      
      if (!subscriptionSnapshot.empty) {
        const subData = subscriptionSnapshot.docs[0]?.data();
        subscriptionDetails = {
          planName: subData?.planName || 'Subscription Plan',
          duration: subData?.activityAndDuration?.duration || 'Monthly',
          startDate: subData?.startDate?.toDate ? subData.startDate.toDate() : new Date(subData?.startDate || Date.now()),
        };
      }
    }
    
    // Prepare email data
    const emailData: OrderConfirmationData = {
      customerName: orderData.customerName || 'Customer',
      orderId: orderId,
      orderDate: orderData.createdAt?.toDate ? orderData.createdAt.toDate() : new Date(orderData.createdAt || Date.now()),
      items: orderData.items || [],
      totalAmount: orderData.amount || 0,
      paymentMethod: orderData.razorpayData?.method || 'Online Payment',
      transactionId: orderData.razorpayData?.paymentId || orderId,
      deliveryAddress: orderData.deliveryAddress,
      subscriptionDetails,
    };
    
    // Generate and send email
    const emailContent = generateOrderConfirmationEmail(emailData);
    
    const result = await sendEmail({
      to: orderData.customerEmail,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text,
    });
    
    if (!result.success) {
      logger.error('[API] Failed to send confirmation email', new Error(result.error), {
        orderId,
        email: orderData.customerEmail,
      });
      
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }
    
    logger.info('[API] Order confirmation sent successfully', {
      orderId,
      messageId: result.messageId,
      email: orderData.customerEmail,
    });

    return NextResponse.json({
      success: true,
      message: 'Confirmation email sent successfully',
      emailDelivery: {
        sent: true,
        messageId: result.messageId,
        recipient: orderData.customerEmail,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error(
      '[API] Failed to send confirmation email',
      error instanceof Error ? error : new Error(String(error))
    );

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to send confirmation email',
      },
      { status: 500 }
    );
  }
}
