import { NextRequest, NextResponse } from "next/server";
import { authorizeCrmStaff } from "@/lib/api-auth";

// Always force dynamic so Vercel executes the handler on requests
export const dynamic = "force-dynamic";
export const revalidate = 0;

let cachedOrders: any = null;
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
  if (!forceRefresh && cachedOrders && now - lastFetched < CACHE_DURATION_MS) {
    return NextResponse.json(cachedOrders, {
      headers: {
        "X-Cache": "HIT",
      },
    });
  }

  const url = process.env.NEXT_PUBLIC_ORDERS_SHEET_URL;

  if (!url) {
    return NextResponse.json(
      {
        success: false,
        error: "NEXT_PUBLIC_ORDERS_SHEET_URL is not configured.",
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

    const raw = await upstream.json();

    // The Orders sheet has a typo in cell A1 ("KI " instead of "timestamp").
    // Normalize it here so the UI can treat it as a normal timestamp field.
    if (raw && Array.isArray(raw.rows)) {
      raw.rows = raw.rows.map((row: Record<string, unknown>) => {
        if (row && "KI " in row && !("timestamp" in row)) {
          const { ["KI "]: ts, ...rest } = row;
          return { timestamp: ts, ...rest };
        }
        return row;
      });
    }

    // Update the cache
    cachedOrders = raw;
    lastFetched = now;

    return NextResponse.json(raw, {
      headers: {
        "Cache-Control": "no-store, max-age=0",
        "X-Cache": "MISS",
      },
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to fetch orders";
    return NextResponse.json(
      { success: false, error: message, rows: [], total: 0 },
      { status: 502 }
    );
  }
}
