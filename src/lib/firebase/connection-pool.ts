/**
 * Firebase Connection Pool Manager
 * Manages Firebase Admin SDK connections and implements connection pooling
 */

import { adminDb } from './admin';
import logger from '@/lib/logger';

interface PoolConfig {
  maxConnections: number;
  minConnections: number;
  connectionTimeout: number;
  idleTimeout: number;
}

interface ConnectionStats {
  activeConnections: number;
  idleConnections: number;
  totalRequests: number;
  failedRequests: number;
  averageResponseTime: number;
}

class FirebaseConnectionPool {
  private config: PoolConfig;
  private stats: ConnectionStats;
  private requestQueue: Array<() => Promise<any>> = [];
  private isProcessing = false;

  constructor(config?: Partial<PoolConfig>) {
    this.config = {
      maxConnections: 10,
      minConnections: 2,
      connectionTimeout: 30000, // 30 seconds
      idleTimeout: 60000, // 1 minute
      ...config,
    };

    this.stats = {
      activeConnections: 0,
      idleConnections: 0,
      totalRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
    };

    logger.info('[Firebase Pool] Initialized', {
      maxConnections: this.config.maxConnections,
      minConnections: this.config.minConnections,
    });
  }

  /**
   * Execute a database operation with connection management
   */
  async execute<T>(
    operation: () => Promise<T>,
    operationName: string = 'unknown'
  ): Promise<T> {
    const startTime = Date.now();
    this.stats.totalRequests++;

    try {
      // Check if Firebase Admin is initialized
      if (!adminDb) {
        throw new Error('Firebase Admin not initialized');
      }

      logger.debug(`[Firebase Pool] Executing: ${operationName}`);

      // Execute the operation with timeout
      const result = await this.executeWithTimeout(
        operation(),
        this.config.connectionTimeout
      );

      // Update stats
      const duration = Date.now() - startTime;
      this.updateResponseTime(duration);

      logger.debug(`[Firebase Pool] Completed: ${operationName} (${duration}ms)`);

      return result;
    } catch (error) {
      this.stats.failedRequests++;
      
      logger.error(
        `[Firebase Pool] Failed: ${operationName}`,
        error instanceof Error ? error : new Error(String(error)),
        {
          duration: Date.now() - startTime,
          totalRequests: this.stats.totalRequests,
          failedRequests: this.stats.failedRequests,
        }
      );

      throw error;
    }
  }

  /**
   * Execute operation with timeout
   */
  private executeWithTimeout<T>(
    promise: Promise<T>,
    timeout: number
  ): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(
          () => reject(new Error(`Operation timeout after ${timeout}ms`)),
          timeout
        )
      ),
    ]);
  }

  /**
   * Update average response time
   */
  private updateResponseTime(duration: number): void {
    const { totalRequests, averageResponseTime } = this.stats;
    
    // Calculate rolling average
    this.stats.averageResponseTime =
      (averageResponseTime * (totalRequests - 1) + duration) / totalRequests;
  }

  /**
   * Get current pool statistics
   */
  getStats(): ConnectionStats {
    return { ...this.stats };
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    details: {
      firebaseAdmin: boolean;
      avgResponseTime: number;
      failureRate: number;
    };
  }> {
    const failureRate = this.stats.totalRequests > 0
      ? this.stats.failedRequests / this.stats.totalRequests
      : 0;

    const healthy = !!(adminDb && failureRate < 0.1); // Less than 10% failure rate

    return {
      healthy,
      details: {
        firebaseAdmin: !!adminDb,
        avgResponseTime: Math.round(this.stats.averageResponseTime),
        failureRate: Math.round(failureRate * 100) / 100,
      },
    };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      activeConnections: 0,
      idleConnections: 0,
      totalRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
    };

    logger.info('[Firebase Pool] Statistics reset');
  }
}

// Singleton instance
const pool = new FirebaseConnectionPool();

/**
 * Execute a Firestore operation with connection pooling
 */
export async function withConnection<T>(
  operation: () => Promise<T>,
  operationName?: string
): Promise<T> {
  return pool.execute(operation, operationName);
}

/**
 * Get pool statistics
 */
export function getPoolStats(): ConnectionStats {
  return pool.getStats();
}

/**
 * Perform health check
 */
export async function checkHealth() {
  return pool.healthCheck();
}

/**
 * Reset pool statistics
 */
export function resetPoolStats(): void {
  pool.resetStats();
}

/**
 * Batch operation helper
 * Executes multiple operations efficiently
 */
export async function batchOperations<T>(
  operations: Array<() => Promise<T>>,
  concurrency: number = 5
): Promise<T[]> {
  const results: T[] = [];
  const errors: Error[] = [];

  logger.debug(`[Firebase Pool] Starting batch: ${operations.length} operations, concurrency: ${concurrency}`);

  // Process operations in batches
  for (let i = 0; i < operations.length; i += concurrency) {
    const batch = operations.slice(i, i + concurrency);
    
    const batchResults = await Promise.allSettled(
      batch.map(op => withConnection(op, 'batch-operation'))
    );

    batchResults.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      } else {
        errors.push(result.reason);
        logger.warn(`[Firebase Pool] Batch operation ${i + index} failed`, {
          error: result.reason?.message,
        });
      }
    });
  }

  if (errors.length > 0) {
    logger.warn(`[Firebase Pool] Batch completed with ${errors.length} errors`);
  } else {
    logger.debug('[Firebase Pool] Batch completed successfully');
  }

  return results;
}

/**
 * Transaction helper with retry logic
 */
export async function withTransaction<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await withConnection(operation, 'transaction');
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Don't retry on certain errors
      if (lastError.message.includes('permission') || 
          lastError.message.includes('not found')) {
        throw lastError;
      }

      // Wait before retry (exponential backoff)
      if (attempt < maxRetries - 1) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
        logger.debug(`[Firebase Pool] Transaction retry ${attempt + 1}/${maxRetries} in ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error('Transaction failed after retries');
}

export default pool;

