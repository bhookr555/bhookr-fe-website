/**
 * Firestore Repository for Payment Orders
 * 
 * This module handles all Firestore operations for payment orders.
 */

import { adminDb } from '@/lib/firebase/admin';
import logger from '@/lib/logger';
import type {
  PaymentOrder,
  PaymentTransaction,
  OrderStatus,
} from '@/types/payment';

const COLLECTIONS = {
  USERS: 'users',
  ORDERS: 'orders',
  PAYMENTS: 'payments',
} as const;

/**
 * Create a new order in Firestore
 */
export async function createOrder(order: PaymentOrder): Promise<void> {
  if (!adminDb) {
    logger.error('[Firestore] Firestore is not initialized. Check Firebase Admin environment variables.', new Error('Firestore not initialized'));
    throw new Error('Firestore is not initialized. Please check Firebase Admin configuration.');
  }
  
  try {
    logger.info('[Firestore] Creating order', {
      orderId: order.orderId,
      userId: order.userId,
      amount: order.amount,
    });
    
    // Convert Date objects to Firestore Timestamp
    const orderData = {
      ...order,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      paidAt: order.paidAt || null,
      expiresAt: order.expiresAt || null,
      razorpayData: order.razorpayData || null,
    };
    
    await adminDb
      .collection(COLLECTIONS.ORDERS)
      .doc(order.orderId)
      .set(orderData);
    
    logger.info('[Firestore] Order created successfully', {
      orderId: order.orderId,
    });
    
  } catch (error) {
    logger.error(
      '[Firestore] Failed to create order',
      error instanceof Error ? error : new Error(String(error)),
      { orderId: order.orderId }
    );
    throw error;
  }
}

/**
 * Get an order by ID
 */
export async function getOrder(orderId: string): Promise<PaymentOrder | null> {
  if (!adminDb) {
    logger.error('[Firestore] Firestore is not initialized. Check Firebase Admin environment variables.', new Error('Firestore not initialized'));
    throw new Error('Firestore is not initialized. Please check Firebase Admin configuration.');
  }
  
  try {
    const doc = await adminDb
      .collection(COLLECTIONS.ORDERS)
      .doc(orderId)
      .get();
    
    if (!doc.exists) {
      logger.warn('[Firestore] Order not found', { orderId });
      return null;
    }
    
    const data = doc.data();
    
    // Convert Firestore Timestamp to Date
    return {
      ...data,
      createdAt: data?.createdAt?.toDate() || new Date(),
      updatedAt: data?.updatedAt?.toDate() || new Date(),
      paidAt: data?.paidAt?.toDate() || undefined,
      expiresAt: data?.expiresAt?.toDate() || undefined,
      razorpayData: data?.razorpayData || undefined,
    } as PaymentOrder;
    
  } catch (error) {
    logger.error(
      '[Firestore] Failed to get order',
      error instanceof Error ? error : new Error(String(error)),
      { orderId }
    );
    throw error;
  }
}

/**
 * Update order status
 */
export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus,
  additionalData?: {
    paidAt?: Date;
    razorpayData?: {
      orderId?: string;
      paymentId?: string;
      method?: string;
    };
  }
): Promise<void> {
  if (!adminDb) {
    logger.error('[Firestore] Firestore is not initialized. Check Firebase Admin environment variables.', new Error('Firestore not initialized'));
    throw new Error('Firestore is not initialized. Please check Firebase Admin configuration.');
  }
  
  try {
    logger.info('[Firestore] Updating order status', {
      orderId,
      status,
      razorpayPaymentId: additionalData?.razorpayData?.paymentId,
    });
    
    const updateData: any = {
      status,
      updatedAt: new Date(),
    };
    
    if (additionalData?.razorpayData) {
      updateData.razorpayData = additionalData.razorpayData;
    }
    
    if (additionalData?.paidAt) {
      updateData.paidAt = additionalData.paidAt;
    }
    
    await adminDb
      .collection(COLLECTIONS.ORDERS)
      .doc(orderId)
      .update(updateData);
    
    logger.info('[Firestore] Order status updated', { orderId, status });
    
  } catch (error) {
    logger.error(
      '[Firestore] Failed to update order status',
      error instanceof Error ? error : new Error(String(error)),
      { orderId, status }
    );
    throw error;
  }
}

/**
 * Get orders by user ID
 */
