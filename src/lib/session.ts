/**
 * Session Management Utility
 * Handles secure session storage and management
 */

import { env } from './env';

export interface SessionData {
  userId: string;
  email: string;
  name: string;
  role: string;
  createdAt: number;
  expiresAt: number;
  lastActivity: number;
}

const SESSION_KEY = 'bhookr_session';
const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days
const ACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes of inactivity

/**
 * Check if code is running in browser
 */
function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

/**
 * Create a new session
 */
export function createSession(userData: {
  userId: string;
  email: string;
  name: string;
  role: string;
}): SessionData {
  const now = Date.now();
  
  const session: SessionData = {
    ...userData,
    createdAt: now,
    expiresAt: now + SESSION_DURATION,
    lastActivity: now,
  };

  if (isBrowser()) {
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      
      // Also set a cookie for SSR/middleware access
      document.cookie = `${SESSION_KEY}=${btoa(JSON.stringify(session))}; path=/; max-age=${SESSION_DURATION / 1000}; SameSite=Strict${env.NODE_ENV === 'production' ? '; Secure' : ''}`;
    } catch (error) {
      console.error('[Session] Failed to save session:', error);
    }
  }

  return session;
}

/**
 * Get current session
 */
export function getSession(): SessionData | null {
  if (!isBrowser()) {
    return null;
  }

  try {
    const sessionStr = localStorage.getItem(SESSION_KEY);
    
    if (!sessionStr) {
      return null;
    }

    const session: SessionData = JSON.parse(sessionStr);
    const now = Date.now();

    // Check if session is expired
    if (now > session.expiresAt) {
      clearSession();
      return null;
    }

    // Check for inactivity timeout
    if (now - session.lastActivity > ACTIVITY_TIMEOUT) {
      clearSession();
      return null;
    }

    return session;
  } catch (error) {
    console.error('[Session] Failed to parse session:', error);
    clearSession();
    return null;
  }
}

/**
 * Update session activity timestamp
 */
export function updateSessionActivity(): void {
  if (!isBrowser()) {
    return;
  }

  const session = getSession();
  
  if (session) {
    session.lastActivity = Date.now();
    
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    } catch (error) {
      console.error('[Session] Failed to update activity:', error);
    }
  }
}

/**
 * Extend session expiration
 */
export function extendSession(): void {
  if (!isBrowser()) {
    return;
  }

  const session = getSession();
  
  if (session) {
    session.expiresAt = Date.now() + SESSION_DURATION;
    session.lastActivity = Date.now();
    
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      
      // Update cookie
      document.cookie = `${SESSION_KEY}=${btoa(JSON.stringify(session))}; path=/; max-age=${SESSION_DURATION / 1000}; SameSite=Strict${env.NODE_ENV === 'production' ? '; Secure' : ''}`;
    } catch (error) {
      console.error('[Session] Failed to extend session:', error);
    }
  }
}

/**
 * Clear session (logout)
 */
export function clearSession(): void {
  if (!isBrowser()) {
    return;
  }

  try {
    localStorage.removeItem(SESSION_KEY);
    
    // Clear cookie
    document.cookie = `${SESSION_KEY}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
  } catch (error) {
    console.error('[Session] Failed to clear session:', error);
  }
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  return getSession() !== null;
}

/**
 * Get user ID from session
 */
export function getUserId(): string | null {
  const session = getSession();
  return session?.userId || null;
}

/**
 * Get user email from session
 */
export function getUserEmail(): string | null {
  const session = getSession();
  return session?.email || null;
}

/**
 * Check if user has specific role
 */
export function hasRole(role: string): boolean {
  const session = getSession();
  return session?.role === role;
}

/**
 * Get session expiration time
 */
export function getSessionExpiration(): Date | null {
  const session = getSession();
  return session ? new Date(session.expiresAt) : null;
}

/**
 * Get time until session expires (in milliseconds)
 */
export function getTimeUntilExpiration(): number | null {
  const session = getSession();
  
  if (!session) {
    return null;
  }

  return Math.max(0, session.expiresAt - Date.now());
}

/**
 * Setup automatic activity tracking
 * Call this once in your app initialization
 */
export function setupActivityTracking(): () => void {
  if (!isBrowser()) {
    return () => {};
  }

  const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
  let activityTimeout: NodeJS.Timeout | null = null;

  const handleActivity = () => {
    if (activityTimeout) {
      clearTimeout(activityTimeout);
    }

    activityTimeout = setTimeout(() => {
      updateSessionActivity();
    }, 5000); // Debounce: update after 5 seconds of activity
  };

  events.forEach(event => {
    window.addEventListener(event, handleActivity, { passive: true });
  });

  // Cleanup function
  return () => {
    events.forEach(event => {
      window.removeEventListener(event, handleActivity);
    });
    
    if (activityTimeout) {
      clearTimeout(activityTimeout);
    }
  };
}

/**
 * Setup session expiration check
 * Call this once in your app initialization
 */
export function setupSessionExpirationCheck(
  onExpired?: () => void
): () => void {
  if (!isBrowser()) {
    return () => {};
  }

  const intervalId = setInterval(() => {
    const session = getSession();
    
    if (!session && onExpired) {
      onExpired();
    }
  }, 60000); // Check every minute

  // Cleanup function
  return () => {
    clearInterval(intervalId);
  };
}

/**
 * Refresh session from Firebase Auth
 * Should be called when Firebase auth state changes
 */
export function refreshSessionFromAuth(userData: {
  userId: string;
  email: string;
  name: string;
  role?: string;
}): SessionData {
  return createSession({
    ...userData,
    role: userData.role || 'user',
  });
}

