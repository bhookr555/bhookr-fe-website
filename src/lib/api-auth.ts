/**
 * API Authentication Utilities
 * Helper functions for verifying user authentication in API routes
 */

import { NextRequest } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';
import logger from '@/lib/logger';

export interface AuthenticatedUser {
  uid: string;
  email: string | undefined;
  emailVerified: boolean;
  displayName?: string;
  photoURL?: string;
  phoneNumber?: string;
  disabled: boolean;
  metadata: {
    creationTime?: string;
    lastSignInTime?: string;
  };
}

/**
 * Extract Bearer token from Authorization header
 */
function extractBearerToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('Authorization');
  
  if (!authHeader) {
    return null;
  }
  
  const parts = authHeader.split(' ');
  
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }
  
  return parts[1] || null;
}

/**
 * Extract Firebase ID token from cookies
 */
function extractTokenFromCookies(request: NextRequest): string | null {
  // Check various cookie locations where Firebase token might be stored
  const sessionCookie = request.cookies.get('__session')?.value;
  const idTokenCookie = request.cookies.get('firebase-id-token')?.value;
  const customSessionCookie = request.cookies.get('bhookr_session')?.value;
  
  return sessionCookie || idTokenCookie || customSessionCookie || null;
}

/**
 * Verify Firebase ID token
 */
async function verifyFirebaseToken(token: string): Promise<AuthenticatedUser | null> {
  if (!adminAuth) {
    logger.warn('Firebase Admin not initialized, cannot verify token');
    return null;
  }
  
  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    
    // Get full user record
    const userRecord = await adminAuth.getUser(decodedToken.uid);
    
    return {
      uid: userRecord.uid,
      email: userRecord.email,
      emailVerified: userRecord.emailVerified,
      displayName: userRecord.displayName,
      photoURL: userRecord.photoURL,
      phoneNumber: userRecord.phoneNumber,
      disabled: userRecord.disabled,
      metadata: {
        creationTime: userRecord.metadata.creationTime,
        lastSignInTime: userRecord.metadata.lastSignInTime,
      },
    };
  } catch (error) {
    logger.warn('Token verification failed', { error });
    return null;
  }
}

/**
 * Parse custom session cookie (base64 encoded JSON)
 */
function parseSessionCookie(cookie: string): AuthenticatedUser | null {
  try {
    const decoded = Buffer.from(cookie, 'base64').toString('utf-8');
    const session = JSON.parse(decoded);
    
    // Validate session structure
    if (!session.userId || !session.email) {
      return null;
    }
    
    // Check if session is expired
    const now = Date.now();
    if (session.expiresAt && now > session.expiresAt) {
      return null;
    }
    
    return {
      uid: session.userId,
      email: session.email,
      emailVerified: true,
      displayName: session.name,
      disabled: false,
      metadata: {
        creationTime: new Date(session.createdAt).toISOString(),
      },
    };
  } catch {
    return null;
  }
}

/**
 * Get authenticated user from request
 * Checks Authorization header and cookies
 */
export async function getAuthenticatedUser(
  request: NextRequest
): Promise<AuthenticatedUser | null> {
  // Try Bearer token first
  const bearerToken = extractBearerToken(request);
  if (bearerToken) {
    const user = await verifyFirebaseToken(bearerToken);
    if (user) {
      return user;
    }
  }
  
  // Try cookie-based tokens
  const cookieToken = extractTokenFromCookies(request);
  if (cookieToken) {
    // First try as Firebase token
    const user = await verifyFirebaseToken(cookieToken);
    if (user) {
      return user;
    }
    
    // Then try as custom session cookie
    const sessionUser = parseSessionCookie(cookieToken);
    if (sessionUser) {
      return sessionUser;
    }
  }
  
  return null;
}

/**
 * Require authentication - throws error if user is not authenticated
 */
export async function requireAuth(
  request: NextRequest
): Promise<AuthenticatedUser> {
  const user = await getAuthenticatedUser(request);
  
  if (!user) {
    throw new AuthenticationError('Authentication required');
  }
  
  if (user.disabled) {
    throw new AuthenticationError('User account is disabled');
  }
  
  return user;
}

