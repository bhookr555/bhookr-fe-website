import { NextRequest, NextResponse } from "next/server";
import { authorizeCrmStaff } from "@/lib/api-auth";
import {
  getCachedData,
  setCachedData,
  isCacheFresh,
  GAS_CACHE_TTL_MS,
} from "@/lib/crm/cache";

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

  // Check cache
  const cached = await getCachedData("active_customers");
  if (!forceRefresh && isCacheFresh(cached?.cachedAt, GAS_CACHE_TTL_MS)) {
    return NextResponse.json(cached!.data, {
      headers: { "X-Cache": "HIT", "Cache-Control": "private, max-age=0" },
    });
  }

  // Priority: NEXT_PUBLIC_ACTIVE_CUSTOMERS_SHEET_URL -> NEXT_PUBLIC_SUBSCRIPTIONS_SHEET_URL
  const url =
    process.env.NEXT_PUBLIC_ACTIVE_CUSTOMERS_SHEET_URL ||
    process.env.NEXT_PUBLIC_SUBSCRIPTIONS_SHEET_URL;

  if (!url) {
    if (cached?.data) {
      return NextResponse.json(cached.data, {
        headers: { "X-Cache": "STALE", "Cache-Control": "private, max-age=0" },
      });
    }
    return NextResponse.json(
      {
        success: false,
        error: "NEXT_PUBLIC_ACTIVE_CUSTOMERS_SHEET_URL is not configured.",
        rows: [],
        total: 0,
      },
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

    const data = await upstream.json();
    setCachedData("active_customers", data).catch((e) =>
      console.warn("[active_customers] Cache write failed:", e)
    );

    return NextResponse.json(data, {
      headers: { "X-Cache": "MISS", "Cache-Control": "private, max-age=0" },
    });
  } catch (err) {
    if (cached?.data) {
      console.warn("[active_customers] GAS fetch failed, serving stale cache:", err);
      return NextResponse.json(cached.data, {
        headers: { "X-Cache": "STALE", "Cache-Control": "private, max-age=0" },
      });
    }
    const message = err instanceof Error ? err.message : "Failed to fetch active customers sheet";
    return NextResponse.json(
      { success: false, error: message, rows: [], total: 0 },
      { status: 502 }
    );
  }
}
