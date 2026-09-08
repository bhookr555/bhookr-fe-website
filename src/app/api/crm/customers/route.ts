import { NextRequest, NextResponse } from "next/server";
import { authorizeCrmStaff } from "@/lib/api-auth";
import {
  getCachedData,
  setCachedData,
  isCacheFresh,
} from "@/lib/crm/cache";

export const dynamic = "force-dynamic";

// Short cache TTL (3 seconds) for super fast sync from Google Sheets
const ACTIVE_CUSTOMERS_CACHE_TTL_MS = 3 * 1000;

// Exact row layout from Google Sheet 1QGOfVihcDcaEhVJMn960zM0u0cenSyw_DHPYy6hE38E ("Sample print sheet")
export const SAMPLE_PRINT_SHEET_ROWS = [
  {
    "DELIVERY CODE": "BDC0001",
    NAME: "Shiva",
    MOBILE: "9989445376",
    LOCATION: "Idly street",
    ZONE: "ZONE 1",
    STATUS: "PRIORITY",
    PLAN: "ELITE",
    TYPE: "VEG",
    MEAL: "BF",
    GOAL: "WEIGHT LOSS",
    CUSTOMIZATION: "YES",
    INSPECTION: "DONE",
    "RECIPE ID": "BSI027",
  },
  {
    "DELIVERY CODE": "BDC0002",
    NAME: "YASH",
    MOBILE: "7416992979",
    LOCATION: "DALLASPURAM",
    ZONE: "ZONE 2",
    STATUS: "PRIORITY",
    PLAN: "LITE",
    TYPE: "NON VEG",
    MEAL: "BF",
    GOAL: "WEIGHT LOSS",
    CUSTOMIZATION: "YES",
    INSPECTION: "DONE",
    "RECIPE ID": "BSI028",
  },
];

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

  // Check cache unless force refresh requested
  if (!forceRefresh) {
    const cached = await getCachedData("active_customers");
    if (isCacheFresh(cached?.cachedAt, ACTIVE_CUSTOMERS_CACHE_TTL_MS)) {
      return NextResponse.json(cached!.data, {
        headers: { "X-Cache": "HIT", "Cache-Control": "no-cache, no-store, must-revalidate" },
      });
    }
  }

  const url = process.env.NEXT_PUBLIC_ACTIVE_CUSTOMERS_SHEET_URL;

  // Only fetch from upstream if URL is configured
  if (url) {
    try {
      const upstream = await fetch(`${url}?action=list&t=${Date.now()}`, {
        method: "GET",
        cache: "no-store",
        signal: AbortSignal.timeout(10_000),
        redirect: "follow",
      });

      if (upstream.ok) {
        const data = await upstream.json();
        if (data && Array.isArray(data.rows) && data.rows.length > 0) {
          setCachedData("active_customers", data).catch((e) =>
            console.warn("[active_customers] Cache write failed:", e)
          );
          return NextResponse.json(data, {
            headers: { "X-Cache": "MISS", "Cache-Control": "no-cache, no-store, must-revalidate" },
          });
        }
      }
    } catch (err) {
      console.warn("[active_customers] Upstream fetch failed, serving sample print sheet:", err);
    }
  }

  // Fallback to sample print sheet matching 1QGOfVihcDcaEhVJMn960zM0u0cenSyw_DHPYy6hE38E
  const sampleData = {
    success: true,
    rows: SAMPLE_PRINT_SHEET_ROWS,
    total: SAMPLE_PRINT_SHEET_ROWS.length,
    source: "sample_print_sheet",
  };

  setCachedData("active_customers", sampleData).catch((e) =>
    console.warn("[active_customers] Cache sample write failed:", e)
  );

  return NextResponse.json(sampleData, {
    headers: { "X-Cache": "SAMPLE_PRINT_SHEET", "Cache-Control": "no-cache, no-store, must-revalidate" },
  });
}


