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

  // ── Check Firestore cache ──────────────────────────────────────────────────
  const cached = await getCachedData("client_form");
  if (!forceRefresh && isCacheFresh(cached?.cachedAt, GAS_CACHE_TTL_MS)) {
    return NextResponse.json(cached!.data, {
      headers: { "X-Cache": "HIT", "Cache-Control": "private, max-age=0" },
    });
  }

  const url = process.env.NEXT_PUBLIC_CLIENT_FORM_SHEET_URL;
  if (!url) {
    // Client form is optional — return empty success instead of error
    return NextResponse.json(
      { success: true, rows: [], total: 0 },
      { status: 200 }
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
        { success: false, error: `Client Form sheet returned status ${upstream.status}`, rows: [], total: 0 },
        { status: 502 }
      );
    }

    const data = await upstream.json();
    setCachedData("client_form", data).catch((e) =>
      console.warn("[client-form] Cache write failed:", e)
    );

    return NextResponse.json(data, {
      headers: { "X-Cache": "MISS", "Cache-Control": "private, max-age=0" },
    });
  } catch (err) {
    if (cached?.data) {
      console.warn("[client-form] GAS fetch failed, serving stale cache:", err);
      return NextResponse.json(cached.data, {
        headers: { "X-Cache": "STALE", "Cache-Control": "private, max-age=0" },
      });
    }
    const message = err instanceof Error ? err.message : "Failed to fetch Client Form entries";
    return NextResponse.json(
      { success: false, error: message, rows: [], total: 0 },
      { status: 502 }
    );
  }
}
