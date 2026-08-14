import { NextRequest, NextResponse } from "next/server";
import { authorizeCrmStaff } from "@/lib/api-auth";
import {
  getCachedData,
  setCachedData,
  isCacheFresh,
  GAS_CACHE_TTL_MS,
} from "@/lib/crm/cache";
import { deduplicateAndMergeLeads } from "@/lib/crm/leads-aggregator";
import type { LeadRow } from "@/lib/crm/leads";

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
  const leadsUrl =
    process.env.NEXT_PUBLIC_LEADS_SHEET_URL ||
    "https://script.google.com/macros/s/AKfycbzrO0fki7Vcv3G06yt8wzz7Pta-f377k-nFr2gEob17jc65qd6vlkFCf9Ng_VpbCvxg/exec";
  const clientFormUrl = process.env.NEXT_PUBLIC_CLIENT_FORM_SHEET_URL;
  const subsUrl = process.env.NEXT_PUBLIC_SUBSCRIPTIONS_SHEET_URL;
  const ordersUrl = process.env.NEXT_PUBLIC_ORDERS_SHEET_URL;

  const tasks: Promise<void>[] = [];

  if (staleKeys.leads && leadsUrl) {
    tasks.push(
      (async () => {
        try {
          const freshData = await fetchGas(leadsUrl);
          const cached = await getCachedData<any>("leads");
          const cachedRows: LeadRow[] = Array.isArray(cached?.data?.rows) ? cached.data.rows : [];
          const freshRows: LeadRow[] = Array.isArray(freshData?.rows) ? freshData.rows : [];

          // Merge cached and fresh rows so no lead is lost
          const mergedRows = deduplicateAndMergeLeads(
            cachedRows.map((r) => ({ ...r, leadSource: "website" as const })),
            freshRows.map((r) => ({ ...r, leadSource: "website" as const }))
          );

          const mergedData = {
            success: true,
            rows: mergedRows,
            total: mergedRows.length,
          };

          await setCachedData("leads", mergedData, "background-swr");
        } catch (e) {
          console.warn("[swr-bg] Leads refresh failed:", e);
        }
      })()
    );
  }

  if (staleKeys.clientForm && clientFormUrl) {
    tasks.push(
      (async () => {
        try {
          const freshData = await fetchGas(clientFormUrl);
          const cached = await getCachedData<any>("client_form");
          const cachedRows: LeadRow[] = Array.isArray(cached?.data?.rows) ? cached.data.rows : [];
          const freshRows: LeadRow[] = Array.isArray(freshData?.rows) ? freshData.rows : [];

          const mergedRows = deduplicateAndMergeLeads(
            cachedRows.map((r) => ({ ...r, leadSource: "client_form" as const })),
            freshRows.map((r) => ({ ...r, leadSource: "client_form" as const }))
          );

          const mergedData = {
            success: true,
            rows: mergedRows,
            total: mergedRows.length,
          };

          await setCachedData("client_form", mergedData, "background-swr");
        } catch (e) {
          console.warn("[swr-bg] ClientForm refresh failed:", e);
        }
      })()
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
  // ── 1. Auth check ─────────────────────────────────────────────────────────
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

  // ── 4. Cold Start / Force Refresh ─────────────────────────────────────────
  const staleKeys = {
    leads: true,
    clientForm: true,
    subscriptions: true,
    orders: true,
  };

  await backgroundRefreshGasData(staleKeys);

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
