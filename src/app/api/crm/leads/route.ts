import { NextRequest, NextResponse } from "next/server";
import { authorizeCrmStaff } from "@/lib/api-auth";
import { supabaseAdmin } from "@/lib/supabase/server";
import type { LeadRow } from "@/lib/crm/leads";

export const dynamic = "force-dynamic";

function mapSupabaseLeadToLeadRow(row: Record<string, any>): LeadRow {
  return {
    id: row.id,
    sessionId: row.session_id,
    timestamp: row.created_at,
    name: row.name || "Lead",
    email: row.email || "",
    phoneNumber: row.phone_number || "",
    age: row.age ?? "",
    gender: row.gender || "",
    height: row.height ?? "",
    weight: row.weight ?? "",
    goal: row.goal || "",
    diet: row.diet || "",
    foodPreference: row.food_preference || "",
    physicalState: row.physical_state || "",
    subscriptionType: row.subscription_type || "",
    plan: row.plan || "",
    subscriptionStartDate: row.subscription_start_date || "",
    status: row.status || "lead",
    lastStepCompleted: row.last_step_completed ?? 0,
    totalSteps: row.total_steps ?? 9,
    formStatus: row.form_status || (row.last_step_completed >= 8 || row.checkout_visited ? "completed" : "partial"),
    isRepeat: Boolean(row.is_repeat),
    firstLeadId: row.first_lead_id || null,
    address: row.address || "",
    city: row.city || "",
    state: row.state || "",
    pinCode: row.pin_code || "",
    checkoutVisited: Boolean(row.checkout_visited),
    utmSource: row.utm_source || "",
    utmSubSource: row.utm_sub_source || "",
    foodLove: row.food_love || "",
    leadSource: (row.lead_source as "website" | "client_form") || "website",
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
      .from("leads")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[leads API] Supabase query error:", error);
      return NextResponse.json(
        { success: false, error: error.message, rows: [], total: 0 },
        { status: 500 }
      );
    }

    const rows: LeadRow[] = (data || []).map(mapSupabaseLeadToLeadRow);

    const websiteCount = rows.filter((r) => r.leadSource === "website").length;
    const clientFormCount = rows.filter((r) => r.leadSource === "client_form").length;

    return NextResponse.json(
      {
        success: true,
        rows,
        total: count ?? rows.length,
        meta: {
          websiteLeadsCount: websiteCount,
          clientFormLeadsCount: clientFormCount,
          deduplicatedTotal: rows.length,
          source: "supabase",
        },
      },
      {
        headers: {
          "X-Database": "Supabase",
          "Cache-Control": "private, max-age=0, must-revalidate",
        },
      }
    );
  } catch (err: any) {
    console.error("[leads API] Error querying Supabase leads:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to query leads", rows: [], total: 0 },
      { status: 500 }
    );
  }
}
