/**
 * User Repository
 * Handles all user-related database operations
 */

import { db } from '@/lib/firebase/config';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, collection, query, where, getDocs } from 'firebase/firestore';
import logger from '@/lib/logger';
import type { User } from '@/types';

export class UserRepository {
  private readonly collectionName = 'users';

  /**
   * Find user by ID
   */
  async findById(userId: string): Promise<User | null> {
    try {
      const userRef = doc(db, this.collectionName, userId);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        return null;
      }

      return {
        id: userDoc.id,
        ...userDoc.data(),
      } as User;
    } catch (error) {
      logger.error('Failed to fetch user by ID', error as Error, { userId });
      throw error;
    }
  }

  /**
   * Find user by email
   */
  async findByEmail(email: string): Promise<User | null> {
    try {
      const usersRef = collection(db, this.collectionName);
      const q = query(usersRef, where('email', '==', email));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        return null;
      }

      const userDoc = querySnapshot.docs[0];
      if (!userDoc) {
        return null;
      }

      return {
        id: userDoc.id,
        ...userDoc.data(),
      } as User;
    } catch (error) {
      logger.error('Failed to fetch user by email', error as Error, { email });
      throw error;
    }
  }

  /**
   * Create new user
   */
  async create(userId: string, userData: Omit<User, 'id'>): Promise<User> {
    try {
      const userRef = doc(db, this.collectionName, userId);
      const now = new Date();

      const user: Omit<User, 'id'> = {
        ...userData,
        createdAt: now,
        updatedAt: now,
      };

      await setDoc(userRef, user);
      logger.info('User created', { userId, email: userData.email });

      return {
        id: userId,
        ...user,
      };
    } catch (error) {
      logger.error('Failed to create user', error as Error, { userId });
      throw error;
    }
  }

  /**
   * Update existing user
   */
  async update(userId: string, updates: Partial<Omit<User, 'id' | 'createdAt'>>): Promise<void> {
    try {
      const userRef = doc(db, this.collectionName, userId);
      
      await updateDoc(userRef, {
        ...updates,
        updatedAt: new Date(),
      });

      logger.info('User updated', { userId });
    } catch (error) {
      logger.error('Failed to update user', error as Error, { userId });
      throw error;
    }
  }

  /**
   * Create or update user (upsert)
   */
  async createOrUpdate(userId: string, userData: Partial<Omit<User, 'id'>>): Promise<void> {
    try {
      const userRef = doc(db, this.collectionName, userId);
      const userDoc = await getDoc(userRef);

      if (userDoc.exists()) {
        // Update existing user
        await updateDoc(userRef, {
          ...userData,
          updatedAt: new Date(),
        });
        logger.info('User updated via upsert', { userId });
      } else {
        // Create new user
        await setDoc(userRef, {
          ...userData,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        logger.info('User created via upsert', { userId });
      }
    } catch (error) {
      logger.error('Failed to upsert user', error as Error, { userId });
      throw error;
    }
  }

  /**
   * Delete user
   */
  async delete(userId: string): Promise<void> {
    try {
      const userRef = doc(db, this.collectionName, userId);
      await deleteDoc(userRef);
      logger.info('User deleted', { userId });
    } catch (error) {
      logger.error('Failed to delete user', error as Error, { userId });
      throw error;
    }
  }

  /**
   * Update last login timestamp
   */
  async updateLastLogin(userId: string): Promise<void> {
    try {
      const userRef = doc(db, this.collectionName, userId);
      await updateDoc(userRef, {
        lastLogin: new Date(),
        updatedAt: new Date(),
      });
      logger.debug('User last login updated', { userId });
    } catch (error) {
      logger.error('Failed to update last login', error as Error, { userId });
      throw error;
    }
  }

  /**
   * Check if user exists
   */
  async exists(userId: string): Promise<boolean> {
    try {
      const userRef = doc(db, this.collectionName, userId);
      const userDoc = await getDoc(userRef);
      return userDoc.exists();
    } catch (error) {
      logger.error('Failed to check user existence', error as Error, { userId });
      return false;
    }
  }
}

// Singleton instance
export const userRepository = new UserRepository();

