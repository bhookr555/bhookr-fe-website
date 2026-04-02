/**
 * LocalStorage Utility Functions
 * 
 * Provides type-safe, error-handled localStorage operations.
 */

/**
 * Safely get item from localStorage with error handling
 */
export function getLocalStorageItem<T = string>(key: string): T | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const item = localStorage.getItem(key);
    return item ? (JSON.parse(item) as T) : null;
  } catch (error) {
    console.error(`Failed to get localStorage item "${key}":`, error);
    return null;
  }
}

/**
 * Safely set item in localStorage with error handling
 */
export function setLocalStorageItem<T>(key: string, value: T): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error(`Failed to set localStorage item "${key}":`, error);
    return false;
  }
}

/**
 * Safely remove item from localStorage with error handling
 */
export function removeLocalStorageItem(key: string): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error(`Failed to remove localStorage item "${key}":`, error);
    return false;
  }
}

/**
 * Check if localStorage item exists
 */
export function hasLocalStorageItem(key: string): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    return localStorage.getItem(key) !== null;
  } catch {
    return false;
  }
}

/**
 * Common localStorage keys used in the application
 */
export const STORAGE_KEYS = {
  DELIVERY_ADDRESS: 'deliveryAddress',
  LAST_ORDER: 'lastOrder',
  PENDING_ORDER_ID: 'pendingOrderId',
  SUBSCRIPTION_FORM_DATA: 'subscriptionFormData',
} as const;
