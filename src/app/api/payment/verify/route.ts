/**
 * Payment Status Verification API
 * GET /api/payment/verify?orderId={orderId}
 * 
 * This endpoint checks the payment status of an existing order.
 * Used for verifying payment after redirect or page refresh.
 * 
 * Note: This is different from /api/payment/razorpay/verify which
 * performs signature verification of a new payment.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import logger from '@/lib/logger';
import { adminDb } from '@/lib/firebase/admin';

/**
 * Validation schema for order ID parameter
 */
const orderIdSchema = z.string().min(1, 'Order ID is required');

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Get order ID from URL params
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('orderId');
    
    logger.info('[API] Payment status check request', { orderId });
    
    // Validate order ID
    if (!orderId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Order ID is required',
        },
        { status: 400 }
      );
    }
    
    const validatedOrderId = orderIdSchema.parse(orderId);
    
    // Fetch order from database
    const orderRef = adminDb?.collection('orders').doc(validatedOrderId);
    
    if (!adminDb || !orderRef) {
      logger.error('[API] Firebase Admin not initialized', new Error('Firebase Admin unavailable'));
      return NextResponse.json(
        {
          success: false,
          error: 'Database service unavailable',
        },
        { status: 503 }
      );
    }
    
    const orderDoc = await orderRef.get();
    
    if (!orderDoc.exists) {
      logger.warn('[API] Order not found', { orderId: validatedOrderId });
      
      return NextResponse.json(
        {
          success: false,
          error: 'Order not found',
        },
        { status: 404 }
      );
    }
    
    const orderData = orderDoc.data();
    
    if (!orderData) {
      logger.error('[API] Order data is empty', new Error('Empty order data'), {
        orderId: validatedOrderId,
      });
      
      return NextResponse.json(
        {
          success: false,
          error: 'Order data is invalid',
        },
        { status: 500 }
      );
    }
    
    logger.info('[API] Order status retrieved', {
      orderId: validatedOrderId,
      status: orderData.status,
      paymentMethod: orderData.paymentMethod,
      duration: Date.now() - startTime,
    });
    
    // Calculate pricing breakdown if not stored (for backward compatibility)
    const itemAmount = orderData.itemAmount || orderData.subtotal || (orderData.items?.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0) || 0);
    const deliveryBase = orderData.deliveryBase || 99;
    const itemGST = orderData.itemGST || Math.round(itemAmount * 0.05);
    const deliveryGST = orderData.deliveryGST || Math.round(deliveryBase * 0.18);
    const deliveryCharges = orderData.deliveryCharges || (deliveryBase + deliveryGST);
    
    // Return comprehensive order details
    return NextResponse.json({
      success: true,
      orderId: validatedOrderId,
      status: orderData.status,
      orderType: orderData.orderType || (orderData.startDate || orderData.duration ? 'subscription' : 'menu'),
      amount: orderData.grandTotal || orderData.amount || 0,
      transactionId: orderData.razorpayData?.paymentId || orderData.paymentId,
      paymentMethod: orderData.paymentMethod || orderData.razorpayData?.method,
      paidAt: orderData.paidAt || orderData.createdAt,
      message: getStatusMessage(orderData.status),
      // Additional details for order confirmation
      customerName: orderData.customerName,
      customerEmail: orderData.customerEmail,
      customerPhone: orderData.customerPhone,
      items: orderData.items || [],
      deliveryAddress: orderData.deliveryAddress,
      // Pricing breakdown (use stored values or calculate for backward compatibility)
      itemAmount,
      itemGST,
      deliveryBase,
      deliveryGST,
      deliveryCharges,
      subscriptionAmount: orderData.subscriptionAmount,
      gstAmount: orderData.gstAmount,
      startDate: orderData.startDate,
      duration: orderData.duration,
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    
    logger.error('[API] Payment status check error', error as Error, {
      duration,
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    
    // Handle validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid order ID',
          details: error.issues.map(e => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        },
        { status: 400 }
      );
    }
    
    // Handle generic errors
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to verify payment status',
      },
      { status: 500 }
    );
  }
}

/**
 * Get user-friendly status message
 */
function getStatusMessage(status: string): string {
  switch (status?.toUpperCase()) {
    case 'PAID':
      return 'Payment successful! Your order has been confirmed.';
    case 'PENDING':
      return 'Payment is being processed. Please wait...';
    case 'FAILED':
      return 'Payment failed. Please try again or contact support.';
    case 'EXPIRED':
      return 'Payment session expired. Please create a new order.';
    default:
      return 'Order status unknown. Please contact support.';
  }
}
