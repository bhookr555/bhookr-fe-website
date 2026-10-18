import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Normalizes Indian phone number safely.
 * Returns exactly 10-digit mobile number if valid Indian mobile, or trimmed digits if shorter.
 */
export function normalizeIndianPhone(phone: any): string {
  if (phone === null || phone === undefined || phone === "") return "";
  const digits = String(phone).replace(/\D/g, "");
  if (!digits) return "";

  // 12 digits starting with 91 (e.g. +91 9876543210)
  if (digits.length === 12 && digits.startsWith("91")) {
    return digits.slice(2);
  }
  // 11 digits starting with 0 (e.g. 09876543210)
  if (digits.length === 11 && digits.startsWith("0")) {
    return digits.slice(1);
  }
  // 10 digits
  if (digits.length === 10) {
    return digits;
  }
  // Greater than 10 digits (e.g. 00919876543210)
  if (digits.length > 10) {
    return digits.slice(-10);
  }
  return digits;
}

export function normalizeEmail(email: any): string {
  if (!email) return "";
  return String(email).trim().toLowerCase();
}

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

function isPopulated(val: unknown): boolean {
  if (val === null || val === undefined) return false;
  const str = String(val).trim();
  return str !== "" && str !== "—" && str !== "N/A" && str !== "null" && str !== "undefined";
}

/**
 * Server-Side Endpoint for Lead Submissions
 * - Validates incoming data
 * - Normalizes phone and email
 * - Matches canonical customer by:
 *   1. Exact normalized 10-digit phone number
 *   2. Exact normalized email address
 * - Detects identity conflicts (phone belongs to Lead A, email belongs to Lead B)
 * - Merges updates into canonical customer without overwriting non-empty fields with null/empty
 * - Preserves existing status (never resets converted/follow-up back to "lead" or "new")
 * - Guaranteed database write with true success/failure HTTP status
 */
