import { NextRequest, NextResponse } from "next/server";
import {
  getCachedData,
  setCachedData,
  GAS_CACHE_TTL_MS,
} from "@/lib/crm/cache";

/**
 * Background GAS → Firestore sync job.
 *
 * WHY: The dashboard should NEVER directly wait on Google Apps Script cold starts.
 * This cron job pre-warms the Firestore cache every 5 minutes, so when CRM staff
 * open the dashboard, they always get data from Firestore (<100ms) not GAS (2-10s).
 *
 * HOW TO TRIGGER:
 * - Vercel Cron: every 5 minutes (see vercel.json)
 * - Manual: GET /api/cron/sync-gas-to-firestore with Bearer token
 *
 * SECURITY: Protected by CRON_SECRET env var (set in Vercel project settings).
 * Vercel sets Authorization: Bearer <CRON_SECRET> automatically for cron requests.
 */

const GAS_TIMEOUT_MS = 25_000; // Allow longer timeout in background (not user-facing)

async function fetchGasData(url: string) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), GAS_TIMEOUT_MS);
  try {
    const res = await fetch(`${url}?action=list`, {
      method: "GET",
      cache: "no-store",
      signal: ctrl.signal,
      redirect: "follow",
    });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`GAS returned HTTP ${res.status}`);
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

export async function GET(req: NextRequest) {
  // ── Security: verify the cron secret ────────────────────────────────────
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = req.headers.get("authorization");
    const provided = authHeader?.replace("Bearer ", "");
    if (provided !== cronSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const leadsUrl = process.env.NEXT_PUBLIC_LEADS_SHEET_URL;
  const clientFormUrl = process.env.NEXT_PUBLIC_CLIENT_FORM_SHEET_URL;
  const subsUrl = process.env.NEXT_PUBLIC_SUBSCRIPTIONS_SHEET_URL;
  const ordersUrl = process.env.NEXT_PUBLIC_ORDERS_SHEET_URL;

  const startTime = Date.now();
  const results: Record<string, "synced" | "skipped" | "failed"> = {};

  // Fetch all GAS sources in parallel — failure of one doesn't affect others
  const [leadsResult, clientFormResult, subsResult, ordersResult] =
    await Promise.allSettled([
      leadsUrl ? fetchGasData(leadsUrl) : Promise.reject(new Error("No URL")),
      clientFormUrl ? fetchGasData(clientFormUrl) : Promise.resolve(null),
      subsUrl ? fetchGasData(subsUrl) : Promise.reject(new Error("No URL")),
      ordersUrl ? fetchGasData(ordersUrl) : Promise.reject(new Error("No URL")),
    ]);

  // Write successful fetches to Firestore cache
  const writes: Promise<void>[] = [];

  if (leadsResult.status === "fulfilled" && leadsResult.value) {
    writes.push(setCachedData("leads", leadsResult.value, "cron"));
    results.leads = "synced";
  } else {
    results.leads = "failed";
    console.error("[sync-cron] Leads sync failed:", leadsResult.status === "rejected" ? leadsResult.reason : "empty");
  }

  if (clientFormResult.status === "fulfilled" && clientFormResult.value) {
    writes.push(setCachedData("client_form", clientFormResult.value, "cron"));
    results.clientForm = "synced";
  } else {
    results.clientForm = clientFormUrl ? "failed" : "skipped";
  }

  if (subsResult.status === "fulfilled" && subsResult.value) {
    writes.push(setCachedData("subscriptions", subsResult.value, "cron"));
    results.subscriptions = "synced";
  } else {
    results.subscriptions = "failed";
    console.error("[sync-cron] Subscriptions sync failed:", subsResult.status === "rejected" ? subsResult.reason : "empty");
  }

  if (ordersResult.status === "fulfilled" && ordersResult.value) {
    const normalized = normalizeOrders(ordersResult.value);
    writes.push(setCachedData("orders", normalized, "cron"));
    results.orders = "synced";
  } else {
    results.orders = "failed";
    console.error("[sync-cron] Orders sync failed:", ordersResult.status === "rejected" ? ordersResult.reason : "empty");
  }

  await Promise.all(writes);

  const elapsed = Date.now() - startTime;
  console.log(`[sync-cron] Completed in ${elapsed}ms`, results);

  return NextResponse.json({
    ok: true,
    elapsed: `${elapsed}ms`,
    results,
    nextSync: `in ${GAS_CACHE_TTL_MS / 60_000} minutes`,
  });
}
