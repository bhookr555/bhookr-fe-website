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
 * Non-blocking background sync to Google Sheet with retry
 */
async function syncToGoogleSheetWithRetry(payload: Record<string, any>, maxRetries = 2) {
  const url = process.env.NEXT_PUBLIC_LEADS_SHEET_URL;
  if (!url) return;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload),
        redirect: "manual",
        signal: AbortSignal.timeout(6000),
      });
      if (res.ok || res.status === 302 || res.status === 307) {
        return;
      }
      console.warn(`[GoogleSheetSync] Attempt ${attempt} returned status ${res.status}`);
    } catch (err: any) {
      console.warn(`[GoogleSheetSync] Attempt ${attempt} failed: ${err.message}`);
    }
    if (attempt < maxRetries) {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
}

/**
 * Server-Side Endpoint for Lead Submissions
 * 1. Upserts into Supabase `leads` table using session_id as the primary key.
 * 2. Saves partial steps immediately without requiring phone/email upfront.
 * 3. Never merges or deletes duplicates. Accurately flags repeats when matching an earlier session.
 * 4. Forwards data to Google Sheet with background retries (never stops Supabase save).
 */
export async function POST(req: NextRequest) {
  const correlationId = `lead_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

  try {
    let body: any = {};
    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      body = await req.json();
    } else {
      const text = await req.text();
      try {
        body = JSON.parse(text);
      } catch {
        body = {};
      }
    }

    const leadId = String(body.leadId || body.id || "").trim();
    const sessionId = String(body.sessionId || body.session_id || "").trim() || `sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const phoneNumberRaw = body.phoneNumber || body.phone;
    const normPhone = normalizeIndianPhone(phoneNumberRaw);
    const normEmail = normalizeEmail(body.email);
    const cleanName = String(body.name || body.fullName || "").trim();
    const leadSource = body.leadSource || "website";
    const planVal = Array.isArray(body.plan) ? body.plan.join(", ") : (body.plan || null);
    const stepNum = parseNumber(body.lastStepCompleted) || 1;
    const totalSteps = parseNumber(body.totalSteps) || 9;
    const isCompleted = body.formStatus === "completed" || stepNum >= 8 || Boolean(body.checkoutVisited);
    const formStatus = isCompleted ? "completed" : (body.formStatus || "partial");

    // Address fields
    const address = body.address || null;
    const city = body.city || null;
    const state = body.state || null;
    const pinCode = body.pinCode || body.pin_code || null;

    // ── 1. CHECK EXISTING ROW FOR THIS PERSON / SESSION ───────────────────────
    let existingSessionLead: any = null;

    // Strategy 1: Check by direct leadId if client already has a record ID
    if (leadId) {
      const { data: idMatch } = await supabaseAdmin
        .from("leads")
        .select("*")
        .eq("id", leadId)
        .order("created_at", { ascending: false })
        .limit(1);

      if (idMatch && idMatch.length > 0) {
        existingSessionLead = idMatch[0];
      }
    }

    // Strategy 2: Check by session_id (if column exists)
    if (!existingSessionLead && sessionId) {
      const { data: sessionMatch, error: sessionErr } = await supabaseAdmin
        .from("leads")
        .select("*")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: false })
        .limit(1);

      if (!sessionErr && sessionMatch && sessionMatch.length > 0) {
        existingSessionLead = sessionMatch[0];
      } else {
        const { data: fallbackMatch } = await supabaseAdmin
          .from("leads")
          .select("*")
          .eq("utm_sub_source", `sess:${sessionId}`)
          .order("created_at", { ascending: false })
          .limit(1);

        if (fallbackMatch && fallbackMatch.length > 0) {
          existingSessionLead = fallbackMatch[0];
        }
      }
    }

    // Strategy 3: Check by phone or email within recent session window (last 24 hours)
    // This connects steps 1, 2, 3, etc. for the SAME person even if sessionId wasn't saved or visitor had UTM tags!
    if (!existingSessionLead && (normEmail || normPhone)) {
      const orConds: string[] = [];
      if (normEmail && !normEmail.endsWith("@bhookr.lead")) {
        orConds.push(`email.ilike.${normEmail}`);
      }
      if (normPhone && normPhone.length === 10) {
        orConds.push(`phone_number.ilike.%${normPhone}%`);
      }
      if (orConds.length > 0) {
        const { data: recentMatches } = await supabaseAdmin
          .from("leads")
          .select("*")
          .or(orConds.join(","))
          .order("created_at", { ascending: false })
          .limit(10);

        if (recentMatches && recentMatches.length > 0) {
          const now = Date.now();
          // Find the most recent lead within last 24 hours for this person
          const sameSession = recentMatches.find((r: any) => {
            const ageHours = (now - new Date(r.created_at).getTime()) / (1000 * 60 * 60);
            return ageHours < 24;
          });
          if (sameSession) {
            existingSessionLead = sameSession;
          }
        }
      }
    }

    // ── 2. REPEAT DETECTION (Cross-session matching) ──────────────────────────
    // A lead is a repeat when an earlier lead from a DIFFERENT session_id has the same
    // phone (last 10 digits) or email (lowercase, trimmed).
    let isRepeat = false;
    let firstLeadId: string | null = null;

    if ((normPhone && normPhone.length === 10) || (normEmail && !normEmail.endsWith("@bhookr.lead"))) {
      let query = supabaseAdmin
        .from("leads")
        .select("id, created_at, phone_number, email, utm_sub_source")
        .order("created_at", { ascending: true });

      const orConditions: string[] = [];
      if (normPhone && normPhone.length === 10) {
        orConditions.push(`phone_number.ilike.%${normPhone}%`);
      }
      if (normEmail && !normEmail.endsWith("@bhookr.lead")) {
        orConditions.push(`email.ilike.${normEmail}`);
      }

      if (orConditions.length > 0) {
        const { data: candidateMatches } = await query.or(orConditions.join(",")).limit(20);

        if (candidateMatches && candidateMatches.length > 0) {
          const exactMatches = candidateMatches.filter((m: any) => {
            if (sessionId) {
              if (m.session_id && m.session_id === sessionId) return false;
              if (m.utm_sub_source === `sess:${sessionId}`) return false;
            }
            if (existingSessionLead && m.id === existingSessionLead.id) return false;
            const mPhone = normalizeIndianPhone(m.phone_number);
            const mEmail = normalizeEmail(m.email);
            const matchByPhone = normPhone && normPhone.length === 10 && mPhone === normPhone;
            const matchByEmail = normEmail && !normEmail.endsWith("@bhookr.lead") && mEmail === normEmail;
            return matchByPhone || matchByEmail;
          });

          if (exactMatches.length > 0 && exactMatches[0]) {
            exactMatches.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
            isRepeat = true;
            firstLeadId = exactMatches[0]?.id || null;
          }
        }
      }
    } else if (existingSessionLead) {
      // Preserve existing repeat flags if contact info not changed
      isRepeat = Boolean(existingSessionLead.is_repeat);
      firstLeadId = existingSessionLead.first_lead_id || null;
    }

    // ── 3. SAVE / UPSERT INTO SUPABASE ───────────────────────────────────────
    let resultRecord: any = null;
    let isCreated = false;

    if (existingSessionLead) {
      // UPDATE existing row for this session
      const updatePayload: Record<string, any> = {
        updated_at: new Date().toISOString(),
        last_step_completed: Math.max(existingSessionLead.last_step_completed || 0, stepNum),
        total_steps: totalSteps,
        form_status: formStatus,
        is_repeat: isRepeat,
        first_lead_id: firstLeadId,
      };

      if (cleanName) updatePayload.name = cleanName;
      if (normEmail) updatePayload.email = normEmail;
      if (normPhone || phoneNumberRaw) updatePayload.phone_number = normPhone || String(phoneNumberRaw);
      if (parseNumber(body.age) !== null) updatePayload.age = parseNumber(body.age);
      if (isPopulated(body.gender)) updatePayload.gender = body.gender;
      if (parseNumber(body.height) !== null) updatePayload.height = parseNumber(body.height);
      if (parseNumber(body.weight) !== null) updatePayload.weight = parseNumber(body.weight);
      if (isPopulated(body.goal)) updatePayload.goal = body.goal;
      if (isPopulated(body.diet)) updatePayload.diet = body.diet;
      if (isPopulated(body.foodPreference)) updatePayload.food_preference = body.foodPreference;
      if (isPopulated(body.physicalState)) updatePayload.physical_state = body.physicalState;
      if (isPopulated(body.foodLove)) updatePayload.food_love = body.foodLove;
      if (isPopulated(body.subscriptionType)) updatePayload.subscription_type = body.subscriptionType;
      if (isPopulated(planVal)) updatePayload.plan = planVal;
      if (isPopulated(body.subscriptionStartDate)) {
        updatePayload.subscription_start_date = parseDateSafe(body.subscriptionStartDate);
      }
      if (body.checkoutVisited) updatePayload.checkout_visited = true;
      if (isPopulated(address)) updatePayload.address = address;
      if (isPopulated(city)) updatePayload.city = city;
      if (isPopulated(state)) updatePayload.state = state;
      if (isPopulated(pinCode)) updatePayload.pin_code = pinCode;
      if (body.leadSource) updatePayload.lead_source = body.leadSource;
      if (body.utmSource) updatePayload.utm_source = body.utmSource;
      if (body.utmSubSource) {
        updatePayload.utm_sub_source = body.utmSubSource;
      } else if (!existingSessionLead.session_id && sessionId && !existingSessionLead.utm_sub_source) {
        updatePayload.utm_sub_source = `sess:${sessionId}`;
      }

      // Never reset pipeline statuses back to "lead"
      const PROTECTED_STATUSES = ["converted", "follow_up", "hot_prospect", "trial_requested", "future_prospect", "pending"];
      if (!PROTECTED_STATUSES.includes(existingSessionLead.status)) {
        if (body.status && body.status !== "lead") {
          updatePayload.status = body.status;
        }
      }

      // Safe update with fallback if certain columns haven't migrated yet
      let { data: updated, error: updateErr } = await supabaseAdmin
        .from("leads")
        .update(updatePayload)
        .eq("id", existingSessionLead.id)
        .select()
        .single();

      if (updateErr && updateErr.message?.includes("column")) {
        console.warn(`[${correlationId}] Retrying update without extended columns:`, updateErr.message);
        const fallbackPayload = { ...updatePayload };
        delete fallbackPayload.total_steps;
        delete fallbackPayload.form_status;
        delete fallbackPayload.is_repeat;
        delete fallbackPayload.first_lead_id;
        delete fallbackPayload.address;
        delete fallbackPayload.city;
        delete fallbackPayload.state;
        delete fallbackPayload.pin_code;
        const fallbackRes = await supabaseAdmin
          .from("leads")
          .update(fallbackPayload)
          .eq("id", existingSessionLead.id)
          .select()
          .single();
        updated = fallbackRes.data;
        updateErr = fallbackRes.error;
      }

      if (updateErr) {
        console.error(`[${correlationId}] Failed to update lead ${existingSessionLead.id}:`, updateErr);
        return NextResponse.json(
          { success: false, error: "Database update failed: " + updateErr.message },
          { status: 500 }
        );
      }

      resultRecord = updated || existingSessionLead;
      isCreated = false;
    } else {
      // INSERT new lead row for this session
      const newLeadRecord: Record<string, any> = {
        session_id: sessionId,
        name: cleanName || "Lead",
        email: normEmail || (normPhone ? `phone_${normPhone}@bhookr.lead` : `lead_${Date.now()}@bhookr.lead`),
        phone_number: normPhone || (phoneNumberRaw ? String(phoneNumberRaw).trim() : null),
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
        last_step_completed: stepNum,
        total_steps: totalSteps,
        form_status: formStatus,
        is_repeat: isRepeat,
        first_lead_id: firstLeadId,
        address: address,
        city: city,
        state: state,
        pin_code: pinCode,
        checkout_visited: Boolean(body.checkoutVisited),
        utm_source: body.utmSource || null,
        utm_sub_source: body.utmSubSource || null,
        lead_source: leadSource,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      let { data: inserted, error: insertErr } = await supabaseAdmin
        .from("leads")
        .upsert(newLeadRecord, { onConflict: "session_id" })
        .select()
        .single();

      if (insertErr && (insertErr.message?.includes("column") || insertErr.message?.includes("session_id"))) {
        console.warn(`[${correlationId}] Retrying insert with legacy schema fallback:`, insertErr.message);
        const fallbackInsert = { ...newLeadRecord };
        delete fallbackInsert.session_id;
        delete fallbackInsert.total_steps;
        delete fallbackInsert.form_status;
        delete fallbackInsert.is_repeat;
        delete fallbackInsert.first_lead_id;
        delete fallbackInsert.address;
        delete fallbackInsert.city;
        delete fallbackInsert.state;
        delete fallbackInsert.pin_code;
        if (sessionId && !fallbackInsert.utm_sub_source) {
          fallbackInsert.utm_sub_source = `sess:${sessionId}`;
        }
        let fbRes = await supabaseAdmin
          .from("leads")
          .insert(fallbackInsert)
          .select()
          .single();
        inserted = fbRes.data;
        insertErr = fbRes.error;

        // If leads_email_source_unique constraint violated before migration is run, retry with repeat lead_source
        if (insertErr && insertErr.message?.includes("leads_email_source_unique")) {
          console.warn(`[${correlationId}] Retrying insert with repeat lead source:`, insertErr.message);
          const repeatInsert = { ...fallbackInsert, lead_source: `website_repeat_${Date.now()}` };
          const repRes = await supabaseAdmin.from("leads").insert(repeatInsert).select().single();
          inserted = repRes.data;
          insertErr = repRes.error;
        }
      } else if (insertErr && insertErr.message?.includes("leads_email_source_unique")) {
        console.warn(`[${correlationId}] Retrying insert with repeat lead source:`, insertErr.message);
        const repeatInsert = { ...newLeadRecord, lead_source: `website_repeat_${Date.now()}` };
        const repRes = await supabaseAdmin.from("leads").insert(repeatInsert).select().single();
        inserted = repRes.data;
        insertErr = repRes.error;
      }

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

    // ── 4. FORWARD TO GOOGLE SHEET (Non-blocking with retry) ───────────────────
    const formattedAddress = [
      resultRecord.address || address,
      resultRecord.city || city,
      resultRecord.state || state,
      resultRecord.pin_code || pinCode,
    ].filter(Boolean).join(", ");

    const otherDetailsParts = [
      resultRecord.goal ? `Goal: ${resultRecord.goal}` : "",
      resultRecord.diet ? `Diet: ${resultRecord.diet}` : "",
      resultRecord.food_preference ? `Pref: ${resultRecord.food_preference}` : "",
      resultRecord.plan ? `Plan: ${resultRecord.plan}` : "",
      resultRecord.subscription_type ? `Duration: ${resultRecord.subscription_type}` : "",
      resultRecord.age ? `Age: ${resultRecord.age}` : "",
      resultRecord.gender ? `Gender: ${resultRecord.gender}` : "",
    ].filter(Boolean).join(" | ");

    const howFarText = formStatus === "completed" || (resultRecord.last_step_completed || stepNum) >= 8 || resultRecord.checkout_visited
      ? "Completed"
      : `Step ${resultRecord.last_step_completed || stepNum} of ${totalSteps}`;

    const sheetPayload = {
      action: "upsertLead",
      sessionId: resultRecord.session_id || sessionId,
      date: new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
      name: resultRecord.name || "",
      phone: resultRecord.phone_number || "",
      email: resultRecord.email || "",
      address: formattedAddress,
      otherDetails: otherDetailsParts,
      howFarTheyGot: howFarText,
      filledBefore: isRepeat ? "Yes" : "No",
      // Legacy compatibility
      phoneNumber: resultRecord.phone_number || "",
      lastStepCompleted: resultRecord.last_step_completed || stepNum,
      plan: resultRecord.plan || "",
      status: resultRecord.status || "lead",
    };

    // Fire non-blocking forward to Google Sheet
    syncToGoogleSheetWithRetry(sheetPayload).catch((e) =>
      console.warn(`[${correlationId}] Google Sheet sync notice:`, e.message)
    );

    return NextResponse.json({
      success: true,
      message: isCreated ? "Lead recorded successfully" : "Lead updated successfully",
      canonicalId: resultRecord.id,
      sessionId: resultRecord.session_id || sessionId,
      isCreated,
      isRepeat,
      firstLeadId,
      lead: {
        id: resultRecord.id,
        sessionId: resultRecord.session_id || sessionId,
        name: resultRecord.name,
        email: resultRecord.email,
        phoneNumber: resultRecord.phone_number,
        status: resultRecord.status,
        lastStepCompleted: resultRecord.last_step_completed,
        totalSteps: resultRecord.total_steps || totalSteps,
        formStatus: resultRecord.form_status || formStatus,
        isRepeat,
        firstLeadId,
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
