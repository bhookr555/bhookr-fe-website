/**
 * Razorpay Payment Integration
 * 
 * Official Documentation: https://razorpay.com/docs/payments/server-integration/nodejs/
 * 
 * Integration Flow:
 * 1. Create Order on Backend (Server-side)
 * 2. Initialize Razorpay Checkout on Frontend
 * 3. Handle Payment Response
 * 4. Verify Payment Signature on Backend
 * 5. Update Order Status
 */

import Razorpay from 'razorpay';
import crypto from 'crypto';
import logger from '@/lib/logger';

/**
 * Razorpay Configuration
 */
interface RazorpayConfig {
  keyId: string;
  keySecret: string;
  webhookSecret?: string;
}

/**
 * Get Razorpay configuration from environment
 */
function getRazorpayConfig(): RazorpayConfig {
  const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  
  if (!keyId || !keySecret) {
    throw new Error(
      'Razorpay credentials are not configured. ' +
      'Please add NEXT_PUBLIC_RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to your .env.local file.'
    );
  }
  
  // Log which environment we're using (without revealing full keys)
  const environment = keyId.startsWith('rzp_test_') ? 'TEST' : 
                     keyId.startsWith('rzp_live_') ? 'LIVE' : 'UNKNOWN';
  logger.info('[Razorpay] Using credentials', {
    environment,
    keyIdPrefix: keyId.substring(0, 12),
    keySecretPrefix: keySecret.substring(0, 8),
  });
  
  return {
    keyId,
    keySecret,
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET,
  };
}

/**
 * Get Razorpay instance
 */
function getRazorpayInstance(): Razorpay {
  const config = getRazorpayConfig();
  
  return new Razorpay({
    key_id: config.keyId,
    key_secret: config.keySecret,
  });
}

/**
 * Create Razorpay Order Request
 */
export interface CreateRazorpayOrderRequest {
  orderId: string;
  amount: number; // in INR
  userId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  items: Array<{
    planId: string;
    name: string;
    price: number;
    quantity: number;
  }>;
  deliveryAddress: {
    fullName: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    pinCode: string;
  };
}

/**
 * Create Razorpay Order Response
 */
export interface CreateRazorpayOrderResponse {
  success: boolean;
  orderId: string; // Our internal order ID
  razorpayOrderId: string; // Razorpay's order ID
  amount: number; // in paise
  currency: string;
  keyId: string; // Public key for frontend
  message?: string;
}

/**
 * Verify Payment Request
 */
export interface VerifyRazorpayPaymentRequest {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
  orderId: string; // Our internal order ID
}

/**
 * Verify Payment Response
 */
export interface VerifyRazorpayPaymentResponse {
  success: boolean;
  verified: boolean;
  orderId: string;
  paymentId: string;
  message?: string;
}

/**
 * Create a Razorpay order
 * 
 * This function:
 * 1. Validates input
 * 2. Creates order on Razorpay
 * 3. Returns order details for frontend checkout
 * 
 * @param request - Order creation request
 * @returns Razorpay order details
 */
export async function createRazorpayOrder(
  request: CreateRazorpayOrderRequest
): Promise<CreateRazorpayOrderResponse> {
  const startTime = Date.now();
  
  try {
    logger.info('[Razorpay] Creating order', {
      orderId: request.orderId,
      amount: request.amount,
      userId: request.userId,
    });
    
    // Convert amount to paise (Razorpay expects amount in smallest currency unit)
    const amountInPaise = Math.round(request.amount * 100);
    
    // Validate amount
    if (amountInPaise < 100) {
      throw new Error('Amount must be at least ₹1');
    }
    
    if (amountInPaise > 1500000000) {
      throw new Error('Amount cannot exceed ₹15,00,00,000');
    }
    
    // Get Razorpay instance
    const razorpay = getRazorpayInstance();
    const config = getRazorpayConfig();
    
    // Create Razorpay order
    const orderOptions = {
      amount: amountInPaise,
      currency: 'INR',
      receipt: request.orderId, // Our internal order ID
      notes: {
        orderId: request.orderId,
        userId: request.userId,
        customerName: request.customerName,
        customerEmail: request.customerEmail,
        customerPhone: request.customerPhone,
        itemCount: request.items.length,
      },
    };
    
    logger.info('[Razorpay] Creating order with options', orderOptions);
    
    const razorpayOrder = await razorpay.orders.create(orderOptions);
    
    logger.info('[Razorpay] Order created successfully', {
      razorpayOrderId: razorpayOrder.id,
      orderId: request.orderId,
      amount: razorpayOrder.amount,
      duration: Date.now() - startTime,
    });
    
    return {
      success: true,
      orderId: request.orderId,
      razorpayOrderId: razorpayOrder.id,
      amount: Number(razorpayOrder.amount),
      currency: razorpayOrder.currency,
      keyId: config.keyId,
    };
  } catch (error) {
    logger.error('[Razorpay] Failed to create order', error as Error, {
      orderId: request.orderId,
      duration: Date.now() - startTime,
    });
    
    throw error;
  }
}

/**
 * Verify Razorpay payment signature
 * 
 * This function validates that the payment was actually completed on Razorpay
 * by verifying the signature sent from the frontend.
 * 
 * Security: This MUST be done on the backend to prevent payment fraud.
 * 
 * @param request - Payment verification request
 * @returns Verification result
 */
