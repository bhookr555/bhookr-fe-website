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
 * Fetch all status mappings from Firestore
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
 * Upsert or delete a status mapping
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

    if (action === "delete") {
      await docRef.delete();
      return NextResponse.json({ success: true });
    }

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

    if (extras?.notes !== undefined) payload.notes = extras.notes;
    if (extras?.planType !== undefined) payload.planType = extras.planType;
    if (extras?.amount !== undefined) payload.amount = extras.amount;
    if (extras?.paymentMethod !== undefined) payload.paymentMethod = extras.paymentMethod;

    // Use merge to preserve any existing notes/fields if not explicitly passed
    await docRef.set(payload, { merge: true });

    return NextResponse.json({ success: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed to update pipeline";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
