import { NextRequest, NextResponse } from "next/server";
import { authorizeCrmStaff } from "@/lib/api-auth";
import {
  getCachedData,
  setCachedData,
  isCacheFresh,
  GAS_CACHE_TTL_MS,
} from "@/lib/crm/cache";

export const dynamic = "force-dynamic";

// Exact row layout from Google Sheet 1QGOfVihcDcaEhVJMn960zM0u0cenSyw_DHPYy6hE38E ("Sample print sheet")
const SAMPLE_PRINT_SHEET_ROWS = [
  {
    Id: "PS00001",
    name: "Shiva",
    "phone number": "8186939526",
    location: "idly street",
    zone: "lb nagar",
    Status: "Priority / Active",
    Plan: "elite",
    Type: "veg",
    Meal: "bf",
    goal: "weight loss",
    Customizations: "yes",
    Inspection: "done",
    "Items Total": "578.00",
    "GST (5%)": "28.90",
    DeliveryFee: "99.00",
    TOTAL: "606.90",
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

  // Check cache
  const cached = await getCachedData("active_customers");
  if (!forceRefresh && isCacheFresh(cached?.cachedAt, GAS_CACHE_TTL_MS)) {
    return NextResponse.json(cached!.data, {
      headers: { "X-Cache": "HIT", "Cache-Control": "private, max-age=0" },
    });
  }

  const url = process.env.NEXT_PUBLIC_ACTIVE_CUSTOMERS_SHEET_URL;
  const subsUrl = process.env.NEXT_PUBLIC_SUBSCRIPTIONS_SHEET_URL;

  // Only fetch from upstream if URL is configured AND is not the old subscriptions sheet URL
  if (url && url !== subsUrl) {
    try {
      const upstream = await fetch(`${url}?action=list`, {
        method: "GET",
        cache: "no-store",
        signal: AbortSignal.timeout(12_000),
        redirect: "follow",
      });

      if (upstream.ok) {
        const data = await upstream.json();
        if (data && Array.isArray(data.rows) && data.rows.length > 0) {
          setCachedData("active_customers", data).catch((e) =>
            console.warn("[active_customers] Cache write failed:", e)
          );
          return NextResponse.json(data, {
            headers: { "X-Cache": "MISS", "Cache-Control": "private, max-age=0" },
          });
        }
      }
    } catch (err) {
      console.warn("[active_customers] Upstream fetch failed, serving sample print sheet:", err);
    }
  }

  // Strictly serve sample print sheet data matching 1QGOfVihcDcaEhVJMn960zM0u0cenSyw_DHPYy6hE38E
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
    headers: { "X-Cache": "SAMPLE_PRINT_SHEET", "Cache-Control": "private, max-age=0" },
  });
}

