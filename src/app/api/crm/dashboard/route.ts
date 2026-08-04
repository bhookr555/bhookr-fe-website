import { NextRequest, NextResponse } from "next/server";
import { authorizeCrmStaff } from "@/lib/api-auth";
import {
  getCachedData,
  setCachedData,
  isCacheFresh,
  GAS_CACHE_TTL_MS,
} from "@/lib/crm/cache";

/**
 * CRM Dashboard API Endpoint — Stale-While-Revalidate Architecture
 *
 * WHY THIS IS INSTANT (<50ms):
 * If Firestore contains cached data for leads/client-form/subscriptions/orders,
 * we return it IMMEDIATELY to the browser — even if it is older than 5 minutes.
 *
 * If the data is stale (or missing), we trigger a background sync to Google Apps
 * Script to update Firestore for future reads, but WE DO NOT BLOCK THE RESPONSE.
 *
 * Staff users NEVER wait on Google Apps Script cold starts (2–10s) again.
 */
export const dynamic = "force-dynamic";

const GAS_TIMEOUT_MS = 15_000;

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
  raw.rows = raw.rows.map((row) => {
    if (row && "KI " in row && !("timestamp" in row)) {
      const { ["KI "]: ts, ...rest } = row;
      return { timestamp: ts, ...rest };
    }
    return row;
  });
  return raw;
}

/** Asynchronously refresh stale items in the background without blocking HTTP response */
async function backgroundRefreshGasData(
  staleKeys: {
    leads: boolean;
    clientForm: boolean;
    subscriptions: boolean;
    orders: boolean;
  }
) {
  const leadsUrl = process.env.NEXT_PUBLIC_LEADS_SHEET_URL;
  const clientFormUrl = process.env.NEXT_PUBLIC_CLIENT_FORM_SHEET_URL;
  const subsUrl = process.env.NEXT_PUBLIC_SUBSCRIPTIONS_SHEET_URL;
  const ordersUrl = process.env.NEXT_PUBLIC_ORDERS_SHEET_URL;

  const tasks: Promise<void>[] = [];

  if (staleKeys.leads && leadsUrl) {
    tasks.push(
      fetchGas(leadsUrl)
        .then((d) => setCachedData("leads", d, "background-swr"))
        .catch((e) => console.warn("[swr-bg] Leads refresh failed:", e))
    );
  }
  if (staleKeys.clientForm && clientFormUrl) {
    tasks.push(
      fetchGas(clientFormUrl)
        .then((d) => setCachedData("client_form", d, "background-swr"))
        .catch((e) => console.warn("[swr-bg] ClientForm refresh failed:", e))
    );
  }
  if (staleKeys.subscriptions && subsUrl) {
    tasks.push(
      fetchGas(subsUrl)
        .then((d) => setCachedData("subscriptions", d, "background-swr"))
        .catch((e) => console.warn("[swr-bg] Subscriptions refresh failed:", e))
    );
  }
  if (staleKeys.orders && ordersUrl) {
    tasks.push(
      fetchGas(ordersUrl)
        .then((d) => setCachedData("orders", normalizeOrders(d), "background-swr"))
        .catch((e) => console.warn("[swr-bg] Orders refresh failed:", e))
    );
  }

  await Promise.allSettled(tasks);
}

export async function GET(req: NextRequest) {
  // ── 1. Auth check (single auth for all endpoints) ─────────────────────────
  const authStatus = await authorizeCrmStaff(req);
  if (!authStatus.authorized) {
    return NextResponse.json(
      { success: false, error: authStatus.error || "Forbidden" },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(req.url);
  const forceRefresh = searchParams.get("refresh") === "true";

  // ── 2. Read all Firestore cache entries in parallel (<50ms) ───────────────
  const [cachedLeads, cachedClientForm, cachedSubs, cachedOrders] =
    await Promise.all([
      getCachedData("leads"),
      getCachedData("client_form"),
      getCachedData("subscriptions"),
      getCachedData("orders"),
    ]);

  const leadsFresh = !forceRefresh && isCacheFresh(cachedLeads?.cachedAt, GAS_CACHE_TTL_MS);
  const clientFormFresh = !forceRefresh && isCacheFresh(cachedClientForm?.cachedAt, GAS_CACHE_TTL_MS);
  const subsFresh = !forceRefresh && isCacheFresh(cachedSubs?.cachedAt, GAS_CACHE_TTL_MS);
  const ordersFresh = !forceRefresh && isCacheFresh(cachedOrders?.cachedAt, GAS_CACHE_TTL_MS);

  const hasAnyCachedData =
    Boolean(cachedLeads?.data) ||
    Boolean(cachedClientForm?.data) ||
    Boolean(cachedSubs?.data) ||
    Boolean(cachedOrders?.data);

  // ── 3. NON-BLOCKING SWR: If we have cached data, return it IMMEDIATELY ──────
  if (hasAnyCachedData && !forceRefresh) {
    const staleKeys = {
      leads: !leadsFresh,
      clientForm: !clientFormFresh,
      subscriptions: !subsFresh,
      orders: !ordersFresh,
    };

    // If any slice is stale, trigger background refresh WITHOUT blocking response
    if (Object.values(staleKeys).some(Boolean)) {
      backgroundRefreshGasData(staleKeys).catch((e) =>
        console.warn("[dashboard] Background SWR error:", e)
      );
    }

    return NextResponse.json(
      {
        success: true,
        leads: cachedLeads?.data ?? { success: true, rows: [], total: 0 },
        clientForm: cachedClientForm?.data ?? { success: true, rows: [], total: 0 },
        subscriptions: cachedSubs?.data ?? { success: true, rows: [], total: 0 },
        orders: cachedOrders?.data ?? { success: true, rows: [], total: 0 },
        meta: {
          cachedAt: cachedLeads?.cachedAt ?? new Date().toISOString(),
          source: "firestore-cache-swr",
          isStale: Object.values(staleKeys).some(Boolean),
        },
      },
      {
        headers: {
          "X-Cache": "HIT-SWR",
          "Cache-Control": "private, no-store",
        },
      }
    );
  }

  // ── 4. Cold Start / Force Refresh: fetch synchronously only when NO cache exists
  const staleKeys = {
    leads: true,
    clientForm: true,
    subscriptions: true,
    orders: true,
  };

  await backgroundRefreshGasData(staleKeys);

  // Read updated cache entries
  const [freshLeads, freshClientForm, freshSubs, freshOrders] =
    await Promise.all([
      getCachedData("leads"),
      getCachedData("client_form"),
      getCachedData("subscriptions"),
      getCachedData("orders"),
    ]);

  return NextResponse.json(
    {
      success: true,
      leads: freshLeads?.data ?? { success: false, rows: [], total: 0 },
      clientForm: freshClientForm?.data ?? { success: true, rows: [], total: 0 },
      subscriptions: freshSubs?.data ?? { success: false, rows: [], total: 0 },
      orders: freshOrders?.data ?? { success: false, rows: [], total: 0 },
      meta: {
        cachedAt: new Date().toISOString(),
        source: "gas-sync",
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