export async function POST(req: NextRequest) {
  const correlationId = `req_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

  try {
    const body = await req.json();
    const { email, name, phoneNumber } = body;

    const normPhone = normalizeIndianPhone(phoneNumber);
    const normEmail = normalizeEmail(email);

    if (!normEmail && !normPhone && !name) {
      return NextResponse.json(
        { success: false, error: "Missing required lead fields (phone number, email, or name)" },
        { status: 400 }
      );
    }

    const cleanEmail = normEmail || (normPhone ? `phone_${normPhone}@bhookr.lead` : `lead_${Date.now()}@bhookr.lead`);
    const cleanName = String(name || "Website Lead").trim();
    const leadSource = body.leadSource || "website";
    const planVal = Array.isArray(body.plan) ? body.plan.join(", ") : (body.plan || null);

    // ── 1. IDENTITY MATCHING ──────────────────────────────────────────────────
    // Search existing leads by normalized phone (if valid 10 digits) or email
    let phoneMatch: any = null;
    let emailMatch: any = null;

    if (normPhone && normPhone.length === 10) {
      // Find by matching phone
      const { data: byPhone, error: phoneErr } = await supabaseAdmin
        .from("leads")
        .select("*")
        .ilike("phone_number", `%${normPhone}%`)
        .order("created_at", { ascending: true })
        .limit(1);

      if (!phoneErr && byPhone && byPhone.length > 0) {
        // Verify normalized phone matches exactly
        const candidateNorm = normalizeIndianPhone(byPhone[0].phone_number);
        if (candidateNorm === normPhone) {
          phoneMatch = byPhone[0];
        }
      }
    }

    if (normEmail && !normEmail.endsWith("@bhookr.lead")) {
      const { data: byEmail, error: emailErr } = await supabaseAdmin
        .from("leads")
        .select("*")
        .ilike("email", normEmail)
        .order("created_at", { ascending: true })
        .limit(1);

      if (!emailErr && byEmail && byEmail.length > 0) {
        emailMatch = byEmail[0];
      }
    }

    // ── 2. IDENTITY CONFLICT DETECTION ────────────────────────────────────────
    let identityConflict = false;
    let canonicalRecord: any = null;

    if (phoneMatch && emailMatch && phoneMatch.id !== emailMatch.id) {
      // Phone points to person A, email points to person B!
      console.warn(`[${correlationId}] Identity conflict detected: phone matched lead ${phoneMatch.id}, email matched lead ${emailMatch.id}`);
      identityConflict = true;
      // Do not merge unsafe conflict: treat phone match as primary canonical record but do not link conflicting email
      canonicalRecord = phoneMatch;
    } else {
      canonicalRecord = phoneMatch || emailMatch || null;
    }

    let resultRecord: any = null;
    let isCreated = false;

    // ── 3. PERSISTENCE: UPDATE OR INSERT ──────────────────────────────────────
    if (canonicalRecord) {
      // EXISTING CANONICAL CUSTOMER: Update non-destructively
      const updatePayload: Record<string, any> = {
        updated_at: new Date().toISOString(),
      };

      // Update name only if incoming is non-empty and current is generic
      if (cleanName && (!canonicalRecord.name || canonicalRecord.name === "Website Lead" || canonicalRecord.name === "Lead")) {
        updatePayload.name = cleanName;
      }

      // Update phone only if missing
      if (!canonicalRecord.phone_number && normPhone) {
        updatePayload.phone_number = normPhone;
      }

      // Update email only if currently missing or synthetic, and no conflict
      if (!identityConflict && normEmail && (!canonicalRecord.email || canonicalRecord.email.endsWith("@bhookr.lead"))) {
        updatePayload.email = normEmail;
      }

      // Preserve non-empty profile values
      if (parseNumber(body.age) !== null && !isPopulated(canonicalRecord.age)) updatePayload.age = parseNumber(body.age);
      if (body.gender && !isPopulated(canonicalRecord.gender)) updatePayload.gender = body.gender;
      if (parseNumber(body.height) !== null && !isPopulated(canonicalRecord.height)) updatePayload.height = parseNumber(body.height);
      if (parseNumber(body.weight) !== null && !isPopulated(canonicalRecord.weight)) updatePayload.weight = parseNumber(body.weight);
      if (body.goal && !isPopulated(canonicalRecord.goal)) updatePayload.goal = body.goal;
      if (body.diet && !isPopulated(canonicalRecord.diet)) updatePayload.diet = body.diet;
      if (body.foodPreference && !isPopulated(canonicalRecord.food_preference)) updatePayload.food_preference = body.foodPreference;
      if (body.physicalState && !isPopulated(canonicalRecord.physical_state)) updatePayload.physical_state = body.physicalState;
      if (body.foodLove && !isPopulated(canonicalRecord.food_love)) updatePayload.food_love = body.foodLove;
      if (body.subscriptionType && !isPopulated(canonicalRecord.subscription_type)) updatePayload.subscription_type = body.subscriptionType;
      if (planVal && !isPopulated(canonicalRecord.plan)) updatePayload.plan = planVal;
      if (body.subscriptionStartDate && !isPopulated(canonicalRecord.subscription_start_date)) {
        updatePayload.subscription_start_date = parseDateSafe(body.subscriptionStartDate);
      }

      // Funnel steps: only advance, never regress
      const incomingStep = parseNumber(body.lastStepCompleted) || 0;
      if (incomingStep > (canonicalRecord.last_step_completed || 0)) {
        updatePayload.last_step_completed = incomingStep;
      }
      if (body.checkoutVisited) {
        updatePayload.checkout_visited = true;
      }

      // Attribution: keep original UTMs if present, else set from incoming
      if (!isPopulated(canonicalRecord.utm_source) && body.utmSource) {
        updatePayload.utm_source = body.utmSource;
      }
      if (!isPopulated(canonicalRecord.utm_sub_source) && body.utmSubSource) {
        updatePayload.utm_sub_source = body.utmSubSource;
      }

      // CRITICAL: NEVER reset an existing converted, follow-up, or in-progress status back to "lead" or "new"
      const PROTECTED_STATUSES = ["converted", "follow_up", "hot_prospect", "trial_requested", "future_prospect", "pending"];
      if (!PROTECTED_STATUSES.includes(canonicalRecord.status)) {
        if (body.status && body.status !== "lead") {
          updatePayload.status = body.status;
        }
      }

      const { data: updated, error: updateErr } = await supabaseAdmin
        .from("leads")
        .update(updatePayload)
        .eq("id", canonicalRecord.id)
        .select()
        .single();

      if (updateErr) {
        console.error(`[${correlationId}] Failed to update canonical lead ${canonicalRecord.id}:`, updateErr);
        return NextResponse.json(
          { success: false, error: "Database update failed: " + updateErr.message },
          { status: 500 }
        );
      }

      resultRecord = updated;
      isCreated = false;
    } else {
      // NEW CUSTOMER: Insert new canonical record
      const newLeadRecord = {
        name: cleanName,
        email: cleanEmail,
        phone_number: normPhone || (phoneNumber ? String(phoneNumber).trim() : null),
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
        last_step_completed: parseNumber(body.lastStepCompleted) || 1,
        checkout_visited: Boolean(body.checkoutVisited),
        utm_source: body.utmSource || null,
        utm_sub_source: body.utmSubSource || null,
        lead_source: leadSource,
        created_at: new Date().toISOString(),
      };

      const { data: inserted, error: insertErr } = await supabaseAdmin
        .from("leads")
        .insert(newLeadRecord)
        .select()
        .single();

      if (insertErr) {
        console.error(`[${correlationId}] Failed to insert new lead:`, insertErr);
        return NextResponse.json(
          { success: false, error: "Database insert failed: " + insertErr.message },
          { status: 500 }
        );
      }

      resultRecord = inserted;
      isCreated = true;
    }

    // Optional background sync to Google Sheet (non-blocking)
    const leadsSheetUrl = process.env.NEXT_PUBLIC_LEADS_SHEET_URL;
    if (leadsSheetUrl) {
      fetch(leadsSheetUrl, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ ...body, email: resultRecord.email, phone: resultRecord.phone_number }),
        redirect: "manual",
        signal: AbortSignal.timeout(5000),
      }).catch((e) => console.warn(`[${correlationId}] Optional Google Sheet forward notice:`, e.message));
    }

    return NextResponse.json({
      success: true,
      message: isCreated ? "Canonical customer created successfully" : "Canonical customer updated successfully",
      canonicalId: resultRecord.id,
      isCreated,
      identityConflict,
      lead: {
        id: resultRecord.id,
        name: resultRecord.name,
        email: resultRecord.email,
        phoneNumber: resultRecord.phone_number,
        status: resultRecord.status,
        createdAt: resultRecord.created_at,
      },
    });
  } catch (error: any) {
    console.error(`[${correlationId}] Unexpected submission error:`, error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to process lead submission" },
      { status: 500 }
    );
  }
}
