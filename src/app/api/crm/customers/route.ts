import { NextRequest, NextResponse } from "next/server";
import { authorizeCrmStaff } from "@/lib/api-auth";
import {
  getCachedData,
  setCachedData,
  invalidateCache,
  isCacheFresh,
} from "@/lib/crm/cache";
import { adminDb } from "@/lib/firebase/admin";

export const dynamic = "force-dynamic";

// Short cache TTL (3 seconds) for super fast sync from Google Sheets
const ACTIVE_CUSTOMERS_CACHE_TTL_MS = 3 * 1000;

// In-memory fallback array for manual additions (survives within hot server process even if DB fails)
const inMemoryManualCustomers: Record<string, any>[] = [];

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
    if (cached?.data && isCacheFresh(cached.cachedAt, ACTIVE_CUSTOMERS_CACHE_TTL_MS)) {
      return NextResponse.json(cached.data, {
        headers: { "X-Cache": "HIT", "Cache-Control": "no-cache, no-store, must-revalidate" },
      });
    }
  }

  const url = process.env.NEXT_PUBLIC_ACTIVE_CUSTOMERS_SHEET_URL;

  let mergedRows: Record<string, any>[] = [...SAMPLE_PRINT_SHEET_ROWS];
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
  let dbManualRows: Record<string, any>[] = [];
  try {
    if (adminDb) {
      const snapshot = await adminDb.collection("crm_manual_customers").get();
      if (!snapshot.empty) {
        dbManualRows = snapshot.docs.map((doc) => doc.data());
      }
    }
  } catch (dbError) {
    console.warn("[active_customers] Failed to fetch manual customers from Firestore:", dbError);
  }

  // Combine Firestore manual rows with in-memory fallback manual rows, deduplicating by DELIVERY CODE
  const manualMap = new Map<string, Record<string, any>>();
  for (const r of [...dbManualRows, ...inMemoryManualCustomers]) {
    const code = r["DELIVERY CODE"] || r["DELIVERY_CODE"] || r["Delivery Code"] || r.id;
    if (code && !manualMap.has(code)) {
      manualMap.set(code, r);
    }
  }
  const combinedManualRows = Array.from(manualMap.values());

  // Filter out any duplicates between manual rows and sheet rows
  const existingSheetCodes = new Set(
    mergedRows.map((r: Record<string, any>) => r["DELIVERY CODE"] || r["DELIVERY_CODE"] || r["Delivery Code"])
  );
  const uniqueManualRows = combinedManualRows.filter(
    (r: Record<string, any>) => !existingSheetCodes.has(r["DELIVERY CODE"] || r["DELIVERY_CODE"] || r["Delivery Code"])
  );

  // Prepend manual customers so they always appear at top
  mergedRows = [...uniqueManualRows, ...mergedRows];

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

    const deliveryCode = body["DELIVERY CODE"] || body.deliveryCode || `BDC_MANUAL_${Date.now()}`;
    const name = body["NAME"] || body.name || "Customer";

    const manualRow = {
      "DELIVERY CODE": deliveryCode,
      NAME: name,
      MOBILE: body["MOBILE"] || body.mobile || "",
      LOCATION: body["LOCATION"] || body.location || "",
      ZONE: body["ZONE"] || body.zone || "ZONE 1",
      STATUS: body["STATUS"] || body.status || "PRIORITY",
      PLAN: body["PLAN"] || body.plan || "ELITE",
      TYPE: body["TYPE"] || body.type || "VEG",
      MEAL: body["MEAL"] || body.meal || "BF",
      GOAL: body["GOAL"] || body.goal || "WEIGHT LOSS",
      CUSTOMIZATION: body["CUSTOMIZATION"] || body.customization || "YES",
      INSPECTION: body["INSPECTION"] || body.inspection || "DONE",
      "RECIPE ID": body["RECIPE ID"] || body.recipeId || "—",
      _createdAt: new Date().toISOString(),
    };

    // Save to in-memory store immediately
    inMemoryManualCustomers.unshift(manualRow);

    // Save to Firestore so it persists across server restarts
    if (adminDb) {
      try {
        await adminDb.collection("crm_manual_customers").doc(deliveryCode).set(manualRow);
      } catch (dbErr) {
        console.warn("[active_customers] Firestore save error:", dbErr);
      }
    }

    // Invalidate the cache to ensure next GET returns the new customer row
    await invalidateCache("active_customers_v9");

    // Forward to Google Sheet Apps Script backend
    const url = process.env.NEXT_PUBLIC_ACTIVE_CUSTOMERS_SHEET_URL;

    if (url) {
      const email = `${String(name).toLowerCase().replace(/[^a-z0-9]/g, "")}@bhookr.com`;
      const gasPayload = {
        action: "addCustomer",
        email: email,
        name: name,
        mobile: manualRow.MOBILE,
        phone: manualRow.MOBILE,
        location: manualRow.LOCATION,
        zone: manualRow.ZONE,
        status: manualRow.STATUS,
        plan: manualRow.PLAN,
        type: manualRow.TYPE,
        meal: manualRow.MEAL,
        goal: manualRow.GOAL,
        customization: manualRow.CUSTOMIZATION,
        inspection: manualRow.INSPECTION,
        recipeId: manualRow["RECIPE ID"],
        deliveryCode: deliveryCode,
        ...manualRow,
      };

      fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(gasPayload),
        redirect: "follow",
      }).catch((err) => console.warn("[active_customers] Google sheet sync failed:", err));
    }

    return NextResponse.json({ success: true, message: "Customer added successfully.", customer: manualRow });
  } catch (error: any) {
    console.error("[active_customers] Error adding customer:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}



