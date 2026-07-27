import { NextRequest, NextResponse } from "next/server";
import { authorizeCrmStaff } from "@/lib/api-auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

let cachedData: any = null;
let lastFetched: number = 0;
const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

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

  const now = Date.now();
  if (!forceRefresh && cachedData && now - lastFetched < CACHE_DURATION_MS) {
    return NextResponse.json(cachedData, {
      headers: {
        "X-Cache": "HIT",
      },
    });
  }

  const url = process.env.NEXT_PUBLIC_CLIENT_FORM_SHEET_URL;

  if (!url) {
    return NextResponse.json(
      {
        success: false,
        error: "NEXT_PUBLIC_CLIENT_FORM_SHEET_URL is not configured yet.",
        rows: [],
        total: 0,
      },
      { status: 200 }
    );
  }

  try {
    const upstream = await fetch(`${url}?action=list`, {
      method: "GET",
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
      redirect: "follow",
    });

    if (!upstream.ok) {
      return NextResponse.json(
        {
          success: false,
          error: `Client Form sheet returned status ${upstream.status}`,
          rows: [],
          total: 0,
        },
        { status: 502 }
      );
    }

    const data = await upstream.json();

    cachedData = data;
    lastFetched = now;

    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "no-store, max-age=0",
        "X-Cache": "MISS",
      },
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to fetch Client Form entries";
    return NextResponse.json(
      { success: false, error: message, rows: [], total: 0 },
      { status: 502 }
    );
  }
}
