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
        status: data.status as PipelineStatus,
        updatedAt: data.updatedAt,
        updatedBy: data.updatedBy as CrmRole,
        notes: data.notes,
        noteHistory: data.noteHistory ?? [],
        planType: data.planType,
        amount: data.amount,
        paymentMethod: data.paymentMethod,
      };
    });

    return NextResponse.json({ success: true, pipeline });
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

  try {
    const body = await req.json();
    const { action, email, status, role, extras } = body;

    const key = normaliseEmail(email);
    if (!key) {
      return NextResponse.json(
        { success: false, error: "Missing or invalid email" },
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
    // Triggered when telecaller clicks "Done" in the Note modal.
    // New note is appended to noteHistory; `notes` is updated to latest text.
    // Nothing else (status, planType, etc.) is touched.
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

      // If doc has an old plain-string note but no history yet, seed history
      // with that note so Bindu's earlier notes are recovered automatically.
      if (existingHistory.length === 0 && existingData.notes) {
        existingHistory.push({
          text: existingData.notes,
          savedBy: existingData.updatedBy ?? "caller",
          savedAt: existingData.updatedAt ?? new Date().toISOString(),
        });
      }

      existingHistory.push({
        text: newNoteText,
        savedBy: role ?? "caller",
        savedAt: new Date().toISOString(),
      });

      await docRef.set(
        {
          notes: newNoteText,
          noteHistory: existingHistory,
          // Set a default status if the document is brand new
          ...(existingData.status ? {} : { status: "new", updatedBy: role, updatedAt: new Date().toISOString() }),
        },
        { merge: true }
      );

      return NextResponse.json({ success: true });
    }

    // ── STATUS UPDATE ────────────────────────────────────────────────────────
    // Plain status change. Notes and noteHistory are NEVER touched here.
    if (!status || !role) {
      return NextResponse.json(
        { success: false, error: "Missing status or role" },
        { status: 400 }
      );
    }

    const payload: Partial<PipelineEntry> = {
      status: status as PipelineStatus,
      updatedAt: new Date().toISOString(),
      updatedBy: role as CrmRole,
    };

    // Only write conversion-specific fields if explicitly provided.
    // NEVER write notes here — notes are protected from status-change updates.
    if (extras?.planType !== undefined) payload.planType = extras.planType;
    if (extras?.amount !== undefined) payload.amount = extras.amount;
    if (extras?.paymentMethod !== undefined) payload.paymentMethod = extras.paymentMethod;

    // merge: true preserves all existing fields (notes, noteHistory, etc.)
    await docRef.set(payload, { merge: true });

    return NextResponse.json({ success: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed to update pipeline";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
