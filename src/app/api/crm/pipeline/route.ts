import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import type { PipelineEntry, PipelineStatus } from "@/lib/crm/pipeline";
import type { CrmRole } from "@/lib/crm/auth";
import { authorizeCrmStaff } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

function normaliseEmail(email: string): string {
  return String(email ?? "").toLowerCase().trim();
}

/**
 * GET /api/crm/pipeline
 * Fetch all status mappings from Firestore (includes noteHistory)
 */
export async function GET(req: NextRequest) {
  const authStatus = await authorizeCrmStaff(req);
  if (!authStatus.authorized) {
    return NextResponse.json(
      { success: false, error: authStatus.error || "Forbidden" },
      { status: 403 }
    );
  }

  if (!adminDb) {
    return NextResponse.json(
      { success: false, error: "Firebase Admin not initialized (Missing environment variables)" },
      { status: 200 }
    );
  }

  try {
    const snapshot = await adminDb.collection("crm_pipeline").get();
    const pipeline: Record<string, PipelineEntry> = {};

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

    return NextResponse.json(
      { success: true, pipeline },
      { headers: { "Cache-Control": "private, no-cache, no-store, must-revalidate" } }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed to load pipeline";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

/**
 * POST /api/crm/pipeline
 * Upsert or delete a status mapping.
 *
 * NOTES PROTECTION RULES:
 * - A status-only update NEVER touches the notes / noteHistory fields.
 * - action === "saveNote" appends a new entry to noteHistory and updates
 *   the top-level `notes` field. Notes are NEVER blanked by status updates.
 */
export async function POST(req: NextRequest) {
  const authStatus = await authorizeCrmStaff(req);
  if (!authStatus.authorized) {
    return NextResponse.json(
      { success: false, error: authStatus.error || "Forbidden" },
      { status: 403 }
    );
  }

  if (!adminDb) {
    return NextResponse.json(
      { success: false, error: "Firebase Admin not initialized (Missing environment variables)" },
      { status: 200 }
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

    if (!key) {
      return NextResponse.json(
        { success: false, error: "Missing or invalid lead identifier (leadId, email, or phone)" },
        { status: 400 }
      );
    }

    const docRef = adminDb.collection("crm_pipeline").doc(key);

    // ── DELETE ───────────────────────────────────────────────────────────────
    if (action === "delete") {
      await docRef.delete();
      return NextResponse.json({ success: true });
    }

    // ── NOTE SAVE (append-only) ──────────────────────────────────────────────
    if (action === "saveNote" || extras?.appendNote === true) {
      const newNoteText: string = (extras?.notes ?? "").trim();
      if (!newNoteText) {
        return NextResponse.json(
          { success: false, error: "Note text cannot be empty" },
          { status: 400 }
        );
      }

      // Read existing doc to safely merge history
      const existing = await docRef.get();
      const existingData = existing.exists ? existing.data()! : {};
      const existingHistory: Array<{ text: string; savedBy: string; savedAt: string }> =
        existingData.noteHistory ?? [];

      if (existingHistory.length === 0 && existingData.notes) {
        existingHistory.push({
          text: existingData.notes,
          savedBy: existingData.updatedBy ?? "caller",
          savedAt: existingData.updatedAt ?? new Date().toISOString(),
        });
      }

      existingHistory.push({
        text: newNoteText,
        savedBy: callerRole,
        savedAt: new Date().toISOString(),
      });

      await docRef.set(
        {
          leadId: rawLeadId || existingData.leadId || null,
          email: existingData.email || (rawInput.includes("@") ? rawInput.toLowerCase() : null),
          notes: newNoteText,
          noteHistory: existingHistory,
          // Set a default status if the document is brand new
          ...(existingData.status ? {} : { status: "new", updatedBy: callerRole, updatedAt: new Date().toISOString() }),
        },
        { merge: true }
      );

      return NextResponse.json({ success: true });
    }

    // ── STATUS UPDATE ────────────────────────────────────────────────────────
    if (!status) {
      return NextResponse.json(
        { success: false, error: "Missing status" },
        { status: 400 }
      );
    }

    // Read existing doc to record status change history
    const existing = await docRef.get();
    const existingData = existing.exists ? existing.data()! : {};
    const existingStatusHistory: Array<{ status: string; changedBy: string; changedAt: string }> =
      existingData.statusHistory ?? [];

    if (existingStatusHistory.length === 0 && existingData.status) {
      existingStatusHistory.push({
        status: existingData.status,
        changedBy: existingData.updatedBy || "caller",
        changedAt: existingData.updatedAt || new Date().toISOString(),
      });
    }

    const nowIso = new Date().toISOString();
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

    // Directly update Supabase leads table so status change is recorded in PostgreSQL
    try {
      const { supabaseAdmin } = await import("@/lib/supabase/server");

      if (rawLeadId) {
        // Exact lead row update by ID!
        await supabaseAdmin
          .from("leads")
          .update({ status: status, updated_at: nowIso })
          .eq("id", rawLeadId);
      } else {
        const targetEmail = key.includes("@") ? key : extras?.email;
        const targetPhone = extras?.phone || (key.startsWith("phone_") ? key.replace("phone_", "") : "");

        if (targetEmail) {
          await supabaseAdmin
            .from("leads")
            .update({ status: status, updated_at: nowIso })
            .ilike("email", targetEmail);
        } else if (targetPhone) {
          await supabaseAdmin
            .from("leads")
            .update({ status: status, updated_at: nowIso })
            .ilike("phone_number", `%${targetPhone}%`);
        }
      }
    } catch (sbErr) {
      console.warn("[pipeline API] Supabase status update warning:", sbErr);
    }

    // Forward status update to Google Sheets Apps Script if configured
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

    return NextResponse.json({ success: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed to update pipeline";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
