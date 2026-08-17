/**
 * Firestore CRM Cache Service
 *
 * WHY THIS EXISTS:
 * The old pattern `let cachedLeads: any = null` used module-level variables.
 * On Vercel (serverless), each request may spin up a fresh container — so
 * the variable is ALWAYS null in production. This is a real zero-cache system.
 *
 * Firestore persists across all serverless instances and container restarts.
 * It is already configured (Firebase Admin SDK is initialized), so zero new
 * infrastructure or env vars are needed.
 *
 * COLLECTION LAYOUT:
 *   crm_cache/{key}  →  { data: any, cachedAt: string, source: string }
 *
 * DOCUMENT SIZE:
 *   Firestore limit is 1MB per document. Typical GAS responses:
 *   - 500 leads × ~600 bytes ≈ 300KB → safe
 *   - 2000 leads × ~600 bytes ≈ 1.2MB → approaching limit
 *   If data grows beyond ~1500 rows, consider splitting into sub-collections.
 */

import { adminDb } from "@/lib/firebase/admin";

export type CrmCacheKey =
  | "leads"
  | "client_form"
  | "subscriptions"
  | "orders"
  | "leads_v5"
  | "client_form_v5"
  | "subscriptions_v5"
  | "orders_v5";

const COLLECTION = "crm_cache";

export interface CrmCacheDoc<T = unknown> {
  data: T;
  cachedAt: string; // ISO 8601
  source: string;
}

/**
 * Read a cached document from Firestore.
 * Returns null if the document does not exist.
 */
export async function getCachedData<T = unknown>(
  key: CrmCacheKey
): Promise<CrmCacheDoc<T> | null> {
  if (!adminDb) return null;

  try {
    const doc = await adminDb.collection(COLLECTION).doc(key).get();
    if (!doc.exists) return null;
    return doc.data() as CrmCacheDoc<T>;
  } catch (err) {
    console.warn(`[crm-cache] Read failed for key "${key}":`, err);
    return null;
  }
}

/**
 * Write data to the Firestore cache with the current timestamp.
 */
export async function setCachedData<T = unknown>(
  key: CrmCacheKey,
  data: T,
  source = "gas"
): Promise<void> {
  if (!adminDb) return;

  try {
    await adminDb
      .collection(COLLECTION)
      .doc(key)
      .set({
        data,
        cachedAt: new Date().toISOString(),
        source,
      } satisfies CrmCacheDoc<T>);
  } catch (err) {
    console.warn(`[crm-cache] Write failed for key "${key}":`, err);
  }
}

/**
 * Returns true if the cached document is still within the TTL window.
 *
 * @param cachedAt ISO timestamp of when the data was cached
 * @param ttlMs    Time-to-live in milliseconds
 */
export function isCacheFresh(cachedAt: string | undefined, ttlMs: number): boolean {
  if (!cachedAt) return false;
  const age = Date.now() - new Date(cachedAt).getTime();
  return age < ttlMs;
}

/** Default TTL for GAS-sourced data (1 minute for fast sync) */
export const GAS_CACHE_TTL_MS = 60 * 1000;
