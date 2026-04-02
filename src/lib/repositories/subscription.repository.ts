/**
 * Subscription Repository
 * Handles all subscription-related database operations
 */

import { db } from '@/lib/firebase/config';
import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import logger from '@/lib/logger';
import type { Subscription } from '@/types';

export class SubscriptionRepository {
  private readonly collectionName = 'subscriptions';

  /**
   * Create new subscription
   */
  async create(subscription: Subscription): Promise<Subscription> {
    try {
      const subRef = doc(db, this.collectionName, subscription.id);
      await setDoc(subRef, subscription);
      logger.info('Subscription created', { subscriptionId: subscription.id, userId: subscription.userId });
      return subscription;
    } catch (error) {
      logger.error('Failed to create subscription', error as Error, { subscriptionId: subscription.id });
      throw error;
    }
  }

  /**
   * Find subscription by ID
   */
  async findById(subscriptionId: string): Promise<Subscription | null> {
    try {
      const subRef = doc(db, this.collectionName, subscriptionId);
      const subDoc = await getDoc(subRef);

      if (!subDoc.exists()) {
        return null;
      }

      return {
        id: subDoc.id,
        ...subDoc.data(),
      } as Subscription;
    } catch (error) {
      logger.error('Failed to fetch subscription by ID', error as Error, { subscriptionId });
      throw error;
    }
  }

  /**
   * Find active subscriptions by user ID
   */
  async findActiveByUserId(userId: string): Promise<Subscription[]> {
    try {
      const subsRef = collection(db, this.collectionName);
      const q = query(
        subsRef,
        where('userId', '==', userId),
        where('status', '==', 'active'),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Subscription[];
    } catch (error) {
      logger.error('Failed to fetch active subscriptions', error as Error, { userId });
      throw error;
    }
  }

  /**
   * Find all subscriptions by user ID
   */
  async findByUserId(userId: string): Promise<Subscription[]> {
    try {
      const subsRef = collection(db, this.collectionName);
      const q = query(
        subsRef,
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Subscription[];
    } catch (error) {
      logger.error('Failed to fetch subscriptions by user', error as Error, { userId });
      throw error;
    }
  }

  /**
   * Update subscription status
   */
  async updateStatus(subscriptionId: string, status: Subscription['status']): Promise<void> {
    try {
      const subRef = doc(db, this.collectionName, subscriptionId);
      await updateDoc(subRef, {
        status,
        updatedAt: new Date(),
      });
      logger.info('Subscription status updated', { subscriptionId, status });
    } catch (error) {
      logger.error('Failed to update subscription status', error as Error, { subscriptionId, status });
      throw error;
    }
  }

  /**
   * Cancel subscription
   */
  async cancel(subscriptionId: string): Promise<void> {
    try {
      const subRef = doc(db, this.collectionName, subscriptionId);
      await updateDoc(subRef, {
        status: 'cancelled',
        endDate: new Date(),
        updatedAt: new Date(),
      });
      logger.info('Subscription cancelled', { subscriptionId });
    } catch (error) {
      logger.error('Failed to cancel subscription', error as Error, { subscriptionId });
      throw error;
    }
  }

  /**
   * Pause subscription
   */
  async pause(subscriptionId: string): Promise<void> {
    await this.updateStatus(subscriptionId, 'paused');
  }

  /**
   * Resume subscription
   */
  async resume(subscriptionId: string): Promise<void> {
    await this.updateStatus(subscriptionId, 'active');
  }

  /**
   * Update next billing date
   */
  async updateNextBillingDate(subscriptionId: string, nextBillingDate: Date): Promise<void> {
    try {
      const subRef = doc(db, this.collectionName, subscriptionId);
      await updateDoc(subRef, {
        nextBillingDate,
        updatedAt: new Date(),
      });
      logger.info('Subscription billing date updated', { subscriptionId });
    } catch (error) {
      logger.error('Failed to update billing date', error as Error, { subscriptionId });
      throw error;
    }
  }
}

// Singleton instance
export const subscriptionRepository = new SubscriptionRepository();