export async function verifyRazorpayPayment(
  request: VerifyRazorpayPaymentRequest
): Promise<VerifyRazorpayPaymentResponse> {
  const startTime = Date.now();
  
  try {
    logger.info('[Razorpay] Verifying payment', {
      orderId: request.orderId,
      razorpayOrderId: request.razorpayOrderId,
      razorpayPaymentId: request.razorpayPaymentId,
      hasSignature: !!request.razorpaySignature,
      signatureLength: request.razorpaySignature?.length || 0,
    });
    
    const config = getRazorpayConfig();
    
    // Create signature string
    const signatureString = `${request.razorpayOrderId}|${request.razorpayPaymentId}`;
    
    logger.info('[Razorpay] Signature string created', {
      signatureString,
      keySecretLength: config.keySecret.length,
    });
    
    // Generate expected signature
    const expectedSignature = crypto
      .createHmac('sha256', config.keySecret)
      .update(signatureString)
      .digest('hex');
    
    // Compare signatures (constant-time comparison for security)
    // Note: Both signatures should be the same length for HMAC-SHA256 (64 hex chars)
    let isValid = false;
    try {
      if (expectedSignature.length === request.razorpaySignature.length) {
        isValid = crypto.timingSafeEqual(
          Buffer.from(expectedSignature),
          Buffer.from(request.razorpaySignature)
        );
      } else {
        logger.warn('[Razorpay] Signature length mismatch', {
          expectedLength: expectedSignature.length,
          receivedLength: request.razorpaySignature.length,
        });
      }
    } catch (error) {
      logger.error('[Razorpay] Signature comparison error', error as Error);
      // Fall back to string comparison
      isValid = expectedSignature === request.razorpaySignature;
    }
    
    logger.info('[Razorpay] Payment verification result', {
      orderId: request.orderId,
      verified: isValid,
      expectedSignaturePrefix: expectedSignature.substring(0, 10),
      receivedSignaturePrefix: request.razorpaySignature.substring(0, 10),
      expectedLength: expectedSignature.length,
      receivedLength: request.razorpaySignature.length,
      signaturesMatch: isValid,
      duration: Date.now() - startTime,
    });
    
    if (!isValid) {
      logger.security('[Razorpay] Payment signature verification failed', {
        orderId: request.orderId,
        razorpayOrderId: request.razorpayOrderId,
        razorpayPaymentId: request.razorpayPaymentId,
      });
    }
    
    return {
      success: true,
      verified: isValid,
      orderId: request.orderId,
      paymentId: request.razorpayPaymentId,
      message: isValid ? 'Payment verified successfully' : 'Payment verification failed',
    };
  } catch (error) {
    logger.error('[Razorpay] Payment verification error', error as Error, {
      orderId: request.orderId,
      duration: Date.now() - startTime,
    });
    
    return {
      success: false,
      verified: false,
      orderId: request.orderId,
      paymentId: request.razorpayPaymentId,
      message: 'Payment verification failed due to an error',
    };
  }
}

/**
 * Fetch payment details from Razorpay
 * 
 * @param paymentId - Razorpay payment ID
 * @returns Payment details
 */
export async function fetchPaymentDetails(paymentId: string) {
  try {
    const razorpay = getRazorpayInstance();
    const payment = await razorpay.payments.fetch(paymentId);
    
    logger.info('[Razorpay] Fetched payment details', {
      paymentId,
      status: payment.status,
      amount: payment.amount,
    });
    
    return payment;
  } catch (error) {
    logger.error('[Razorpay] Failed to fetch payment details', error as Error, {
      paymentId,
    });
    
    throw error;
  }
}

/**
 * Initiate a refund
 * 
 * @param paymentId - Razorpay payment ID
 * @param amount - Amount to refund in paise (optional, defaults to full refund)
 * @param notes - Additional notes
 * @returns Refund details
 */
export async function initiateRefund(
  paymentId: string,
  amount?: number,
  notes?: Record<string, string>
) {
  try {
    const razorpay = getRazorpayInstance();
    
    const refundOptions: any = {
      speed: 'normal', // 'normal' or 'optimum'
    };
    
    if (amount) {
      refundOptions.amount = amount;
    }
    
    if (notes) {
      refundOptions.notes = notes;
    }
    
    const refund = await razorpay.payments.refund(paymentId, refundOptions);
    
    logger.info('[Razorpay] Refund initiated', {
      paymentId,
      refundId: refund.id,
      amount: refund.amount,
      status: refund.status,
    });
    
    return refund;
  } catch (error) {
    logger.error('[Razorpay] Failed to initiate refund', error as Error, {
      paymentId,
      amount,
    });
    
    throw error;
  }
}

/**
 * Verify webhook signature
 * 
 * @param webhookBody - Raw webhook body
 * @param webhookSignature - Signature from Razorpay-Signature header
 * @returns True if signature is valid
 */
export function verifyWebhookSignature(
  webhookBody: string,
  webhookSignature: string
): boolean {
  try {
    const config = getRazorpayConfig();
    
    if (!config.webhookSecret) {
      logger.warn('[Razorpay] Webhook secret not configured');
      return false;
    }
    
    const expectedSignature = crypto
      .createHmac('sha256', config.webhookSecret)
      .update(webhookBody)
      .digest('hex');
    
    return expectedSignature === webhookSignature;
  } catch (error) {
    logger.error('[Razorpay] Webhook signature verification failed', error as Error);
    return false;
  }
}
