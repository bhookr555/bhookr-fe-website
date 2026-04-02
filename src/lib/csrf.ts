/**
 * CSRF (Cross-Site Request Forgery) Protection
 * Implements token-based CSRF protection for state-changing operations
 */

import { NextRequest } from 'next/server';
import logger from './logger';

/**
 * Generate a cryptographically secure random token
 */
export function generateCsrfToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Store for CSRF tokens (in-memory)
 * In production, use Redis or database for distributed systems
 */
class CsrfTokenStore {
  private tokens: Map<string, { token: string; createdAt: number; sessionId: string }> = new Map();
  private readonly TOKEN_LIFETIME = 60 * 60 * 1000; // 1 hour
  private readonly MAX_TOKENS_PER_SESSION = 5;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Cleanup expired tokens every 5 minutes
    if (typeof window === 'undefined') {
      this.cleanupInterval = setInterval(() => this.cleanup(), 5 * 60 * 1000);
    }
  }

  /**
   * Create and store a new CSRF token
   */
  create(sessionId: string): string {
    const token = generateCsrfToken();
    const key = `${sessionId}:${token}`;
    
    // Remove old tokens for this session if exceeding limit
    this.cleanupSessionTokens(sessionId);
    
    this.tokens.set(key, {
      token,
      createdAt: Date.now(),
      sessionId,
    });
    
    return token;
  }

  /**
   * Verify a CSRF token
   */
  verify(sessionId: string, token: string): boolean {
    const key = `${sessionId}:${token}`;
    const stored = this.tokens.get(key);
    
    if (!stored) {
      return false;
    }
    
    // Check if token is expired
    const now = Date.now();
    if (now - stored.createdAt > this.TOKEN_LIFETIME) {
      this.tokens.delete(key);
      return false;
    }
    
    // Check if session matches
    if (stored.sessionId !== sessionId) {
      return false;
    }
    
    return true;
  }

  /**
   * Consume (delete) a CSRF token after use
   * For one-time use tokens (recommended for sensitive operations)
   */
  consume(sessionId: string, token: string): boolean {
    const key = `${sessionId}:${token}`;
    const valid = this.verify(sessionId, token);
    
    if (valid) {
      this.tokens.delete(key);
    }
    
    return valid;
  }

  /**
   * Clean up old tokens for a session
   */
  private cleanupSessionTokens(sessionId: string): void {
    const sessionTokens = Array.from(this.tokens.entries())
      .filter(([, data]) => data.sessionId === sessionId)
      .sort((a, b) => b[1].createdAt - a[1].createdAt);
    
    // Keep only the most recent tokens
    if (sessionTokens.length >= this.MAX_TOKENS_PER_SESSION) {
      sessionTokens.slice(this.MAX_TOKENS_PER_SESSION).forEach(([key]) => {
        this.tokens.delete(key);
      });
    }
  }

  /**
   * Clean up expired tokens
   */
  private cleanup(): void {
    const now = Date.now();
    
    for (const [key, data] of this.tokens.entries()) {
      if (now - data.createdAt > this.TOKEN_LIFETIME) {
        this.tokens.delete(key);
      }
    }
  }

  /**
   * Get statistics
   */
  getStats(): { totalTokens: number } {
    return {
      totalTokens: this.tokens.size,
    };
  }

  /**
   * Clear all tokens (for testing)
   */
  clear(): void {
    this.tokens.clear();
  }

  /**
   * Cleanup on destroy
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.clear();
  }
}

// Singleton instance
const csrfStore = new CsrfTokenStore();

/**
 * Get session identifier from request
 * Uses IP + User-Agent for consistent session identification
 */
export function getSessionIdentifier(request: NextRequest): string {
  // Use IP + User-Agent for consistent session identification
  // This ensures the same identifier is used across all requests in the same browser session
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 
             request.headers.get('x-real-ip') || 
             '127.0.0.1';
  const userAgent = request.headers.get('user-agent') || 'unknown';
  
  const sessionId = `${ip}:${userAgent}`;
  
  logger.debug('CSRF Session identifier created', { 
    ip, 
    userAgent: userAgent.substring(0, 50)
  });
  
  return sessionId;
}

/**
 * Create a new CSRF token for a session
 */
export function createCsrfToken(request: NextRequest): string {
  const sessionId = getSessionIdentifier(request);
  return csrfStore.create(sessionId);
}

/**
 * Verify CSRF token from request
 */
export function verifyCsrfToken(
  request: NextRequest,
  options: { consume?: boolean } = {}
): boolean {
  const sessionId = getSessionIdentifier(request);
  
  // Get token from header
  const headerToken = request.headers.get('X-CSRF-Token') || 
                     request.headers.get('X-XSRF-Token');
  
  if (!headerToken) {
    logger.security('CSRF token missing from request', { sessionId });
    return false;
  }
  
  // Verify or consume token
  const valid = options.consume 
    ? csrfStore.consume(sessionId, headerToken)
    : csrfStore.verify(sessionId, headerToken);
  
  if (!valid) {
    logger.security('Invalid CSRF token', { sessionId });
  }
  
  return valid;
}

/**
 * Middleware to verify CSRF token for state-changing operations
 */
export function requireCsrfToken(request: NextRequest): void {
  // Only check for state-changing methods
  const method = request.method.toUpperCase();
  const stateChangingMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
  
  if (!stateChangingMethods.includes(method)) {
    return; // GET, HEAD, OPTIONS don't need CSRF protection
  }
  
  if (!verifyCsrfToken(request)) {
    throw new CsrfError('Invalid or missing CSRF token');
  }
}

/**
 * Custom CSRF Error
 */
export class CsrfError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CsrfError';
  }
}

/**
 * Get CSRF token statistics
 */
export function getCsrfStats() {
  return csrfStore.getStats();
}

/**
 * Clear all CSRF tokens (for testing)
 */
export function clearCsrfTokens(): void {
  csrfStore.clear();
}

/**
 * Origin verification - additional CSRF protection
 * Verifies that the Origin or Referer header matches the request host
 */
export function verifyOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');
  const host = request.headers.get('host');
  
  if (!host) {
    return false;
  }
  
  // For same-origin requests, check origin first
  if (origin) {
    try {
      const originUrl = new URL(origin);
      if (originUrl.host === host) {
        return true;
      }
    } catch {
      return false;
    }
  }
  
  // Check referer as fallback
  if (referer) {
    try {
      const refererUrl = new URL(referer);
      if (refererUrl.host === host) {
        return true;
      }
    } catch {
      return false;
    }
  }
  
  return false;
}

/**
 * Double Submit Cookie pattern - alternative CSRF protection
 * Sets a random value in both a cookie and request parameter
 */
export function verifyDoubleSubmitCookie(request: NextRequest): boolean {
  const cookieToken = request.cookies.get('csrf-token')?.value;
  const headerToken = request.headers.get('X-CSRF-Token');
  
  if (!cookieToken || !headerToken) {
    return false;
  }
  
  // Constant-time comparison to prevent timing attacks
  if (cookieToken.length !== headerToken.length) {
    return false;
  }
  
  let mismatch = 0;
  for (let i = 0; i < cookieToken.length; i++) {
    const cookieChar = cookieToken.charCodeAt(i);
    const headerChar = headerToken.charCodeAt(i);
    mismatch |= cookieChar ^ headerChar;
  }
  
  return mismatch === 0;
}

export default {
  generateCsrfToken,
  createCsrfToken,
  verifyCsrfToken,
  requireCsrfToken,
  verifyOrigin,
  verifyDoubleSubmitCookie,
  getCsrfStats,
  clearCsrfTokens,
  CsrfError,
};

