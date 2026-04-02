/**
 * Idempotency Service
 * 
 * Prevents duplicate operations by caching request results.
 * Essential for payment operations to prevent double charges.
 * 
 * Uses Firestore for persistence (can be replaced with Redis for better performance).
 */

import { adminDb } from '@/lib/firebase/admin';
import logger from '@/lib/logger';

export interface IdempotencyKey {
  key: string;
  result: any;
  status: 'processing' | 'completed' | 'failed';
  createdAt: Date | FirebaseFirestore.Timestamp;
  expiresAt: Date | FirebaseFirestore.Timestamp;
  metadata?: Record<string, any>;
}

const IDEMPOTENCY_COLLECTION = 'idempotency_keys';
const DEFAULT_TTL_HOURS = 24; // Keep idempotency keys for 24 hours

/**
 * Generate idempotency key from request parameters
 */
export function generateIdempotencyKey(
  operation: string,
  params: Record<string, any>
): string {
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${key}:${params[key]}`)
    .join('|');
  
  return `${operation}:${sortedParams}`;
}

/**
 * Check if operation has been processed before
 */
export async function checkIdempotency(
  key: string
): Promise<{ exists: boolean; result?: any; status?: string; isStale?: boolean }> {
  if (!adminDb) {
    logger.warn('[Idempotency] Firestore not initialized, skipping check');
    return { exists: false };
  }
  
  try {
    // Add timeout to prevent hanging (5 seconds)
    const timeoutPromise = new Promise<null>((_, reject) => 
      setTimeout(() => reject(new Error('Idempotency check timeout')), 5000)
    );
    
    const docPromise = adminDb
      .collection(IDEMPOTENCY_COLLECTION)
      .doc(key)
      .get();
    
    const doc = await Promise.race([docPromise, timeoutPromise]) as FirebaseFirestore.DocumentSnapshot;
    
    if (!doc || !doc.exists) {
      return { exists: false };
    }
    
    const data = doc.data() as IdempotencyKey;
    
    // Check if expired
    const now = new Date();
    const expiresAt = data.expiresAt instanceof Date 
      ? data.expiresAt 
      : data.expiresAt.toDate();
    
    if (expiresAt < now) {
      // Expired, treat as not exists
      logger.info('[Idempotency] Key expired, treating as new request', { key });
      await doc.ref.delete().catch(() => {}); // Don't block on delete failure
      return { exists: false };
    }
    
    // Check if processing state is stale (older than 2 minutes)
    const createdAt = data.createdAt instanceof Date 
      ? data.createdAt 
      : (data.createdAt as any).toDate?.() || new Date();
    const ageMinutes = (now.getTime() - createdAt.getTime()) / (1000 * 60);
    const isStale = data.status === 'processing' && ageMinutes > 2;
    
    if (isStale) {
      logger.warn('[Idempotency] Found stale processing state', {
        key,
        ageMinutes: ageMinutes.toFixed(2),
      });
    } else {
      logger.info('[Idempotency] Found existing operation', {
        key,
        status: data.status,
        ageMinutes: ageMinutes.toFixed(2),
      });
    }
    
    return {
      exists: true,
      result: data.result,
      status: data.status,
      isStale,
    };
  } catch (error) {
    logger.error('[Idempotency] Failed to check idempotency', error as Error, { key });
    // On error, allow operation to proceed
    return { exists: false };
  }
}

/**
 * Store operation result with idempotency key
 */
export async function storeIdempotentResult(
  key: string,
  result: any,
  status: 'completed' | 'failed',
  metadata?: Record<string, any>
): Promise<void> {
  if (!adminDb) {
    logger.warn('[Idempotency] Firestore not initialized, skipping store');
    return;
  }
  
  try {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + DEFAULT_TTL_HOURS * 60 * 60 * 1000);
    
    const idempotencyData: IdempotencyKey = {
      key,
      result,
      status,
      createdAt: now,
      expiresAt,
      metadata,
    };
    
    await adminDb
      .collection(IDEMPOTENCY_COLLECTION)
      .doc(key)
      .set(idempotencyData);
    
    logger.info('[Idempotency] Stored result', {
      key,
      status,
      expiresAt,
    });
  } catch (error) {
    logger.error('[Idempotency] Failed to store result', error as Error, { key });
    // Don't throw - this is not critical
  }
}

/**
 * Mark operation as processing (to prevent concurrent requests)
 */
export async function markAsProcessing(
  key: string,
  metadata?: Record<string, any>
): Promise<boolean> {
  if (!adminDb) {
    return true; // Allow operation if Firestore not available
  }
  
  try {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + DEFAULT_TTL_HOURS * 60 * 60 * 1000);
    
    const docRef = adminDb.collection(IDEMPOTENCY_COLLECTION).doc(key);
    const doc = await docRef.get();
    
    if (doc.exists) {
      const data = doc.data() as IdempotencyKey;
      
      // Check if already processing
      if (data.status === 'processing') {
        // Check if stale (older than 2 minutes)
        const createdAt = data.createdAt instanceof Date 
          ? data.createdAt 
          : (data.createdAt as any).toDate?.() || new Date();
        const ageMinutes = (now.getTime() - createdAt.getTime()) / (1000 * 60);
        
        if (ageMinutes > 2) {
          logger.warn('[Idempotency] Overwriting stale processing state', { 
            key, 
            ageMinutes: ageMinutes.toFixed(2)
          });
          // Allow overwrite
        } else {
          logger.warn('[Idempotency] Operation already in progress', { 
            key,
            ageMinutes: ageMinutes.toFixed(2)
          });
          return false; // Recent processing, don't allow
        }
      }
    }
    
    // Mark as processing (overwrite if stale)
    await docRef.set({
      key,
      result: null,
      status: 'processing',
      createdAt: now,
      expiresAt,
      metadata,
    });
    
    logger.info('[Idempotency] Marked as processing', { key });
    return true;
  } catch (error) {
    logger.error('[Idempotency] Failed to mark as processing', error as Error, { key });
    return true; // Allow operation on error
  }
}

/**
 * Cleanup expired idempotency keys (run as cron job)
 */
export async function cleanupExpiredKeys(): Promise<number> {
  if (!adminDb) {
    return 0;
  }
  
  try {
    const now = new Date();
    
    const snapshot = await adminDb
      .collection(IDEMPOTENCY_COLLECTION)
      .where('expiresAt', '<', now)
      .limit(100) // Process in batches
      .get();
    
    if (snapshot.empty) {
      return 0;
    }
    
    const batch = adminDb.batch();
    snapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    await batch.commit();
    
    logger.info('[Idempotency] Cleaned up expired keys', {
      count: snapshot.size,
    });
    
    return snapshot.size;
  } catch (error) {
    logger.error('[Idempotency] Failed to cleanup expired keys', error as Error);
    return 0;
  }
}

/**
 * Wrapper function to execute operation with idempotency protection
 */
export async function withIdempotency<T>(
  key: string,
  operation: () => Promise<T>,
  metadata?: Record<string, any>
): Promise<T> {
  // Check if already processed
  const check = await checkIdempotency(key);
  
  if (check.exists) {
    if (check.status === 'completed') {
      logger.info('[Idempotency] Returning cached result', { key });
      return check.result as T;
    } else if (check.status === 'processing') {
      // If stale (>2 minutes old), allow to proceed
      if (check.isStale) {
        logger.warn('[Idempotency] Stale processing state detected, proceeding with operation', { key });
        // Continue to execute operation
      } else {
        // Recent processing state, return error
        logger.warn('[Idempotency] Operation already in progress', { key });
        throw new Error('Operation already in progress. Please wait a moment and try again.');
      }
    } else if (check.status === 'failed') {
      logger.warn('[Idempotency] Previous attempt failed, allowing retry', { key });
      // Allow retry for failed operations
    }
  }
  
  // Mark as processing (with timeout)
  let canProceed = false;
  try {
    const timeoutPromise = new Promise<boolean>((_, reject) => 
      setTimeout(() => reject(new Error('Mark processing timeout')), 3000)
    );
    const markPromise = markAsProcessing(key, metadata);
    canProceed = await Promise.race([markPromise, timeoutPromise]);
  } catch (error) {
    logger.warn('[Idempotency] Failed to mark as processing, proceeding anyway', { 
      key, 
      error: error instanceof Error ? error.message : 'Unknown' 
    });
    canProceed = true; // Proceed on timeout/error
  }
  
  if (!canProceed && !check.isStale) {
    throw new Error('Operation already in progress. Please wait a moment and try again.');
  }
  
  try {
    // Execute operation
    logger.info('[Idempotency] Executing operation', { key });
    const result = await operation();
    
    // Store successful result
    await storeIdempotentResult(key, result, 'completed', metadata).catch(err => {
      logger.error('[Idempotency] Failed to store result, but operation succeeded', err);
    });
    
    return result;
  } catch (error) {
    // Store failed result
    await storeIdempotentResult(
      key,
      { error: error instanceof Error ? error.message : 'Unknown error' },
      'failed',
      metadata
    ).catch(err => {
      logger.error('[Idempotency] Failed to store error result', err);
    });
    
    throw error;
  }
}
