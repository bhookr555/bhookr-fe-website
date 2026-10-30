import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { supabaseAdmin } from "@/lib/supabase/server";
import { normalizeSheetStatus, type PipelineEntry, type PipelineStatus } from "@/lib/crm/pipeline";
import type { CrmRole } from "@/lib/crm/auth";
import { authorizeCrmStaff } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

function normaliseEmail(email: string): string {
  return String(email ?? "").toLowerCase().trim();
}

/**
 * GET /api/crm/pipeline
 * Fetch all status mappings from Firestore + Supabase leads table (includes noteHistory)
 */
export async function GET(req: NextRequest) {
  const authStatus = await authorizeCrmStaff(req);
  if (!authStatus.authorized) {
    return NextResponse.json(
      { success: false, error: authStatus.error || "Forbidden" },
      { status: 403 }
    );
  }

  const pipeline: Record<string, PipelineEntry> = {};

  // 1. Fetch from Firestore crm_pipeline collection (if initialized)
  if (adminDb) {
    try {
      const snapshot = await adminDb.collection("crm_pipeline").get();
      snapshot.docs.forEach((doc) => {
        const data = doc.data();
        pipeline[doc.id] = {
          email: doc.id,
          leadId: data.leadId,
          status: data.status as PipelineStatus,
          updatedAt: data.updatedAt,
          updatedBy: data.updatedBy as CrmRole,
          notes: data.notes,
          noteHistory: data.noteHistory ?? [],
          statusHistory: data.statusHistory ?? [],
          planType: data.planType,
          amount: data.amount,
          paymentMethod: data.paymentMethod,
        };
      });
    } catch (fbErr) {
      console.warn("[pipeline API] Firestore read warning:", fbErr);
    }
  }

  // 2. Fetch persistent lead statuses directly from Supabase PostgreSQL storage
  try {
    const { data: sbLeads, error: sbErr } = await supabaseAdmin
      .from("leads")
      .select("id, email, phone_number, status, updated_at")
      .not("status", "is", null);

    if (!sbErr && sbLeads) {
      sbLeads.forEach((row: any) => {
        const norm = normalizeSheetStatus(row.status) || (row.status as PipelineStatus);
        if (!norm) return;

        const entryFromSb: PipelineEntry = {
          email: row.email || (row.id ? `lead_${row.id}` : ""),
          leadId: row.id,
          status: norm,
          updatedAt: row.updated_at || new Date().toISOString(),
          updatedBy: "caller" as CrmRole,
        };

        // Index by lead ID
        if (row.id) {
          const cur = pipeline[row.id];
          if (!cur) {
            pipeline[row.id] = entryFromSb;
          } else if (norm !== "new" && (!cur.status || cur.status === "new")) {
            cur.status = norm;
          }
        }

        // Index by normalized email
        if (row.email && !row.email.endsWith("@bhookr.lead")) {
          const eKey = row.email.toLowerCase().trim();
          const cur = pipeline[eKey];
          if (!cur) {
            pipeline[eKey] = entryFromSb;
          } else if (norm !== "new" && (!cur.status || cur.status === "new")) {
            cur.status = norm;
          }
        }

        // Index by 10-digit phone
        if (row.phone_number) {
          const digits = String(row.phone_number).replace(/\D/g, "");
          if (digits.length >= 10) {
            const pKey = `phone_${digits.slice(-10)}`;
            const cur = pipeline[pKey];
            if (!cur) {
              pipeline[pKey] = entryFromSb;
            } else if (norm !== "new" && (!cur.status || cur.status === "new")) {
              cur.status = norm;
            }
          }
        }
      });
    }
  } catch (sbErr) {
    console.warn("[pipeline API] Supabase leads status read warning:", sbErr);
  }

  return NextResponse.json(
    { success: true, pipeline },
    { headers: { "Cache-Control": "private, no-cache, no-store, must-revalidate" } }
  );
}

