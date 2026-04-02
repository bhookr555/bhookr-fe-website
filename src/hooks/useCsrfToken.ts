/**
 * CSRF Token Management Hook
 * Industry-grade implementation with caching and auto-refresh
 */

import { useState, useEffect, useCallback, useRef } from 'react';

// Extend window type for CSRF token storage
declare global {
  interface Window {
    __CSRF_TOKEN__?: string;
    __CSRF_EXPIRY__?: number;
  }
}

interface CsrfTokenState {
  token: string | null;
  loading: boolean;
  error: string | null;
  expiresAt: number | null;
}

const CSRF_TOKEN_CACHE_KEY = 'csrf_token';
const CSRF_EXPIRY_CACHE_KEY = 'csrf_token_expiry';
const TOKEN_REFRESH_BUFFER = 5 * 60 * 1000;

// Centralized token storage
const tokenCache = {
  get: () => ({
    token: window.__CSRF_TOKEN__ || sessionStorage.getItem(CSRF_TOKEN_CACHE_KEY),
    expiry: window.__CSRF_EXPIRY__?.toString() || sessionStorage.getItem(CSRF_EXPIRY_CACHE_KEY),
  }),
  set: (token: string, expiresAt: number) => {
    sessionStorage.setItem(CSRF_TOKEN_CACHE_KEY, token);
    sessionStorage.setItem(CSRF_EXPIRY_CACHE_KEY, expiresAt.toString());
    window.__CSRF_TOKEN__ = token;
    window.__CSRF_EXPIRY__ = expiresAt;
  },
};

export function useCsrfToken() {
  const [state, setState] = useState<CsrfTokenState>({
    token: null,
    loading: false,
    error: null,
    expiresAt: null,
  });
  
  const isRefreshing = useRef(false);

  const isTokenExpired = useCallback(() => {
    if (!state.expiresAt) return true;
    return Date.now() >= (state.expiresAt - TOKEN_REFRESH_BUFFER);
  }, [state.expiresAt]);

  const fetchToken = useCallback(async (force = false) => {
    if (isRefreshing.current && !force) {
      await new Promise(resolve => setTimeout(resolve, 100));
      return state.token;
    }

    if (!force && state.token && !isTokenExpired()) {
      return state.token;
    }

    isRefreshing.current = true;
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const response = await fetch('/api/csrf', {
        method: 'GET',
        credentials: 'include',
        cache: 'no-store',
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch CSRF token: ${response.statusText}`);
      }

      const { token, expiresIn = 3600 } = await response.json();
      const expiresAt = Date.now() + (expiresIn * 1000);

      if (typeof window !== 'undefined') {
        tokenCache.set(token, expiresAt);
      }

      setState({ token, loading: false, error: null, expiresAt });
      return token;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch CSRF token';
      setState(prev => ({ ...prev, loading: false, error: errorMessage }));
      console.error('CSRF token fetch error:', error);
      return null;
    } finally {
      isRefreshing.current = false;
    }
  }, [state.token, isTokenExpired]);

  const getToken = useCallback(async (forceRefresh = false) => {
    if (forceRefresh || !state.token || isTokenExpired()) {
      return await fetchToken(forceRefresh);
    }
    return state.token;
  }, [state.token, isTokenExpired, fetchToken]);

  const refreshToken = useCallback(() => fetchToken(true), [fetchToken]);

  useEffect(() => {
    const initToken = async () => {
      if (typeof window === 'undefined') return;

      const { token: cachedToken, expiry: cachedExpiry } = tokenCache.get();

      if (cachedToken && cachedExpiry) {
        const expiresAt = parseInt(cachedExpiry, 10);
        
        if (Date.now() < expiresAt - TOKEN_REFRESH_BUFFER) {
          setState({ token: cachedToken, loading: false, error: null, expiresAt });
          return;
        }
      }

      await fetchToken();
    };

    initToken();
  }, [fetchToken]);

  useEffect(() => {
    if (!state.expiresAt) return;

    const timeUntilRefresh = state.expiresAt - Date.now() - TOKEN_REFRESH_BUFFER;
    
    if (timeUntilRefresh <= 0) return;

    const timer = setTimeout(() => fetchToken(true), timeUntilRefresh);
    return () => clearTimeout(timer);
  }, [state.expiresAt, fetchToken]);

  return {
    token: state.token,
    loading: state.loading,
    error: state.error,
    getToken,
    refreshToken,
    isExpired: isTokenExpired(),
  };
}
