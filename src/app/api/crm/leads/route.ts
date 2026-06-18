import { NextRequest, NextResponse } from "next/server";

// Always force dynamic so Vercel executes the handler on requests
export const dynamic = "force-dynamic";
export const revalidate = 0;

let cachedLeads: any = null;
let lastFetched: number = 0;
const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const forceRefresh = searchParams.get("refresh") === "true";

  const now = Date.now();
  if (!forceRefresh && cachedLeads && now - lastFetched < CACHE_DURATION_MS) {
    return NextResponse.json(cachedLeads, {
      headers: {
        "X-Cache": "HIT",
      },
    });
  }

  const url = process.env.NEXT_PUBLIC_LEADS_SHEET_URL;

  if (!url) {
    return NextResponse.json(
      {
        success: false,
        error: "NEXT_PUBLIC_LEADS_SHEET_URL is not configured.",
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
      signal: AbortSignal.timeout(20_000),
      redirect: "follow",
    });

    if (!upstream.ok) {
      return NextResponse.json(
        {
          success: false,
          error: `Sheet endpoint returned ${upstream.status}`,
          rows: [],
          total: 0,
        },
        { status: 502 }
      );
    }

    const data = await upstream.json();

    // Update the cache
    cachedLeads = data;
    lastFetched = now;

    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "no-store, max-age=0",
        "X-Cache": "MISS",
      },
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to fetch leads from sheet";
    return NextResponse.json(
      { success: false, error: message, rows: [], total: 0 },
      { status: 502 }
    );
  }
}
