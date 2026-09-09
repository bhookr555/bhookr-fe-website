import { NextRequest, NextResponse } from "next/server";
import { authorizeCrmStaff } from "@/lib/api-auth";
import {
  getCachedData,
  setCachedData,
  isCacheFresh,
} from "@/lib/crm/cache";
import { adminDb } from "@/lib/firebase/admin";

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
    const cached = await getCachedData("active_customers_v9");
    if (isCacheFresh(cached?.cachedAt, ACTIVE_CUSTOMERS_CACHE_TTL_MS)) {
      return NextResponse.json(cached!.data, {
        headers: { "X-Cache": "HIT", "Cache-Control": "no-cache, no-store, must-revalidate" },
      });
    }
  }

  const url = process.env.NEXT_PUBLIC_ACTIVE_CUSTOMERS_SHEET_URL;

  let mergedRows = [...SAMPLE_PRINT_SHEET_ROWS];
  let isSample = true;

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
          const firstRow = data.rows[0];
          // Strictly ensure this response comes from the Sample Print Sheet format
          const isSamplePrintFormat =
            firstRow["DELIVERY CODE"] !== undefined ||
            firstRow["DELIVERY_CODE"] !== undefined ||
            firstRow["Delivery Code"] !== undefined ||
            firstRow["RECIPE ID"] !== undefined ||
            firstRow["RECIPE_ID"] !== undefined;

          if (isSamplePrintFormat) {
            mergedRows = data.rows;
            isSample = false;
          }
        }
      }
    } catch (err) {
      console.warn("[active_customers] Upstream fetch failed, serving sample print sheet:", err);
    }
  }

  // Fetch manually added customers from Firestore
  try {
    if (adminDb) {
      const snapshot = await adminDb.collection("crm_manual_customers").get();
      if (!snapshot.empty) {
        const manualRows = snapshot.docs.map(doc => doc.data());
        // Merge manual customers at the beginning so they appear at the top
        mergedRows = [...manualRows, ...mergedRows];
      }
    }
  } catch (dbError) {
    console.warn("[active_customers] Failed to fetch manual customers from Firestore:", dbError);
  }

  const responseData = {
    success: true,
    rows: mergedRows,
    total: mergedRows.length,
    source: isSample ? "sample_print_sheet_plus_manual" : "live_sheet_plus_manual",
  };

  setCachedData("active_customers_v9", responseData).catch((e) =>
    console.warn("[active_customers] Cache write failed:", e)
  );

  return NextResponse.json(responseData, {
    headers: { "X-Cache": isSample ? "SAMPLE_PRINT_SHEET" : "MISS", "Cache-Control": "no-cache, no-store, must-revalidate" },
  });
}

export async function POST(req: NextRequest) {
  const authStatus = await authorizeCrmStaff(req);
  if (!authStatus.authorized) {
    return NextResponse.json({ success: false, error: authStatus.error || "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    
    // Save to Firestore so it persists immediately
    if (adminDb) {
      const deliveryCode = body["DELIVERY CODE"] || `BDC_MANUAL_${Date.now()}`;
      await adminDb.collection("crm_manual_customers").doc(deliveryCode).set({
        ...body,
        _createdAt: new Date().toISOString()
      });
    }

    const url = process.env.NEXT_PUBLIC_ACTIVE_CUSTOMERS_SHEET_URL;

    if (url) {
      // Pass data directly to Apps Script backend. No CORS so we just assume it succeeds.
      // We don't await this so it doesn't block the UI if Google timeout is long.
      fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        mode: "no-cors",
      }).catch(err => console.warn("[active_customers] Google sheet sync failed:", err));
    }

    // Invalidate the cache to ensure the next GET fetches the newly added customer from Firestore
    await setCachedData("active_customers_v9", null);

    return NextResponse.json({ success: true, message: "Customer added successfully." });
  } catch (error: any) {
    console.error("[active_customers] Error adding customer:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}



