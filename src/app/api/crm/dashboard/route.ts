import { NextRequest, NextResponse } from "next/server";
import { authorizeCrmStaff } from "@/lib/api-auth";
import {
  getCachedData,
  setCachedData,
  isCacheFresh,
  GAS_CACHE_TTL_MS,
} from "@/lib/crm/cache";

/**
 * WHY force-dynamic is KEPT here:
 * The dashboard must auth-check per request (user-specific). However, the
 * expensive work (GAS calls) is done only on cache miss. The Firestore cache
 * makes this fast — force-dynamic just means "run the handler", not "be slow".
 *
 * WHY this replaces 4 separate API calls from the browser:
 * - OLD: browser fires 4 fetches simultaneously → waits for all 4 → renders
 * - NEW: browser fires 1 fetch → server checks Firestore cache (50ms) → returns
 *   The single auth round-trip overhead is eliminated across 3 of the 4 calls.
 */
export const dynamic = "force-dynamic";

const GAS_TIMEOUT_MS = 15_000; // Reduced from 20s — fail faster, use cache

async function fetchGas(url: string, timeout = GAS_TIMEOUT_MS) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeout);
  try {
    const res = await fetch(`${url}?action=list`, {
      method: "GET",
      cache: "no-store",
      signal: ctrl.signal,
      redirect: "follow",
    });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`GAS returned ${res.status}`);
    return res.json();
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

function normalizeOrders(raw: { rows?: Record<string, unknown>[] } | null) {
  if (!raw?.rows) return raw;
  // The Orders sheet has a typo in cell A1 ("KI " instead of "timestamp").
  raw.rows = raw.rows.map((row) => {
    if (row && "KI " in row && !("timestamp" in row)) {
      const { ["KI "]: ts, ...rest } = row;
      return { timestamp: ts, ...rest };
    }
    return row;
  });
  return raw;
}

