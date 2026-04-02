/**
 * API Rate Limiting Utility
 * Implements in-memory rate limiting for API routes
 * For production, consider using Redis-based rate limiting (Upstash, Vercel KV, etc.)
 */

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

class RateLimiter {
  private records: Map<string, RateLimitRecord> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Cleanup expired records every 5 minutes
    if (typeof window === 'undefined') {
      this.cleanupInterval = setInterval(() => this.cleanup(), 5 * 60 * 1000);
    }
  }

  /**
   * Check if a request should be rate limited
   * @param identifier - Unique identifier (IP, user ID, API key, etc.)
   * @param limit - Maximum number of requests allowed in the window
   * @param windowMs - Time window in milliseconds
   * @returns Object with success flag and remaining requests
   */
  check(
    identifier: string,
    limit: number = 100,
    windowMs: number = 60 * 1000 // 1 minute default
  ): {
    success: boolean;
    limit: number;
    remaining: number;
    reset: number;
  } {
    const now = Date.now();
    const record = this.records.get(identifier);

    // No record or expired record
    if (!record || now > record.resetAt) {
      const resetAt = now + windowMs;
      this.records.set(identifier, {
        count: 1,
        resetAt,
      });

      return {
        success: true,
        limit,
        remaining: limit - 1,
        reset: resetAt,
      };
    }

    // Check if limit exceeded
    if (record.count >= limit) {
      return {
        success: false,
        limit,
        remaining: 0,
        reset: record.resetAt,
      };
    }

    // Increment count
    record.count++;
    this.records.set(identifier, record);

    return {
      success: true,
      limit,
      remaining: limit - record.count,
      reset: record.resetAt,
    };
  }

  /**
   * Reset rate limit for an identifier
   */
  reset(identifier: string): void {
    this.records.delete(identifier);
  }

  /**
   * Cleanup expired records
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, record] of this.records.entries()) {
      if (now > record.resetAt) {
        this.records.delete(key);
      }
    }
  }

  /**
   * Clear all records (useful for testing)
   */
  clear(): void {
    this.records.clear();
  }

  /**
   * Get current stats
   */
  getStats(): { totalRecords: number } {
    return {
      totalRecords: this.records.size,
    };
  }

  /**
   * Cleanup interval on destroy
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}

// Singleton instance
const rateLimiter = new RateLimiter();

/**
 * Rate limit configurations for different endpoints
 */
export const RATE_LIMITS = {
  // Public endpoints
  PUBLIC: {
    limit: 100,
    window: 60 * 1000, // 100 requests per minute
  },
  
  // Authentication endpoints (stricter)
  AUTH: {
    limit: 5,
    window: 15 * 60 * 1000, // 5 requests per 15 minutes
  },
  
  // Contact form (prevent spam)
  CONTACT: {
    limit: 3,
    window: 60 * 60 * 1000, // 3 requests per hour
  },
  
  // Checkout/Payment (allow more attempts for legitimate retries)
  CHECKOUT: {
    limit: 50,
    window: 60 * 60 * 1000, // 50 requests per hour
  },
  
  // Subscription endpoints
  SUBSCRIPTION: {
    limit: 20,
    window: 60 * 60 * 1000, // 20 requests per hour
  },
} as const;

/**
 * Get identifier from request (IP address or user ID)
 */
export function getIdentifier(request: Request): string {
  // Try to get IP from headers (works with most proxies/load balancers)
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const ip = forwarded?.split(',')[0] || realIp || 'unknown';
  
  return ip;
}

/**
 * Apply rate limiting to an API route
 * @param identifier - Unique identifier for the request
 * @param config - Rate limit configuration
 * @returns Rate limit result
 */
export function rateLimit(
  identifier: string,
  config: { limit: number; window: number } = RATE_LIMITS.PUBLIC
) {
  return rateLimiter.check(identifier, config.limit, config.window);
}

/**
 * Reset rate limit for an identifier
 */
export function resetRateLimit(identifier: string): void {
  rateLimiter.reset(identifier);
}

/**
 * Get rate limiter stats
 */
export function getRateLimitStats() {
  return rateLimiter.getStats();
}

/**
 * Clear all rate limit records (use with caution)
 */
export function clearRateLimits(): void {
  rateLimiter.clear();
}

export default rateLimiter;

