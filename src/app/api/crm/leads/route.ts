import { NextRequest, NextResponse } from "next/server";
import { authorizeCrmStaff } from "@/lib/api-auth";
import {
  getCachedData,
  setCachedData,
  isCacheFresh,
  GAS_CACHE_TTL_MS,
} from "@/lib/crm/cache";

/**
 * WHY force-dynamic is kept: auth check is per-request (user-specific).
 * WHY no-store is removed from response: the Firestore cache handles freshness.
 *   Cache-Control: private means the browser can cache but CDN cannot
 *   (auth-gated data should not be cached by shared proxies).
 *
 * The old `let cachedLeads` was a module-level variable that reset on every
 * serverless container cold start — meaning it was always null in production.
 * The Firestore cache doc persists across ALL instances.
 */
export const dynamic = "force-dynamic";

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

  // ── Check Firestore cache ──────────────────────────────────────────────────
  const cached = await getCachedData("leads");
  if (!forceRefresh && isCacheFresh(cached?.cachedAt, GAS_CACHE_TTL_MS)) {
    return NextResponse.json(cached!.data, {
      headers: { "X-Cache": "HIT", "Cache-Control": "private, max-age=0" },
    });
  }

  const url = process.env.NEXT_PUBLIC_LEADS_SHEET_URL;
  if (!url) {
    // Return stale cache if GAS URL is missing rather than a hard error
    if (cached?.data) {
      return NextResponse.json(cached.data, {
        headers: { "X-Cache": "STALE", "Cache-Control": "private, max-age=0" },
      });
    }
    return NextResponse.json(
      { success: false, error: "NEXT_PUBLIC_LEADS_SHEET_URL is not configured.", rows: [], total: 0 },
      { status: 500 }
    );
  }

  try {
    const upstream = await fetch(`${url}?action=list`, {
      method: "GET",
      cache: "no-store",
      signal: AbortSignal.timeout(15_000), // Reduced: fail faster, fall back to cache
      redirect: "follow",
    });

    if (!upstream.ok) {
      // Serve stale cache on upstream error — degraded but functional
      if (cached?.data) {
        console.warn(`[leads] GAS returned ${upstream.status}, serving stale cache`);
        return NextResponse.json(cached.data, {
          headers: { "X-Cache": "STALE", "Cache-Control": "private, max-age=0" },
        });
      }
      return NextResponse.json(
        { success: false, error: `Sheet endpoint returned ${upstream.status}`, rows: [], total: 0 },
        { status: 502 }
      );
    }

    const data = await upstream.json();

    // Update Firestore cache (non-blocking)
    setCachedData("leads", data).catch((e) =>
      console.warn("[leads] Cache write failed:", e)
    );

    return NextResponse.json(data, {
      headers: { "X-Cache": "MISS", "Cache-Control": "private, max-age=0" },
    });
  } catch (err) {
    // Serve stale cache on timeout/network error
    if (cached?.data) {
      console.warn("[leads] GAS fetch failed, serving stale cache:", err);
      return NextResponse.json(cached.data, {
        headers: { "X-Cache": "STALE", "Cache-Control": "private, max-age=0" },
      });
    }
    const message = err instanceof Error ? err.message : "Failed to fetch leads from sheet";
    return NextResponse.json(
      { success: false, error: message, rows: [], total: 0 },
      { status: 502 }
    );
  }
}