export async function GET(req: NextRequest) {
  // ── 1. Auth (single call for all data) ────────────────────────────────────
  const authStatus = await authorizeCrmStaff(req);
  if (!authStatus.authorized) {
    return NextResponse.json(
      { success: false, error: authStatus.error || "Forbidden" },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(req.url);
  const forceRefresh = searchParams.get("refresh") === "true";

  // ── 2. Read all Firestore cache entries in parallel ───────────────────────
  const [cachedLeads, cachedClientForm, cachedSubs, cachedOrders] =
    await Promise.all([
      getCachedData("leads"),
      getCachedData("client_form"),
      getCachedData("subscriptions"),
      getCachedData("orders"),
    ]);

  const leadsOk = !forceRefresh && isCacheFresh(cachedLeads?.cachedAt, GAS_CACHE_TTL_MS);
  const clientFormOk = !forceRefresh && isCacheFresh(cachedClientForm?.cachedAt, GAS_CACHE_TTL_MS);
  const subsOk = !forceRefresh && isCacheFresh(cachedSubs?.cachedAt, GAS_CACHE_TTL_MS);
  const ordersOk = !forceRefresh && isCacheFresh(cachedOrders?.cachedAt, GAS_CACHE_TTL_MS);

  // ── 3. If everything is fresh, return immediately (no GAS calls) ──────────
  if (leadsOk && clientFormOk && subsOk && ordersOk) {
    return NextResponse.json(
      {
        success: true,
        leads: cachedLeads!.data,
        clientForm: cachedClientForm!.data,
        subscriptions: cachedSubs!.data,
        orders: cachedOrders!.data,
        meta: {
          cachedAt: cachedLeads!.cachedAt,
          source: "firestore-cache",
        },
      },
      {
        headers: {
          "X-Cache": "HIT",
          // s-maxage tells Vercel's CDN how long to cache (0 — auth-gated, no CDN cache)
          "Cache-Control": "private, no-store",
        },
      }
    );
  }

  // ── 4. Fetch only stale/missing sources from GAS in parallel ─────────────
  const leadsUrl = process.env.NEXT_PUBLIC_LEADS_SHEET_URL;
  const clientFormUrl = process.env.NEXT_PUBLIC_CLIENT_FORM_SHEET_URL;
  const subsUrl = process.env.NEXT_PUBLIC_SUBSCRIPTIONS_SHEET_URL;
  const ordersUrl = process.env.NEXT_PUBLIC_ORDERS_SHEET_URL;

  const [leadsResult, clientFormResult, subsResult, ordersResult] =
    await Promise.allSettled([
      leadsOk
        ? Promise.resolve({ value: cachedLeads!.data, cached: true })
        : leadsUrl
        ? fetchGas(leadsUrl).then((d) => ({ value: d, cached: false }))
        : Promise.resolve({ value: { success: false, rows: [], total: 0 }, cached: false }),

      clientFormOk
        ? Promise.resolve({ value: cachedClientForm!.data, cached: true })
        : clientFormUrl
        ? fetchGas(clientFormUrl).then((d) => ({ value: d, cached: false }))
        : Promise.resolve({ value: { success: true, rows: [], total: 0 }, cached: false }),

      subsOk
        ? Promise.resolve({ value: cachedSubs!.data, cached: true })
        : subsUrl
        ? fetchGas(subsUrl).then((d) => ({ value: d, cached: false }))
        : Promise.resolve({ value: { success: false, rows: [], total: 0 }, cached: false }),

      ordersOk
        ? Promise.resolve({ value: cachedOrders!.data, cached: true })
        : ordersUrl
        ? fetchGas(ordersUrl)
            .then((d) => ({ value: normalizeOrders(d), cached: false }))
        : Promise.resolve({ value: { success: false, rows: [], total: 0 }, cached: false }),
    ]);

  // ── 5. Extract values, fall back to stale cache on GAS failure ───────────
  const leadsData =
    leadsResult.status === "fulfilled"
      ? leadsResult.value.value
      : cachedLeads?.data ?? { success: false, rows: [], total: 0 };

  const clientFormData =
    clientFormResult.status === "fulfilled"
      ? clientFormResult.value.value
      : cachedClientForm?.data ?? { success: true, rows: [], total: 0 };

  const subsData =
    subsResult.status === "fulfilled"
      ? subsResult.value.value
      : cachedSubs?.data ?? { success: false, rows: [], total: 0 };

  const ordersData =
    ordersResult.status === "fulfilled"
      ? ordersResult.value.value
      : cachedOrders?.data ?? { success: false, rows: [], total: 0 };

  // ── 6. Update Firestore cache for any freshly fetched data ───────────────
  const cacheUpdates: Promise<void>[] = [];

  if (leadsResult.status === "fulfilled" && !leadsResult.value.cached) {
    cacheUpdates.push(setCachedData("leads", leadsData));
  }
  if (clientFormResult.status === "fulfilled" && !clientFormResult.value.cached) {
    cacheUpdates.push(setCachedData("client_form", clientFormData));
  }
  if (subsResult.status === "fulfilled" && !subsResult.value.cached) {
    cacheUpdates.push(setCachedData("subscriptions", subsData));
  }
  if (ordersResult.status === "fulfilled" && !ordersResult.value.cached) {
    cacheUpdates.push(setCachedData("orders", ordersData));
  }

  // Fire-and-forget cache writes — don't block the response
  Promise.all(cacheUpdates).catch((err) =>
    console.warn("[dashboard] Cache write error:", err)
  );

  // ── 7. Build partial failure indicators ──────────────────────────────────
  const errors: Record<string, string> = {};
  if (leadsResult.status === "rejected") {
    errors.leads = leadsResult.reason?.message ?? "GAS unavailable";
    console.warn("[dashboard] Leads GAS failed:", leadsResult.reason);
  }
  if (clientFormResult.status === "rejected") {
    errors.clientForm = clientFormResult.reason?.message ?? "GAS unavailable";
  }
  if (subsResult.status === "rejected") {
    errors.subscriptions = subsResult.reason?.message ?? "GAS unavailable";
  }
  if (ordersResult.status === "rejected") {
    errors.orders = ordersResult.reason?.message ?? "GAS unavailable";
  }

  return NextResponse.json(
    {
      success: true,
      leads: leadsData,
      clientForm: clientFormData,
      subscriptions: subsData,
      orders: ordersData,
      meta: {
        cachedAt: new Date().toISOString(),
        source: "gas",
        errors: Object.keys(errors).length > 0 ? errors : undefined,
      },
    },
    {
      headers: {
        "X-Cache": "MISS",
        "Cache-Control": "private, no-store",
      },
    }
  );
}
