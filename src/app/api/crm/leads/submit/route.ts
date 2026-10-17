import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function parseNumber(val: any): number | null {
  if (val === undefined || val === null || val === "") return null;
  const num = parseFloat(String(val).replace(/[^0-9.-]/g, ""));
  return isNaN(num) ? null : num;
}

function parseDateSafe(val: any): string | null {
  if (!val) return null;
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : (d.toISOString().split("T")[0] ?? null);
}

/**
 * Server-Side Endpoint for Lead Submissions
 * Saves lead directly to Supabase PostgreSQL table (fast, reliable, resilient).
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, name, phoneNumber } = body;

    if (!email && !phoneNumber && !name) {
      return NextResponse.json(
        { success: false, error: "Missing required lead fields (email, phone, or name)" },
        { status: 400 }
      );
    }

    const cleanEmail = email
      ? String(email).trim().toLowerCase()
      : phoneNumber
      ? `phone_${String(phoneNumber).replace(/\D/g, "")}@bhookr.lead`
      : `lead_${Date.now()}@bhookr.lead`;

    const leadSource = body.leadSource || "website";
    const planVal = Array.isArray(body.plan) ? body.plan.join(", ") : (body.plan || null);

    const leadRecord = {
      name: String(name || "Website Lead").trim(),
      email: cleanEmail,
      phone_number: body.phoneNumber ? String(body.phoneNumber).trim() : null,
      age: parseNumber(body.age),
      gender: body.gender || null,
      height: parseNumber(body.height),
      weight: parseNumber(body.weight),
      goal: body.goal || null,
      diet: body.diet || null,
      food_preference: body.foodPreference || null,
      physical_state: body.physicalState || null,
      food_love: body.foodLove || null,
      subscription_type: body.subscriptionType || null,
      plan: planVal,
      subscription_start_date: parseDateSafe(body.subscriptionStartDate),
      status: body.status || "lead",
      last_step_completed: parseNumber(body.lastStepCompleted) || 7,
      checkout_visited: Boolean(body.checkoutVisited),
      utm_source: body.utmSource || null,
      utm_sub_source: body.utmSubSource || null,
      lead_source: leadSource,
      created_at: new Date().toISOString(),
    };

    // Upsert into Supabase (email + lead_source unique constraint)
    const { data, error } = await supabaseAdmin
      .from("leads")
      .upsert(leadRecord, { onConflict: "email,lead_source" })
      .select()
      .single();

    if (error) {
      console.error("[leads/submit] Supabase lead save error:", error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    // Optional background sync to Google Sheet (non-blocking)
    const leadsSheetUrl = process.env.NEXT_PUBLIC_LEADS_SHEET_URL;
    if (leadsSheetUrl) {
      fetch(leadsSheetUrl, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ ...body, email: cleanEmail }),
        redirect: "manual",
        signal: AbortSignal.timeout(5000),
      }).catch((e) => console.warn("[leads/submit] Optional Google sheet forward notice:", e.message));
    }

    return NextResponse.json({
      success: true,
      message: "Lead recorded successfully in Supabase",
      leadId: data?.id,
      email: cleanEmail,
    });
  } catch (error: any) {
    console.error("[leads/submit] Unexpected error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to submit lead" },
      { status: 500 }
    );
  }
}