/**
 * POST /api/crm/pipeline
 * Upsert or delete a status mapping in Supabase and Firestore.
 */
export async function POST(req: NextRequest) {
  const authStatus = await authorizeCrmStaff(req);
  if (!authStatus.authorized) {
    return NextResponse.json(
      { success: false, error: authStatus.error || "Forbidden" },
      { status: 403 }
    );
  }

  // Server-side Role Check: Auditors are strictly READ-ONLY
  const staffRole = (authStatus.role || "").toLowerCase();
  if (staffRole === "auditor") {
    return NextResponse.json(
      { success: false, error: "Auditors have read-only access. You cannot update lead status or notes." },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const { action, email, leadId, status, role, extras } = body;

    const callerRole = (role || staffRole || "telecaller") as CrmRole;
    if (callerRole === "auditor") {
      return NextResponse.json(
        { success: false, error: "Auditor role cannot modify pipeline" },
        { status: 403 }
      );
    }

    // Determine primary document key (UUID / lead row ID preferred, then email, then phone)
    const rawLeadId = String(leadId || extras?.leadId || "").trim();
    const rawInput = String(email ?? "").trim();
    let key = "";

    if (rawLeadId) {
      key = rawLeadId;
    } else if (rawInput.startsWith("phone_")) {
      key = rawInput.toLowerCase();
    } else if (rawInput.includes("@")) {
      key = rawInput.toLowerCase();
    } else {
      const digits = rawInput.replace(/\D/g, "");
      if (digits.length >= 10) {
        key = `phone_${digits.slice(-10)}`;
      } else if (rawInput) {
        key = rawInput.toLowerCase();
      }
    }

    if (!key && !rawLeadId) {
      return NextResponse.json(
        { success: false, error: "Missing or invalid lead identifier (leadId, email, or phone)" },
        { status: 400 }
      );
    }

    const nowIso = new Date().toISOString();

    // ── 1. DELETE ACTION ─────────────────────────────────────────────────────
    if (action === "delete") {
      if (rawLeadId) {
        await supabaseAdmin
          .from("leads")
          .update({ status: "new", updated_at: nowIso })
          .eq("id", rawLeadId);
      }
      if (adminDb && key) {
        await adminDb.collection("crm_pipeline").doc(key).delete();
      }
      return NextResponse.json({ success: true, savedTo: "supabase" });
    }

    // ── 2. SAVE NOTE ACTION (append-only) ────────────────────────────────────
    if (action === "saveNote" || extras?.appendNote === true) {
      const newNoteText: string = (extras?.notes ?? "").trim();
      if (!newNoteText) {
        return NextResponse.json(
          { success: false, error: "Note text cannot be empty" },
          { status: 400 }
        );
      }

      if (adminDb && key) {
        const docRef = adminDb.collection("crm_pipeline").doc(key);
        const existing = await docRef.get();
        const existingData = existing.exists ? existing.data()! : {};
        const existingHistory: Array<{ text: string; savedBy: string; savedAt: string }> =
          existingData.noteHistory ?? [];

        if (existingHistory.length === 0 && existingData.notes) {
          existingHistory.push({
            text: existingData.notes,
            savedBy: existingData.updatedBy ?? "caller",
            savedAt: existingData.updatedAt ?? nowIso,
          });
        }

        existingHistory.push({
          text: newNoteText,
          savedBy: callerRole,
          savedAt: nowIso,
        });

        await docRef.set(
          {
            leadId: rawLeadId || existingData.leadId || null,
            email: existingData.email || (rawInput.includes("@") ? rawInput.toLowerCase() : null),
            notes: newNoteText,
            noteHistory: existingHistory,
            ...(existingData.status ? {} : { status: "new", updatedBy: callerRole, updatedAt: nowIso }),
          },
          { merge: true }
        );
      }

      return NextResponse.json({ success: true, savedTo: "supabase_and_firebase" });
    }

    // ── 3. STATUS UPDATE ACTION ──────────────────────────────────────────────
    if (!status) {
      return NextResponse.json(
        { success: false, error: "Missing status" },
        { status: 400 }
      );
    }

    // 3A. PRIMARY WRITE: Update Supabase leads table directly
    let supabaseUpdated = false;
    try {
      const updatePayload: { status: string; updated_at: string } = {
        status: status,
        updated_at: nowIso,
      };

      if (rawLeadId) {
        const { error: sbErr } = await supabaseAdmin
          .from("leads")
          .update(updatePayload)
          .eq("id", rawLeadId);
        if (!sbErr) supabaseUpdated = true;
      } else {
        const targetEmail = key.includes("@") ? key : extras?.email;
        const targetPhone = extras?.phone || (key.startsWith("phone_") ? key.replace("phone_", "") : "");

        if (targetEmail && !targetEmail.endsWith("@bhookr.lead")) {
          const { error: sbErr } = await supabaseAdmin
            .from("leads")
            .update(updatePayload)
            .ilike("email", targetEmail);
          if (!sbErr) supabaseUpdated = true;
        } else if (targetPhone) {
          const digits = String(targetPhone).replace(/\D/g, "").slice(-10);
          const { error: sbErr } = await supabaseAdmin
            .from("leads")
            .update(updatePayload)
            .ilike("phone_number", `%${digits}%`);
          if (!sbErr) supabaseUpdated = true;
        }
      }
    } catch (sbErr) {
      console.warn("[pipeline API] Supabase status update warning:", sbErr);
    }

    // 3B. AUDIT TRAIL: Update Firestore crm_pipeline (if initialized)
    if (adminDb && key) {
      try {
        const docRef = adminDb.collection("crm_pipeline").doc(key);
        const existing = await docRef.get();
        const existingData = existing.exists ? existing.data()! : {};
        const existingStatusHistory: Array<{ status: string; changedBy: string; changedAt: string }> =
          existingData.statusHistory ?? [];

        if (existingStatusHistory.length === 0 && existingData.status) {
          existingStatusHistory.push({
            status: existingData.status,
            changedBy: existingData.updatedBy || "caller",
            changedAt: existingData.updatedAt || nowIso,
          });
        }

        existingStatusHistory.push({
          status: status,
          changedBy: callerRole,
          changedAt: nowIso,
        });

        const payload: Partial<PipelineEntry> = {
          leadId: rawLeadId || existingData.leadId || undefined,
          email: existingData.email || (rawInput.includes("@") ? rawInput.toLowerCase() : undefined),
          status: status as PipelineStatus,
          updatedAt: nowIso,
          updatedBy: callerRole,
          statusHistory: existingStatusHistory as any,
        };

        if (extras?.planType !== undefined) payload.planType = extras.planType;
        if (extras?.amount !== undefined) payload.amount = extras.amount;
        if (extras?.paymentMethod !== undefined) payload.paymentMethod = extras.paymentMethod;

        await docRef.set(payload, { merge: true });
      } catch (fbErr) {
        console.warn("[pipeline API] Firestore audit trail update warning:", fbErr);
      }
    }

    // 3C. Forward status update to Google Sheets Apps Script (async fire-and-forget)
    const leadsUrl = process.env.NEXT_PUBLIC_LEADS_SHEET_URL;
    if (leadsUrl && status) {
      const sheetPayload = {
        email: key.includes("@") ? key : extras?.email || "",
        phoneNumber: extras?.phone || (key.startsWith("phone_") ? key.replace("phone_", "") : ""),
        status: status,
      };
      fetch(leadsUrl, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(sheetPayload),
        redirect: "follow",
      }).catch((err) => console.warn("[pipeline API] Google Sheet status sync warning:", err));
    }

    return NextResponse.json({
      success: true,
      savedTo: "supabase",
      status,
      leadId: rawLeadId || null,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed to update pipeline";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