export async function getOrdersByUserId(
  userId: string,
  limit: number = 10
): Promise<PaymentOrder[]> {
  if (!adminDb) {
    logger.error('[Firestore] Firestore is not initialized. Check Firebase Admin environment variables.', new Error('Firestore not initialized'));
    throw new Error('Firestore is not initialized. Please check Firebase Admin configuration.');
  }
  
  try {
    const snapshot = await adminDb
      .collection(COLLECTIONS.ORDERS)
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();
    
    const orders: PaymentOrder[] = [];
    
    snapshot.forEach((doc) => {
      const data = doc.data();
      orders.push({
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
        paidAt: data.paidAt?.toDate() || undefined,
        expiresAt: data.expiresAt?.toDate() || undefined,
        razorpayData: data.razorpayData || undefined,
      } as PaymentOrder);
    });
    
    return orders;
    
  } catch (error) {
    logger.error(
      '[Firestore] Failed to get orders by user',
      error instanceof Error ? error : new Error(String(error)),
      { userId }
    );
    throw error;
  }
}

/**
 * Create a payment transaction record
 */
export async function createPaymentTransaction(
  transaction: PaymentTransaction
): Promise<void> {
  if (!adminDb) {
    logger.error('[Firestore] Firestore is not initialized. Check Firebase Admin environment variables.', new Error('Firestore not initialized'));
    throw new Error('Firestore is not initialized. Please check Firebase Admin configuration.');
  }
  
  try {
    logger.info('[Firestore] Creating payment transaction', {
      paymentId: transaction.paymentId,
      orderId: transaction.orderId,
      amount: transaction.amount,
    });
    
    const transactionData = {
      ...transaction,
      createdAt: transaction.createdAt,
      updatedAt: transaction.updatedAt,
      verifiedAt: transaction.verifiedAt || null,
    };
    
    await adminDb
      .collection(COLLECTIONS.PAYMENTS)
      .doc(transaction.paymentId)
      .set(transactionData);
    
    logger.info('[Firestore] Payment transaction created', {
      paymentId: transaction.paymentId,
    });
    
  } catch (error) {
    logger.error(
      '[Firestore] Failed to create payment transaction',
      error instanceof Error ? error : new Error(String(error)),
      { paymentId: transaction.paymentId }
    );
    throw error;
  }
}

/**
 * Get payment transaction by order ID
 */
export async function getPaymentByOrderId(
  orderId: string
): Promise<PaymentTransaction | null> {
  if (!adminDb) {
    throw new Error('Firestore is not initialized');
  }
  
  try {
    const snapshot = await adminDb
      .collection(COLLECTIONS.PAYMENTS)
      .where('orderId', '==', orderId)
      .limit(1)
      .get();
    
    if (snapshot.empty) {
      return null;
    }
    
    const doc = snapshot.docs[0];
    if (!doc) {
      return null;
    }
    
    const data = doc.data();
    
    return {
      ...data,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
      verifiedAt: data.verifiedAt?.toDate() || undefined,
    } as PaymentTransaction;
    
  } catch (error) {
    logger.error(
      '[Firestore] Failed to get payment by order ID',
      error instanceof Error ? error : new Error(String(error)),
      { orderId }
    );
    throw error;
  }
}

/**
 * Check if order exists and is still valid
 */
export async function isOrderValid(orderId: string): Promise<boolean> {
  const order = await getOrder(orderId);
  
  if (!order) {
    return false;
  }
  
  // Check if order is expired
  if (order.expiresAt && order.expiresAt < new Date()) {
    logger.info('[Firestore] Order has expired', {
      orderId,
      expiresAt: order.expiresAt,
    });
    
    // Update status to EXPIRED
    await updateOrderStatus(orderId, 'EXPIRED');
    return false;
  }
  
  // Order is valid if it's PENDING or PAID
  return ['PENDING', 'PAID'].includes(order.status);
}

/**
 * Mark expired orders (background job)
 * This can be called periodically to clean up expired orders
 */
export async function markExpiredOrders(): Promise<number> {
  if (!adminDb) {
    throw new Error('Firestore is not initialized');
  }
  
  try {
    const now = new Date();
    
    const snapshot = await adminDb
      .collection(COLLECTIONS.ORDERS)
      .where('status', '==', 'PENDING')
      .where('expiresAt', '<', now)
      .limit(100)
      .get();
    
    const batch = adminDb.batch();
    let count = 0;
    
    snapshot.forEach((doc) => {
      batch.update(doc.ref, {
        status: 'EXPIRED',
        updatedAt: now,
      });
      count++;
    });
    
    await batch.commit();
    
    logger.info('[Firestore] Marked expired orders', { count });
    return count;
    
  } catch (error) {
    logger.error(
      '[Firestore] Failed to mark expired orders',
      error instanceof Error ? error : new Error(String(error))
    );
    throw error;
  }
}
