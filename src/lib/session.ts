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

function sha256(ascii: string): string {
  const mathPow = Math.pow;
  const maxWord = mathPow(2, 32);
  const lengthProperty = 'length';
  let i: number, j: number;
  let result = '';

  const words: number[] = [];
  const asciiBitLength = ascii[lengthProperty] * 8;

  let hash: number[] = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ];

  const k: number[] = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ];

  ascii += '\x80';
  while ((ascii[lengthProperty] % 64) - 56) ascii += '\x00';
  for (i = 0; i < ascii[lengthProperty]; i++) {
    j = ascii.charCodeAt(i);
    if (j >> 8) return '';
    words[i >> 2] = (words[i >> 2] ?? 0) | (j << ((3 - (i % 4)) * 8));
  }
  words[words[lengthProperty]] = (asciiBitLength / maxWord) | 0;
  words[words[lengthProperty]] = asciiBitLength;

  for (j = 0; j < words[lengthProperty]; ) {
    const w = words.slice(j, (j += 16));
    const oldHash = hash.slice(0);

    for (i = 0; i < 64; i++) {
      const w15 = w[i - 15] ?? 0, w2 = w[i - 2] ?? 0;
      const a = hash[0] ?? 0, e = hash[4] ?? 0;
      const h1 = hash[1] ?? 0, h2 = hash[2] ?? 0, h3 = hash[3] ?? 0;
      const h5 = hash[5] ?? 0, h6 = hash[6] ?? 0, h7 = hash[7] ?? 0;

      const s0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10));
      const maj = (a & h1) ^ (a & h2) ^ (h1 & h2);
      const t2 = s0 + maj;
      const s1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7));
      const ch = (e & h5) ^ (~e & h6);
      
      const w16 = w[i - 16] ?? 0, w7 = w[i - 7] ?? 0;
      const val = i < 16
        ? (w[i] ?? 0)
        : ((w16 +
            (((w15 >>> 7) | (w15 << 25)) ^ ((w15 >>> 18) | (w15 << 14)) ^ (w15 >>> 3)) +
            w7 +
            (((w2 >>> 17) | (w2 << 15)) ^ ((w2 >>> 19) | (w2 << 13)) ^ (w2 >>> 10))) |
          0);
      w[i] = val;

      const t1 = h7 + s1 + ch + (k[i] ?? 0) + val;
      hash = [(t1 + t2) | 0, a, h1, h2, (t1 + h3) | 0, e, h5, h6];
    }

    for (i = 0; i < 8; i++) {
      hash[i] = ((hash[i] ?? 0) + (oldHash[i] ?? 0)) | 0;
    }
  }

  for (i = 0; i < 8; i++) {
    for (j = 3; j >= 0; j--) {
      const b = ((hash[i] ?? 0) >> (j * 8)) & 255;
      result += (b < 16 ? '0' : '') + b.toString(16);
    }
  }
  return result;
}

export function hmacSha256(message: string, secret: string): string {
  let key = secret;
  if (key.length > 64) {
    key = sha256(key);
  }
  while (key.length < 64) {
    key += '\x00';
  }
  let oPad = '';
  let iPad = '';
  for (let i = 0; i < 64; i++) {
    const kCode = key.charCodeAt(i);
    oPad += String.fromCharCode(kCode ^ 0x5c);
    iPad += String.fromCharCode(kCode ^ 0x36);
  }
  return sha256(oPad + sha256(iPad + message));
}

export function signSessionPayload(jsonStr: string): string {
  const secret = process.env.CRM_SESSION_SECRET || process.env.NEXT_PUBLIC_CRM_SESSION_SECRET || "bhookr_session_secret_default_key";
  const sig = hmacSha256(jsonStr, secret);
  return `${btoa(jsonStr)}.${sig}`;
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
      const jsonStr = JSON.stringify(session);
      localStorage.setItem(SESSION_KEY, jsonStr);
      
      // Also set a signed cookie for SSR/middleware access
      document.cookie = `${SESSION_KEY}=${signSessionPayload(jsonStr)}; path=/; max-age=${SESSION_DURATION / 1000}; SameSite=Strict${env.NODE_ENV === 'production' ? '; Secure' : ''}`;
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
      const jsonStr = JSON.stringify(session);
      localStorage.setItem(SESSION_KEY, jsonStr);
      
      // Update cookie
      document.cookie = `${SESSION_KEY}=${signSessionPayload(jsonStr)}; path=/; max-age=${SESSION_DURATION / 1000}; SameSite=Strict${env.NODE_ENV === 'production' ? '; Secure' : ''}`;
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

