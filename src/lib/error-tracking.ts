/**
 * Enhanced Error Handling System
 * 
 * Comprehensive error tracking, categorization, and alerting without Sentry.
 * Stores critical errors in Firestore for admin review.
 */

import logger from '@/lib/logger';
import { adminDb } from '@/lib/firebase/admin';

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';
export type ErrorCategory = 
  | 'payment' 
  | 'subscription' 
  | 'email' 
  | 'database' 
  | 'external_api' 
  | 'validation' 
  | 'authentication'
  | 'system';

export interface AppError {
  id: string;
  severity: ErrorSeverity;
  category: ErrorCategory;
  message: string;
  stack?: string;
  context?: Record<string, any>;
  userId?: string;
  orderId?: string;
  timestamp: Date;
  resolved: boolean;
  resolvedAt?: Date;
  resolvedBy?: string;
  notes?: string;
}

const ERRORS_COLLECTION = 'app_errors';
const CRITICAL_ERROR_THRESHOLD = 10; // Alert after 10 errors/hour

/**
 * Track error occurrence
 */
export async function trackError(
  error: Error,
  severity: ErrorSeverity,
  category: ErrorCategory,
  context?: Record<string, any>
): Promise<string | null> {
  const errorId = `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    // Log to console/file
    logger.error(`[${category.toUpperCase()}] ${error.message}`, error, context);
    
    // Store critical and high severity errors in Firestore
    if ((severity === 'critical' || severity === 'high') && adminDb) {
      const appError: AppError = {
        id: errorId,
        severity,
        category,
        message: error.message,
        stack: error.stack,
        context,
        userId: context?.userId,
        orderId: context?.orderId,
        timestamp: new Date(),
        resolved: false,
      };
      
      await adminDb
        .collection(ERRORS_COLLECTION)
        .doc(errorId)
        .set(appError);
      
      logger.info('[Error Tracker] Error stored in Firestore', {
        errorId,
        severity,
        category,
      });
      
      // Check if we need to send alerts
      await checkErrorThreshold(category, severity);
    }
    
    return errorId;
  } catch (trackingError) {
    // Don't let error tracking fail the application
    logger.error('[Error Tracker] Failed to track error', trackingError as Error);
    return null;
  }
}

/**
 * Check error threshold and send alerts if needed
 */
async function checkErrorThreshold(
  category: ErrorCategory,
  severity: ErrorSeverity
): Promise<void> {
  if (!adminDb) return;
  
  try {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    const snapshot = await adminDb
      .collection(ERRORS_COLLECTION)
      .where('category', '==', category)
      .where('severity', '==', severity)
      .where('timestamp', '>=', oneHourAgo)
      .where('resolved', '==', false)
      .get();
    
    if (snapshot.size >= CRITICAL_ERROR_THRESHOLD) {
      logger.security('[Error Tracker] ALERT: Error threshold exceeded', {
        category,
        severity,
        count: snapshot.size,
        threshold: CRITICAL_ERROR_THRESHOLD,
      });
      
      // Send admin alert
      const { sendAdminAlert } = await import('@/lib/notifications/admin-alerts');
      await sendAdminAlert({
        type: 'ORDER_ISSUE',
        severity: 'CRITICAL',
        title: `High Error Rate: ${category}`,
        message: `${snapshot.size} ${severity} errors in ${category} category within the last hour`,
        timestamp: new Date(),
        metadata: {
          category,
          severity,
          count: snapshot.size,
        },
      });
    }
  } catch (error) {
    logger.error('[Error Tracker] Failed to check error threshold', error as Error);
  }
}

/**
 * Get recent unresolved errors for admin dashboard
 */
export async function getUnresolvedErrors(
  limit: number = 50
): Promise<AppError[]> {
  if (!adminDb) return [];
  
  try {
    const snapshot = await adminDb
      .collection(ERRORS_COLLECTION)
      .where('resolved', '==', false)
      .orderBy('timestamp', 'desc')
      .limit(limit)
      .get();
    
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        timestamp: data.timestamp?.toDate() || new Date(),
      } as AppError;
    });
  } catch (error) {
    logger.error('[Error Tracker] Failed to get unresolved errors', error as Error);
    return [];
  }
}

/**
 * Mark error as resolved
 */
export async function resolveError(
  errorId: string,
  resolvedBy: string,
  notes?: string
): Promise<void> {
  if (!adminDb) return;
  
  try {
    await adminDb
      .collection(ERRORS_COLLECTION)
      .doc(errorId)
      .update({
        resolved: true,
        resolvedAt: new Date(),
        resolvedBy,
        notes,
      });
    
    logger.info('[Error Tracker] Error marked as resolved', {
      errorId,
      resolvedBy,
    });
  } catch (error) {
    logger.error('[Error Tracker] Failed to resolve error', error as Error, {
      errorId,
    });
  }
}

/**
 * Retry wrapper with error tracking
 */
export async function retryWithErrorTracking<T>(
  operation: () => Promise<T>,
  options: {
    maxRetries?: number;
    retryDelay?: number;
    category: ErrorCategory;
    severity: ErrorSeverity;
    context?: Record<string, any>;
    onRetry?: (attempt: number, error: Error) => void;
  }
): Promise<T> {
  const { maxRetries = 3, retryDelay = 1000, category, severity, context, onRetry } = options;
  
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      if (onRetry) {
        onRetry(attempt + 1, lastError);
      }
      
      logger.warn(`[Retry] Attempt ${attempt + 1}/${maxRetries} failed`, {
        category,
        error: lastError.message,
        context,
      });
      
      // Wait before retry (exponential backoff)
      if (attempt < maxRetries - 1) {
        const delay = retryDelay * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  // All retries failed - track the error
  if (lastError) {
    await trackError(lastError, severity, category, {
      ...context,
      retriesAttempted: maxRetries,
    });
  }
  
  throw lastError;
}

/**
 * Create structured error for consistent error handling
 */
export class StructuredError extends Error {
  constructor(
    message: string,
    public category: ErrorCategory,
    public severity: ErrorSeverity,
    public context?: Record<string, any>,
    public userMessage?: string // User-friendly message
  ) {
    super(message);
    this.name = 'StructuredError';
  }
  
  async track(): Promise<string | null> {
    return trackError(this, this.severity, this.category, this.context);
  }
}

/**
 * Error factory functions
 */
export const ErrorFactory = {
  payment: (message: string, context?: Record<string, any>, userMessage?: string) =>
    new StructuredError(message, 'payment', 'critical', context, userMessage),
  
  subscription: (message: string, context?: Record<string, any>, userMessage?: string) =>
    new StructuredError(message, 'subscription', 'high', context, userMessage),
  
  email: (message: string, context?: Record<string, any>) =>
    new StructuredError(message, 'email', 'medium', context),
  
  database: (message: string, context?: Record<string, any>) =>
    new StructuredError(message, 'database', 'high', context),
  
  externalApi: (message: string, context?: Record<string, any>) =>
    new StructuredError(message, 'external_api', 'medium', context),
  
  validation: (message: string, context?: Record<string, any>, userMessage?: string) =>
    new StructuredError(message, 'validation', 'low', context, userMessage),
};
