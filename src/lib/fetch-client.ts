/**
 * HTTP Client with Timeout and Retry Logic
 * Wrapper around fetch with built-in timeout, retry, and error handling
 */

import logger from './logger';

export interface FetchOptions extends RequestInit {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  onRetry?: (attempt: number, error: Error) => void;
}

export class TimeoutError extends Error {
  constructor(message: string, public readonly timeoutMs: number) {
    super(message);
    this.name = 'TimeoutError';
  }
}

export class NetworkError extends Error {
  constructor(message: string, public readonly originalError?: Error) {
    super(message);
    this.name = 'NetworkError';
  }
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const calculateBackoff = (attempt: number, baseDelay: number) => Math.min(baseDelay * Math.pow(2, attempt), 30000);

function createTimeoutController(timeoutMs: number): { controller: AbortController; timeoutId: NodeJS.Timeout } {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  return { controller, timeoutId };
}

export async function fetchWithTimeout(url: string, options: FetchOptions = {}): Promise<Response> {
  const { timeout = 10000, retries = 3, retryDelay = 1000, onRetry, ...fetchOptions } = options;
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const { controller, timeoutId } = createTimeoutController(timeout);

    try {
      const signal = fetchOptions.signal
        ? AbortSignal.any?.([controller.signal, fetchOptions.signal]) || controller.signal
        : controller.signal;

      const response = await fetch(url, { ...fetchOptions, signal });
      clearTimeout(timeoutId);

      if (response.ok || (response.status >= 400 && response.status < 500)) {
        return response;
      }

      throw new NetworkError(`Server error: ${response.status} ${response.statusText}`, new Error(response.statusText));
    } catch (err) {
      clearTimeout(timeoutId);

      lastError = err instanceof Error && err.name === 'AbortError'
        ? new TimeoutError(`Request timeout after ${timeout}ms`, timeout)
        : err instanceof NetworkError
          ? err
          : new NetworkError(`Network request failed: ${err instanceof Error ? err.message : 'Unknown error'}`, err instanceof Error ? err : undefined);

      if (!(lastError instanceof TimeoutError) && !(lastError instanceof NetworkError)) {
        throw lastError;
      }

      if (attempt === retries) {
        logger.error(`Request failed after ${retries + 1} attempts`, lastError, {
          url,
          method: fetchOptions.method || 'GET',
        });
        throw lastError;
      }

      const backoffDelay = calculateBackoff(attempt, retryDelay);

      logger.warn(`Request failed, retrying (${attempt + 1}/${retries})`, {
        url,
        method: fetchOptions.method || 'GET',
        error: lastError.message,
        nextRetryIn: backoffDelay,
      });

      onRetry?.(attempt + 1, lastError);
      await sleep(backoffDelay);
    }
  }

  throw lastError || new Error('Request failed for unknown reason');
}

export async function fetchJSON<T = any>(url: string, options: FetchOptions = {}): Promise<T> {
  const response = await fetchWithTimeout(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    throw new NetworkError(`HTTP ${response.status}: ${errorText}`, new Error(response.statusText));
  }

  try {
    return await response.json();
  } catch (err) {
    throw new NetworkError('Failed to parse JSON response', err instanceof Error ? err : undefined);
  }
}

const createJSONMethod = (method: string) => async <T = any>(url: string, data: any, options: FetchOptions = {}): Promise<T> =>
  fetchJSON<T>(url, { ...options, method, body: JSON.stringify(data) });

export const postJSON = createJSONMethod('POST');
export const putJSON = createJSONMethod('PUT');

export async function deleteJSON<T = any>(url: string, options: FetchOptions = {}): Promise<T> {
  return fetchJSON<T>(url, { ...options, method: 'DELETE' });
}

export async function getJSON<T = any>(url: string, params?: Record<string, string>, options: FetchOptions = {}): Promise<T> {
  const urlObj = new URL(url, typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');
  
  if (params) {
    Object.entries(params).forEach(([key, value]) => urlObj.searchParams.set(key, value));
  }

  return fetchJSON<T>(urlObj.toString(), { ...options, method: 'GET' });
}

export default {
  fetch: fetchWithTimeout,
  get: getJSON,
  post: postJSON,
  put: putJSON,
  delete: deleteJSON,
  json: fetchJSON,
};

