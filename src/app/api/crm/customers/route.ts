import { NextRequest, NextResponse } from "next/server";
import { authorizeCrmStaff } from "@/lib/api-auth";
import {
  getCachedData,
  setCachedData,
  isCacheFresh,
  GAS_CACHE_TTL_MS,
} from "@/lib/crm/cache";

export const dynamic = "force-dynamic";

const SAMPLE_SHEET_ROWS = [
  {
    Id: "PS00001",
    name: "Shiva",
    "phone number": "8186939526",
    location: "idly street",
    zone: "lb nagar",
    Status: "Active",
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
  {
    Id: "PS00002",
    name: "Radhika",
    "phone number": "7019194188",
    location: "LB Nagar Main Road",
    zone: "lb nagar",
    Status: "Active",
    Plan: "pro",
    Type: "non-veg",
    Meal: "lunch, dinner",
    goal: "muscle gain",
    Customizations: "no sugar",
    Inspection: "done",
    "Items Total": "578.00",
    "GST (5%)": "28.90",
    DeliveryFee: "99.00",
    TOTAL: "606.90",
  },
  {
    Id: "PS00003",
    name: "Nirmit Patil",
    "phone number": "9082619249",
    location: "Banjara Hills Rd 12",
    zone: "banjara hills",
    Status: "Active",
    Plan: "elite",
    Type: "veg",
    Meal: "bf, lunch, dinner",
    goal: "fitness",
    Customizations: "high protein",
    Inspection: "done",
    "Items Total": "12518.00",
    "GST (5%)": "625.90",
    DeliveryFee: "99.00",
    TOTAL: "13242.90",
  },
  {
    Id: "PS00004",
    name: "Neha Pateriya",
    "phone number": "9834782336",
    location: "Jubilee Hills Check Post",
    zone: "jubilee hills",
    Status: "Active",
    Plan: "standard",
    Type: "veg",
    Meal: "bf",
    goal: "weight loss",
    Customizations: "low carb",
    Inspection: "done",
    "Items Total": "11888.00",
    "GST (5%)": "594.40",
    DeliveryFee: "99.00",
    TOTAL: "12581.40",
  },
  {
    Id: "PS00005",
    name: "Sai Bharadwaj",
    "phone number": "7387954773",
    location: "Madhapur Metro",
    zone: "hitech city",
    Status: "Active",
    Plan: "7 Days",
    Type: "non-veg",
    Meal: "dinner",
    goal: "maintenance",
    Customizations: "no dairy",
    Inspection: "done",
    "Items Total": "1784.00",
    "GST (5%)": "89.20",
    DeliveryFee: "99.00",
    TOTAL: "1972.20",
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

  if (url) {
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
      console.warn("[active_customers] Upstream fetch failed, falling back to sample rows:", err);
    }
  }

  // Fallback response with the sample print sheet structure
  const fallbackData = {
    success: true,
    rows: SAMPLE_SHEET_ROWS,
    total: SAMPLE_SHEET_ROWS.length,
    source: "sample_print_sheet",
  };

  setCachedData("active_customers", fallbackData).catch((e) =>
    console.warn("[active_customers] Cache fallback write failed:", e)
  );

  return NextResponse.json(fallbackData, {
    headers: { "X-Cache": "FALLBACK", "Cache-Control": "private, max-age=0" },
  });
}
