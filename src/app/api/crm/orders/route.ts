import { NextRequest, NextResponse } from "next/server";
import { authorizeCrmStaff } from "@/lib/api-auth";
import {
  getCachedData,
  setCachedData,
  isCacheFresh,
  GAS_CACHE_TTL_MS,
} from "@/lib/crm/cache";

export const dynamic = "force-dynamic";

function normalizeOrders(raw: { rows?: Record<string, unknown>[] } | null) {
  if (!raw?.rows) return raw;
  // The Orders sheet has a typo in cell A1 ("KI " instead of "timestamp").
  // Normalize it here so the UI can treat it as a normal timestamp field.
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
  const authStatus = await authorizeCrmStaff(req);
  if (!authStatus.authorized) {
    return NextResponse.json(
      { success: false, error: authStatus.error || "Forbidden", rows: [], total: 0 },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(req.url);
  const forceRefresh = searchParams.get("refresh") === "true";

  // ── Check Firestore cache (orders are already normalized when stored) ──────
  const cached = await getCachedData("orders");
  if (!forceRefresh && isCacheFresh(cached?.cachedAt, GAS_CACHE_TTL_MS)) {
    return NextResponse.json(cached!.data, {
      headers: { "X-Cache": "HIT", "Cache-Control": "private, max-age=0" },
    });
  }

  const url = process.env.NEXT_PUBLIC_ORDERS_SHEET_URL;
  if (!url) {
    if (cached?.data) {
      return NextResponse.json(cached.data, {
        headers: { "X-Cache": "STALE", "Cache-Control": "private, max-age=0" },
      });
    }
    return NextResponse.json(
      { success: false, error: "NEXT_PUBLIC_ORDERS_SHEET_URL is not configured.", rows: [], total: 0 },
      { status: 500 }
    );
  }

  try {
    const upstream = await fetch(`${url}?action=list`, {
      method: "GET",
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
      redirect: "follow",
    });

    if (!upstream.ok) {
      if (cached?.data) {
        return NextResponse.json(cached.data, {
          headers: { "X-Cache": "STALE", "Cache-Control": "private, max-age=0" },
        });
      }
      return NextResponse.json(
        { success: false, error: `Sheet endpoint returned ${upstream.status}`, rows: [], total: 0 },
        { status: 502 }
      );
    }

    const raw = await upstream.json();
    const normalized = normalizeOrders(raw);

    // Store normalized data so cache reads don't need to re-normalize
    setCachedData("orders", normalized).catch((e) =>
      console.warn("[orders] Cache write failed:", e)
    );

    return NextResponse.json(normalized, {
      headers: { "X-Cache": "MISS", "Cache-Control": "private, max-age=0" },
    });
  } catch (err) {
    if (cached?.data) {
      console.warn("[orders] GAS fetch failed, serving stale cache:", err);
      return NextResponse.json(cached.data, {
        headers: { "X-Cache": "STALE", "Cache-Control": "private, max-age=0" },
      });
    }
    const message = err instanceof Error ? err.message : "Failed to fetch orders";
    return NextResponse.json(
      { success: false, error: message, rows: [], total: 0 },
      { status: 502 }
    );
  }
}
