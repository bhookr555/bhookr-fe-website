/**
 * Order Repository
 * Handles all order-related database operations
 */

import { db } from '@/lib/firebase/config';
import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs, orderBy, limit as firestoreLimit } from 'firebase/firestore';
import logger from '@/lib/logger';
import type { Order } from '@/types';

export class OrderRepository {
  private readonly collectionName = 'orders';

  /**
   * Create new order
   */
  async create(order: Order): Promise<Order> {
    try {
      const orderRef = doc(db, this.collectionName, order.id);
      await setDoc(orderRef, order);
      logger.info('Order created', { orderId: order.id, userId: order.userId });
      return order;
    } catch (error) {
      logger.error('Failed to create order', error as Error, { orderId: order.id });
      throw error;
    }
  }

  /**
   * Find order by ID
   */
  async findById(orderId: string): Promise<Order | null> {
    try {
      const orderRef = doc(db, this.collectionName, orderId);
      const orderDoc = await getDoc(orderRef);

      if (!orderDoc.exists()) {
        return null;
      }

      return {
        id: orderDoc.id,
        ...orderDoc.data(),
      } as Order;
    } catch (error) {
      logger.error('Failed to fetch order by ID', error as Error, { orderId });
      throw error;
    }
  }

  /**
   * Find orders by user ID
   */
  async findByUserId(userId: string, limitCount = 50): Promise<Order[]> {
    try {
      const ordersRef = collection(db, this.collectionName);
      const q = query(
        ordersRef,
        where('userId', '==', userId),
        orderBy('createdAt', 'desc'),
        firestoreLimit(limitCount)
      );
      
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Order[];
    } catch (error) {
      logger.error('Failed to fetch orders by user', error as Error, { userId });
      throw error;
    }
  }

  /**
   * Update order status
   */
  async updateStatus(orderId: string, status: Order['status']): Promise<void> {
    try {
      const orderRef = doc(db, this.collectionName, orderId);
      await updateDoc(orderRef, {
        status,
        updatedAt: new Date(),
      });
      logger.info('Order status updated', { orderId, status });
    } catch (error) {
      logger.error('Failed to update order status', error as Error, { orderId, status });
      throw error;
    }
  }

  /**
   * Update payment status
   */
  async updatePaymentStatus(orderId: string, paymentStatus: Order['paymentStatus'], paymentId?: string): Promise<void> {
    try {
      const orderRef = doc(db, this.collectionName, orderId);
      const updates: any = {
        paymentStatus,
        updatedAt: new Date(),
      };

      if (paymentId) {
        updates.paymentId = paymentId;
      }

      await updateDoc(orderRef, updates);
      logger.info('Order payment status updated', { orderId, paymentStatus });
    } catch (error) {
      logger.error('Failed to update payment status', error as Error, { orderId, paymentStatus });
      throw error;
    }
  }

  /**
   * Add tracking update
   */
  async addTrackingUpdate(orderId: string, update: { status: string; timestamp: Date; message: string }): Promise<void> {
    try {
      const order = await this.findById(orderId);
      if (!order) {
        throw new Error('Order not found');
      }

      const orderRef = doc(db, this.collectionName, orderId);
      const trackingUpdates = [...(order.trackingUpdates || []), update];

      await updateDoc(orderRef, {
        trackingUpdates,
        updatedAt: new Date(),
      });

      logger.info('Order tracking updated', { orderId });
    } catch (error) {
      logger.error('Failed to add tracking update', error as Error, { orderId });
      throw error;
    }
  }
}

// Singleton instance
export const orderRepository = new OrderRepository();

