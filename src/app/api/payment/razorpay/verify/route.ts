/**
 * Razorpay Payment Verification API
 * POST /api/payment/razorpay/verify
 * 
 * Verifies Razorpay payment signature and updates order status
 * 
 * Security:
 * - Requires authentication
 * - Verifies payment signature using secret key
 * - Rate limited
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/api-auth';
import { rateLimit, getIdentifier, RATE_LIMITS } from '@/lib/rate-limit';
import logger from '@/lib/logger';
import { verifyRazorpayPayment, fetchPaymentDetails } from '@/lib/payment/razorpay';
import { updateOrderStatus, createPaymentTransaction, getOrder } from '@/lib/repositories/payment-repository';
import { alertPaymentVerificationFailed } from '@/lib/notifications/admin-alerts';
import { adminDb } from '@/lib/firebase/admin';
import { submitOrderToSheet } from '@/lib/google-sheets';
import type { PaymentTransaction } from '@/types/payment';
import { sendEmail, generateOrderConfirmationEmail } from '@/lib/email';
import type { OrderConfirmationData } from '@/lib/email/templates/order-confirmation';

/**
 * Validation schema for verify payment request
 */
const verifyPaymentSchema = z.object({
  orderId: z.string().min(1, 'Order ID is required'),
  razorpayOrderId: z.string().min(1, 'Razorpay order ID is required'),
  razorpayPaymentId: z.string().min(1, 'Razorpay payment ID is required'),
  razorpaySignature: z.string().min(1, 'Razorpay signature is required'),
});

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const identifier = getIdentifier(request);
  
  try {
    logger.info('[API] Razorpay payment verification request received', { identifier });
    
    // 1. Authentication
    const user = await requireAuth(request);
    logger.info('[API] User authenticated', { userId: user.uid });
    
    // Note: CSRF not needed here - Bearer token authentication is sufficient
    
    // 2. Rate Limiting
    const rateLimitResult = rateLimit(identifier, RATE_LIMITS.CHECKOUT);
    
    if (!rateLimitResult.success) {
      logger.security('[API] Rate limit exceeded', { userId: user.uid });
      
      return NextResponse.json(
        {
          error: 'Too many verification requests. Please try again later.',
          retryAfter: Math.ceil((rateLimitResult.reset - Date.now()) / 1000),
        },
        { status: 429 }
      );
    }
    
    // 3. Parse and validate request body
    const body = await request.json();
    
    logger.info('[API] Verify request received', {
      orderId: body.orderId,
      razorpayOrderId: body.razorpayOrderId,
      razorpayPaymentId: body.razorpayPaymentId,
      hasSignature: !!body.razorpaySignature,
    });
    
    const validatedData = verifyPaymentSchema.parse(body);
    
    logger.info('[API] Verifying payment', {
      userId: user.uid,
      orderId: validatedData.orderId,
      razorpayOrderId: validatedData.razorpayOrderId,
      razorpayPaymentId: validatedData.razorpayPaymentId,
    });
    
    // 4. Check if already verified (idempotency check)
    if (adminDb) {
      const orderDoc = await adminDb.collection('orders').doc(validatedData.orderId).get();
      if (orderDoc.exists) {
        const orderData = orderDoc.data();
        if (orderData?.status === 'PAID') {
          logger.info('[API] Payment already verified, returning cached result', {
            orderId: validatedData.orderId,
            paymentId: validatedData.razorpayPaymentId,
          });
          
          return NextResponse.json({
            success: true,
            verified: true,
            orderId: validatedData.orderId,
            paymentId: validatedData.razorpayPaymentId,
            status: 'PAID',
            message: 'Payment already verified',
          });
        }
      }
    }
    
    // 5. Verify payment signature
    const verificationResult = await verifyRazorpayPayment({
      orderId: validatedData.orderId,
      razorpayOrderId: validatedData.razorpayOrderId,
      razorpayPaymentId: validatedData.razorpayPaymentId,
      razorpaySignature: validatedData.razorpaySignature,
    });
    
    if (!verificationResult.verified) {
      logger.security('[API] Payment verification failed', {
        userId: user.uid,
        orderId: validatedData.orderId,
      });
      
      // CRITICAL: Check if payment was actually captured on Razorpay
      // This prevents marking orders as FAILED when payment succeeded but signature verification failed
      try {
        const paymentDetails = await fetchPaymentDetails(validatedData.razorpayPaymentId);
        
        if (paymentDetails.status === 'captured' || paymentDetails.status === 'authorized') {
          // Payment was successful on Razorpay but signature verification failed
          // This could indicate:
          // 1. Key mismatch (test vs live)
          // 2. Tampered signature
          // 3. Race condition
          // DO NOT mark as FAILED - requires manual review
          
          logger.security('[API] CRITICAL: Payment captured but verification failed', {
            userId: user.uid,
            orderId: validatedData.orderId,
            paymentId: validatedData.razorpayPaymentId,
            paymentStatus: paymentDetails.status,
            amount: paymentDetails.amount,
            method: paymentDetails.method,
            message: 'MANUAL REVIEW REQUIRED - Payment succeeded but signature verification failed',
          });
          
          // Send admin alert for manual review
          await alertPaymentVerificationFailed({
            orderId: validatedData.orderId,
            paymentId: validatedData.razorpayPaymentId,
            userId: user.uid,
            amount: Number(paymentDetails.amount) / 100,
            paymentStatus: paymentDetails.status,
            razorpayOrderId: validatedData.razorpayOrderId,
          });
          
          // Update order to PENDING_REVIEW status
          const pendingRazorpayData: any = {
            orderId: validatedData.razorpayOrderId,
            paymentId: validatedData.razorpayPaymentId,
          };
          
          // Only add method if it exists
          if (paymentDetails.method) {
            pendingRazorpayData.method = paymentDetails.method;
          }
          
          await updateOrderStatus(validatedData.orderId, 'PENDING', {
            razorpayData: pendingRazorpayData,
          });
          
          // Create a payment transaction record for manual review
          const reviewTransaction: PaymentTransaction = {
            paymentId: validatedData.razorpayPaymentId,
            orderId: validatedData.orderId,
            userId: user.uid,
            amount: Number(paymentDetails.amount) / 100,
            currency: 'INR',
            status: 'PENDING', // Pending manual review
            gateway: 'RAZORPAY',
            method: paymentDetails.method?.toUpperCase() || 'UNKNOWN',
            razorpayData: {
              orderId: validatedData.razorpayOrderId,
              paymentId: validatedData.razorpayPaymentId,
              signature: validatedData.razorpaySignature,
              status: paymentDetails.status,
              method: paymentDetails.method || 'unknown',
              email: paymentDetails.email || '',
              contact: String(paymentDetails.contact || ''),
              errorDescription: 'Signature verification failed but payment was captured',
            },
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          
          await createPaymentTransaction(reviewTransaction);
          
          return NextResponse.json(
            {
              success: false,
              verified: false,
              status: 'PENDING_REVIEW',
              error: 'Payment verification failed but payment was captured. Our team will review and process your order within 24 hours. You will receive an email confirmation.',
              message: 'Your payment was received. Order is under review.',
            },
            { status: 202 } // 202 Accepted - for manual review
          );
        } else {
          // Payment was not captured - safe to mark as FAILED
          logger.info('[API] Payment not captured, marking order as failed', {
            orderId: validatedData.orderId,
            paymentStatus: paymentDetails.status,
          });
          
          await updateOrderStatus(validatedData.orderId, 'FAILED');
          
          return NextResponse.json(
            {
              success: false,
              verified: false,
              error: 'Payment verification failed. No amount was deducted.',
            },
            { status: 400 }
          );
        }
      } catch (fetchError) {
        // Could not fetch payment details - be conservative and don't mark as failed
        logger.error('[API] Failed to fetch payment details after verification failure', fetchError as Error, {
          orderId: validatedData.orderId,
          paymentId: validatedData.razorpayPaymentId,
        });
        
        await updateOrderStatus(validatedData.orderId, 'PENDING');
        
        return NextResponse.json(
          {
            success: false,
            verified: false,
            status: 'PENDING_REVIEW',
            error: 'Payment verification failed. Our team will review your payment and contact you within 24 hours.',
          },
          { status: 202 }
        );
      }
    }
    
    // 5. Fetch payment details from Razorpay
    const paymentDetails = await fetchPaymentDetails(validatedData.razorpayPaymentId);
    
    logger.info('[API] Payment details fetched', {
      orderId: validatedData.orderId,
      paymentId: validatedData.razorpayPaymentId,
      status: paymentDetails.status,
      method: paymentDetails.method,
    });
    
    // 6. Create payment transaction record
    const razorpayData: any = {
      orderId: validatedData.razorpayOrderId,
      paymentId: validatedData.razorpayPaymentId,
      signature: validatedData.razorpaySignature,
      status: paymentDetails.status,
      method: paymentDetails.method || 'unknown',
      email: paymentDetails.email || '',
      contact: String(paymentDetails.contact || ''),
    };
    
    // Only add optional fields if they exist (Firestore doesn't accept undefined)
    if (paymentDetails.fee !== undefined && paymentDetails.fee !== null) {
      razorpayData.fee = paymentDetails.fee;
    }
    if (paymentDetails.tax !== undefined && paymentDetails.tax !== null) {
      razorpayData.tax = paymentDetails.tax;
    }
    if (paymentDetails.error_code) {
      razorpayData.errorCode = paymentDetails.error_code;
    }
    if (paymentDetails.error_description) {
      razorpayData.errorDescription = paymentDetails.error_description;
    }
    
    const transaction: PaymentTransaction = {
      paymentId: validatedData.razorpayPaymentId,
      orderId: validatedData.orderId,
      userId: user.uid,
      amount: Number(paymentDetails.amount) / 100, // Convert paise to INR
      currency: 'INR',
      status: paymentDetails.status === 'captured' ? 'SUCCESS' : 'PENDING',
      gateway: 'RAZORPAY',
      method: paymentDetails.method?.toUpperCase() || 'UNKNOWN',
      razorpayData,
      createdAt: new Date(),
      updatedAt: new Date(),
      verifiedAt: new Date(),
    };
    
    await createPaymentTransaction(transaction);
    
    // 7. Update order status to PAID
    const updateRazorpayData: any = {
      orderId: validatedData.razorpayOrderId,
      paymentId: validatedData.razorpayPaymentId,
    };
    
    // Only add method if it exists (Firestore doesn't accept undefined)
    if (paymentDetails.method) {
      updateRazorpayData.method = paymentDetails.method;
    }
    
    await updateOrderStatus(validatedData.orderId, 'PAID', {
      paidAt: new Date(),
      razorpayData: updateRazorpayData,
    });
    
    logger.info('[API] Payment verified and order updated', {
      orderId: validatedData.orderId,
      paymentId: validatedData.razorpayPaymentId,
      duration: Date.now() - startTime,
    });

    // 7.1 Activate subscription if order is for subscription
    try {
      if (!adminDb) {
        throw new Error('Firebase Admin not initialized');
      }
      
      logger.info('[API] Searching for subscription to activate', {
        orderId: validatedData.orderId,
        userId: user.uid,
      });
      
      // Find subscription by orderId
      const subscriptionsRef = adminDb.collection('subscriptions');
      const subscriptionSnapshot = await subscriptionsRef
        .where('orderId', '==', validatedData.orderId)
        .where('userId', '==', user.uid)
        .limit(1)
        .get();
      
      logger.info('[API] Subscription query result', {
        found: !subscriptionSnapshot.empty,
        count: subscriptionSnapshot.docs.length,
      });
      
      if (!subscriptionSnapshot.empty) {
        const subscriptionDoc = subscriptionSnapshot.docs[0]!;
        const subData = subscriptionDoc.data();
        
        logger.info('[API] Found subscription document', {
          subscriptionId: subscriptionDoc.id,
          currentStatus: subData.status,
          orderId: subData.orderId,
        });
        
        // Only activate if currently pending
        if (subData.status === 'pending') {
          await subscriptionDoc.ref.update({
            status: 'active',
            activatedAt: new Date(),
            updatedAt: new Date(),
          });
          
          logger.info('[API] Subscription activated successfully', {
            subscriptionId: subscriptionDoc.id,
            orderId: validatedData.orderId,
            previousStatus: 'pending',
            newStatus: 'active',
          });
        } else {
          logger.warn('[API] Subscription not activated - wrong status', {
            subscriptionId: subscriptionDoc.id,
            currentStatus: subData.status,
            expectedStatus: 'pending',
          });
        }
      } else {
        logger.warn('[API] No subscription found for orderId', {
          userId: user.uid,
          orderId: validatedData.orderId,
          message: 'Payment succeeded but no subscription to activate - may be a regular order',
        });
      }
    } catch (activationError) {
      // Don't fail payment if subscription activation fails - can be done manually
      logger.error('[API] Failed to activate subscription', activationError as Error, {
        orderId: validatedData.orderId,
        userId: user.uid,
        errorMessage: activationError instanceof Error ? activationError.message : String(activationError),
        errorStack: activationError instanceof Error ? activationError.stack : undefined,
      });
    }
    
    // 7.2 Submit order to Google Sheets for menu orders
    try {
      const orderData = await getOrder(validatedData.orderId);
      
      if (orderData && orderData.orderType === 'menu') {
        logger.info('[API] Submitting menu order to Google Sheets', {
          orderId: validatedData.orderId,
          customerEmail: orderData.customerEmail,
        });
        
        await submitOrderToSheet({
          orderId: orderData.orderId,
          customerName: orderData.customerName,
          customerEmail: orderData.customerEmail,
          customerPhone: orderData.customerPhone,
          deliveryAddress: orderData.deliveryAddress,
          items: orderData.items.map(item => ({
            planId: item.planId,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            total: item.price * item.quantity,
          })),
          subtotal: orderData.itemAmount || orderData.amount,
          itemGST: orderData.itemGST || 0,
          deliveryBase: orderData.deliveryBase || 0,
          deliveryGST: orderData.deliveryGST || 0,
          grandTotal: orderData.grandTotal || orderData.amount,
          paymentStatus: 'success',
          paymentId: validatedData.razorpayPaymentId,
          paymentMethod: paymentDetails.method || 'unknown',
          paymentTimestamp: new Date().toISOString(),
        });
        
        logger.info('[API] Order submitted to Google Sheets successfully', {
          orderId: validatedData.orderId,
        });
      } else {
        logger.info('[API] Order is not a menu order, skipping Google Sheets submission', {
          orderId: validatedData.orderId,
          orderType: orderData?.orderType,
        });
      }
    } catch (sheetsError) {
      // Don't fail payment if Google Sheets submission fails
      logger.error('[API] Failed to submit order to Google Sheets', sheetsError as Error, {
        orderId: validatedData.orderId,
        errorMessage: sheetsError instanceof Error ? sheetsError.message : String(sheetsError),
      });
    }
    
    // 7.3 Send order confirmation email
    let emailDeliveryStatus: any = null;
    
    try {
      logger.info('[API] 📧 Starting email confirmation process', {
        orderId: validatedData.orderId,
      });
      
      const orderData = await getOrder(validatedData.orderId);
      
      if (!orderData) {
        logger.warn('[API] ⚠️ Cannot send email - order data not found', {
          orderId: validatedData.orderId,
        });
      } else if (!orderData.customerEmail) {
        logger.warn('[API] ⚠️ Cannot send email - customer email missing', {
          orderId: validatedData.orderId,
          hasCustomerName: !!orderData.customerName,
        });
      } else {
        logger.info('[API] 📧 Order data retrieved, preparing email', {
          orderId: validatedData.orderId,
          email: orderData.customerEmail,
          orderType: orderData.orderType,
        });

        // Get subscription details if it's a subscription order
        let subscriptionDetails: OrderConfirmationData['subscriptionDetails'] = undefined;
        if (orderData.orderType === 'subscription') {
          const subscriptionSnapshot = await adminDb!.collection('subscriptions')
            .where('orderId', '==', validatedData.orderId)
            .limit(1)
            .get();
          
          if (!subscriptionSnapshot.empty) {
            const subData = subscriptionSnapshot.docs[0]?.data();
            
            // Helper to safely convert Firestore Timestamp or Date to Date
            const toSafeDate = (dateValue: any): Date => {
              if (!dateValue) return new Date();
              if (dateValue.toDate && typeof dateValue.toDate === 'function') {
                return dateValue.toDate();
              }
              if (dateValue instanceof Date) return dateValue;
              return new Date(dateValue);
            };
            
            subscriptionDetails = {
              planName: subData?.planName || 'Subscription Plan',
              duration: subData?.activityAndDuration?.duration || 'Monthly',
              startDate: toSafeDate(subData?.startDate),
            };
          }
        }

        // Helper to safely convert Firestore Timestamp or Date to Date
        const toSafeDate = (dateValue: any): Date => {
          if (!dateValue) return new Date();
          if (dateValue.toDate && typeof dateValue.toDate === 'function') {
            return dateValue.toDate();
          }
          if (dateValue instanceof Date) return dateValue;
          return new Date(dateValue);
        };

        // Prepare email data
        const emailData: OrderConfirmationData = {
          customerName: orderData.customerName || 'Customer',
          orderId: validatedData.orderId,
          orderDate: toSafeDate(orderData.createdAt),
          items: orderData.items || [],
          totalAmount: orderData.amount || 0,
          paymentMethod: paymentDetails.method || 'Online Payment',
          transactionId: validatedData.razorpayPaymentId,
          deliveryAddress: orderData.deliveryAddress,
          subscriptionDetails,
        };

        // Generate and send email
        const emailContent = generateOrderConfirmationEmail(emailData);
        
        const emailResult = await sendEmail({
          to: orderData.customerEmail,
          subject: emailContent.subject,
          html: emailContent.html,
          text: emailContent.text,
        });

        if (emailResult.success) {
          logger.info('[API] ✅ Order confirmation email sent successfully!', {
            orderId: validatedData.orderId,
            messageId: emailResult.messageId,
            email: orderData.customerEmail,
          });
          
          // Store email delivery status
          emailDeliveryStatus = {
            sent: true,
            messageId: emailResult.messageId,
            recipient: orderData.customerEmail,
          };
        } else {
          logger.error('[API] ❌ Failed to send confirmation email', new Error(emailResult.error), {
            orderId: validatedData.orderId,
            error: emailResult.error,
            email: orderData.customerEmail,
          });
          
          emailDeliveryStatus = {
            sent: false,
            error: emailResult.error,
            recipient: orderData.customerEmail,
          };
        }
      }
    } catch (emailError) {
      // Don't fail payment if email sending fails
      logger.error('[API] ❌ Exception while sending confirmation email', emailError as Error, {
        orderId: validatedData.orderId,
        errorMessage: emailError instanceof Error ? emailError.message : String(emailError),
        errorStack: emailError instanceof Error ? emailError.stack : undefined,
      });
      
      emailDeliveryStatus = {
        sent: false,
        error: emailError instanceof Error ? emailError.message : String(emailError),
      };
    }
    
    // 8. Return success response
    return NextResponse.json({
      success: true,
      verified: true,
      orderId: validatedData.orderId,
      paymentId: validatedData.razorpayPaymentId,
      status: 'PAID',
      message: 'Payment verified successfully',
      ...(emailDeliveryStatus && { emailDelivery: emailDeliveryStatus }),
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    
    logger.error('[API] Payment verification error', error as Error, {
      identifier,
      duration,
      errorMessage: error instanceof Error ? error.message : String(error),
      errorStack: error instanceof Error ? error.stack : undefined,
    });
    
    // Handle validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          verified: false,
          error: 'Validation failed',
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
        verified: false,
        error: 'Payment verification failed. Please try again or contact support.',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
