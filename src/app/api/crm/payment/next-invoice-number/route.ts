import { NextRequest, NextResponse } from "next/server";
import { authorizeCrmStaff } from "@/lib/api-auth";
import { adminDb } from "@/lib/firebase/admin";
import logger from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const startTime = Date.now();

  try {
    // 1. Authorization
    const authStatus = await authorizeCrmStaff(req);
    if (!authStatus.authorized) {
      logger.warn("[CRM API] Unauthorized access attempt to GET next-invoice-number");
      return NextResponse.json(
        { success: false, error: authStatus.error || "Forbidden" },
        { status: 403 }
      );
    }

    if (!adminDb) {
      return NextResponse.json(
        { success: false, error: "Firebase Admin not initialized" },
        { status: 500 }
      );
    }

    logger.info("[CRM API] Getting next invoice number", {
      staffRole: authStatus.role,
    });

    // 2. Fetch the counter
    const counterDoc = await adminDb.collection("metadata").doc("invoice_counter").get();
    
    let nextInvoiceNumber = 571; // Default starting sequence number
    
    if (counterDoc.exists) {
      const data = counterDoc.data();
      if (data && typeof data.lastNumber === "number") {
        nextInvoiceNumber = data.lastNumber + 1;
      }
    }

    logger.info("[CRM API] Next invoice number previewed", {
      nextInvoiceNumber,
      duration: Date.now() - startTime,
    });

    return NextResponse.json({
      success: true,
      nextInvoiceNumber,
    });
  } catch (error) {
    logger.error("[CRM API] Failed to get next invoice number", error as Error, {
      duration: Date.now() - startTime,
    });

    const msg = error instanceof Error ? error.message : "Failed to get next invoice number";
    return NextResponse.json(
      { success: false, error: msg },
      { status: 500 }
    );
  }
}