/**
 * Check if user has specific role
 * Checks role from Firestore user document
 */
export async function requireRole(
  request: NextRequest,
  allowedRoles: string[]
): Promise<AuthenticatedUser> {
  const user = await requireAuth(request);
  
  try {
    // Import dynamically to avoid circular dependencies
    const { userRepository } = await import('@/lib/repositories');
    const userDoc = await userRepository.findById(user.uid);
    
    const userRole = userDoc?.role || 'user';
    
    if (!allowedRoles.includes(userRole)) {
      logger.security('Insufficient role permissions', {
        userId: user.uid,
        userRole,
        required: allowedRoles,
      });
      throw new AuthorizationError(`Insufficient permissions. Required: ${allowedRoles.join(' or ')}`);
    }
    
    return user;
  } catch (error) {
    if (error instanceof AuthorizationError) {
      throw error;
    }
    logger.error('Role check failed', error as Error, { userId: user.uid });
    throw new AuthorizationError('Failed to verify permissions');
  }
}

/**
 * Check if authenticated user matches the requested user ID or is admin
 */
export async function requireSelfOrAdmin(
  request: NextRequest,
  targetUserId: string
): Promise<AuthenticatedUser> {
  const user = await requireAuth(request);
  
  // Check if user is accessing their own resources
  if (user.uid === targetUserId) {
    return user;
  }
  
  // Check if user is admin
  try {
    const { userRepository } = await import('@/lib/repositories');
    const userDoc = await userRepository.findById(user.uid);
    const isAdmin = userDoc?.role === 'admin';
    
    if (!isAdmin) {
      logger.security('Non-admin user attempted to access other user resources', {
        userId: user.uid,
        targetUserId,
      });
      throw new AuthorizationError('You can only access your own resources');
    }
    
    return user;
  } catch (error) {
    if (error instanceof AuthorizationError) {
      throw error;
    }
    logger.error('Authorization check failed', error as Error, { userId: user.uid });
    throw new AuthorizationError('Failed to verify permissions');
  }
}

/**
 * Optional authentication - returns null if not authenticated (doesn't throw)
 */
export async function optionalAuth(
  request: NextRequest
): Promise<AuthenticatedUser | null> {
  try {
    return await getAuthenticatedUser(request);
  } catch {
    return null;
  }
}

/**
 * Custom Authentication Error
 */
export class AuthenticationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

/**
 * Custom Authorization Error
 */
export class AuthorizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthorizationError';
  }
}

/**
 * Handle authentication errors in API routes
 */
export function handleAuthError(error: Error): {
  status: number;
  message: string;
} {
  if (error instanceof AuthenticationError) {
    return {
      status: 401,
      message: error.message,
    };
  }
  
  if (error instanceof AuthorizationError) {
    return {
      status: 403,
      message: error.message,
    };
  }
  
  // Unknown error
  logger.error('Unknown authentication error', error);
  return {
    status: 500,
    message: 'Authentication failed',
  };
}

/**
 * Middleware wrapper for protected API routes
 */
export function withAuth(
  handler: (request: NextRequest, user: AuthenticatedUser) => Promise<Response>
) {
  return async (request: NextRequest): Promise<Response> => {
    try {
      const user = await requireAuth(request);
      return await handler(request, user);
    } catch (error) {
      const { status, message } = handleAuthError(error as Error);
      return Response.json(
        { error: message },
        { status }
      );
    }
  };
}

/**
 * Middleware wrapper for role-based protected API routes
 */
export function withRole(
  allowedRoles: string[],
  handler: (request: NextRequest, user: AuthenticatedUser) => Promise<Response>
) {
  return async (request: NextRequest): Promise<Response> => {
    try {
      const user = await requireRole(request, allowedRoles);
      return await handler(request, user);
    } catch (error) {
      const { status, message } = handleAuthError(error as Error);
      return Response.json(
        { error: message },
        { status }
      );
    }
  };
}

