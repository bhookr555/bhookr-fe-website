import { NextRequest, NextResponse } from "next/server";
import { authorizeCrmStaff } from "@/lib/api-auth";
import { supabaseAdmin } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// Format a Supabase row into the UI-compatible customer object
function formatCustomerRow(row: Record<string, any>) {
  return {
    id: row.id,
    "DELIVERY CODE": row.delivery_code,
    NAME: row.name,
    MOBILE: row.mobile || "",
    LOCATION: row.location || "",
    ZONE: row.zone || "ZONE 1",
    STATUS: row.status || "NORMAL",
    PLAN: row.plan || "",
    TYPE: row.type || "",
    MEAL: row.meal || "",
    GOAL: row.goal || "",
    CUSTOMIZATION: row.customization || "",
    INSPECTION: row.inspection || "",
    "RECIPE ID": row.recipe_id || "",
    is_manual: Boolean(row.is_manual),
    // camelCase aliases for convenience
    deliveryCode: row.delivery_code,
    name: row.name,
    mobile: row.mobile || "",
    location: row.location || "",
    zone: row.zone || "ZONE 1",
    status: row.status || "NORMAL",
    plan: row.plan || "",
    type: row.type || "",
    meal: row.meal || "",
    goal: row.goal || "",
    customization: row.customization || "",
    inspection: row.inspection || "",
    recipeId: row.recipe_id || "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function GET(req: NextRequest) {
  const authStatus = await authorizeCrmStaff(req);
  if (!authStatus.authorized) {
    return NextResponse.json(
      { success: false, error: authStatus.error || "Forbidden", rows: [], total: 0 },
      { status: 403 }
    );
  }

  try {
    const { data, error, count } = await supabaseAdmin
      .from("customers")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[active_customers] Supabase query error:", error);
      return NextResponse.json(
        { success: false, error: error.message, rows: [], total: 0 },
        { status: 500 }
      );
    }

    const rows = (data || []).map(formatCustomerRow);

    return NextResponse.json(
      {
        success: true,
        rows,
        total: count ?? rows.length,
        source: "supabase",
      },
      {
        headers: {
          "X-Database": "Supabase",
          "Cache-Control": "no-cache, no-store, must-revalidate",
        },
      }
    );
  } catch (err: any) {
    console.error("[active_customers] Unexpected error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to fetch customers", rows: [], total: 0 },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const authStatus = await authorizeCrmStaff(req);
  if (!authStatus.authorized) {
    return NextResponse.json({ success: false, error: authStatus.error || "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();

    const deliveryCode =
      body["DELIVERY CODE"] || body.deliveryCode || `BDC_MANUAL_${Date.now()}`;
    const name = body["NAME"] || body.name || "Customer";

    const customerRecord = {
      delivery_code: String(deliveryCode).trim().toUpperCase(),
      name: String(name).trim(),
      mobile: String(body["MOBILE"] || body.mobile || "").trim(),
      location: String(body["LOCATION"] || body.location || "").trim(),
      zone: String(body["ZONE"] || body.zone || "ZONE 1").trim(),
      status: String(body["STATUS"] || body.status || "PRIORITY").trim(),
      plan: String(body["PLAN"] || body.plan || "ELITE").trim(),
      type: String(body["TYPE"] || body.type || "VEG").trim(),
      meal: String(body["MEAL"] || body.meal || "BF").trim(),
      goal: String(body["GOAL"] || body.goal || "WEIGHT LOSS").trim(),
      customization: String(body["CUSTOMIZATION"] || body.customization || "YES").trim(),
      inspection: String(body["INSPECTION"] || body.inspection || "DONE").trim(),
      recipe_id: String(body["RECIPE ID"] || body.recipeId || "—").trim(),
      is_manual: true,
    };

    // Upsert directly into Supabase
    const { data, error } = await supabaseAdmin
      .from("customers")
      .upsert(customerRecord, { onConflict: "delivery_code" })
      .select()
      .single();

    if (error) {
      console.error("[active_customers] Supabase insert error:", error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    const formatted = formatCustomerRow(data || customerRecord);

    // Optional: background fire-and-forget sync to Google Sheet if configured
    const url = process.env.NEXT_PUBLIC_ACTIVE_CUSTOMERS_SHEET_URL;
    if (url) {
      const email = `${String(name).toLowerCase().replace(/[^a-z0-9]/g, "")}@bhookr.com`;
      fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "addCustomer",
          email,
          ...formatted,
        }),
        redirect: "follow",
      }).catch((err) => console.warn("[active_customers] Optional Google sheet sync notice:", err.message));
    }

    return NextResponse.json({
      success: true,
      message: "Customer saved successfully to Supabase.",
      customer: formatted,
    });
  } catch (error: any) {
    console.error("[active_customers] Error adding customer:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
