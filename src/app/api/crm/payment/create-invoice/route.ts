import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authorizeCrmStaff } from "@/lib/api-auth";
import { adminDb } from "@/lib/firebase/admin";
import logger from "@/lib/logger";
import { createRazorpayInvoice } from "@/lib/payment/razorpay";

export const dynamic = "force-dynamic";

const createInvoiceSchema = z.object({
  email: z.string().email("Invalid email address"),
  name: z.string().min(1, "Customer name is required"),
  phone: z.string().optional(),
  invoiceNumber: z.string().optional(),
  description: z.string().min(1, "Description is required"),
  planType: z.string().default("custom"),
  amount: z.number().positive("Amount must be positive").min(1, "Minimum amount is ₹1"),
  deliveryCharge: z.number().nonnegative().optional(),
  issueDate: z.string().optional(),
  expiryDate: z.string().optional(),
  billingAddress: z.object({
    line1: z.string().min(1, "Billing address line 1 is required"),
    line2: z.string().optional(),
    city: z.string().min(1, "City is required"),
    state: z.string().min(1, "State is required"),
    zipcode: z.string().regex(/^\d{6}$/, "Invalid 6-digit PIN code"),
  }),
});

export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    // 1. Authorization
    const authStatus = await authorizeCrmStaff(req);
    if (!authStatus.authorized) {
      logger.warn("[CRM API] Unauthorized access attempt to create-invoice");
      return NextResponse.json(
        { success: false, error: authStatus.error || "Forbidden" },
        { status: 403 }
      );
    }

    // 2. Parse request body
    const body = await req.json();
    const validatedData = createInvoiceSchema.parse(body);

    logger.info("[CRM API] Creating Razorpay Invoice", {
      staffRole: authStatus.role,
      targetEmail: validatedData.email,
      amount: validatedData.amount,
    });

    let invoiceNumberToUse = validatedData.invoiceNumber?.trim() || "";

    // 3. Sequential numbering & Counter sync in Firestore
    if (adminDb) {
      if (!invoiceNumberToUse) {
        const counterRef = adminDb.collection("metadata").doc("invoice_counter");
        await adminDb.runTransaction(async (transaction) => {
          const counterDoc = await transaction.get(counterRef);
          let lastNumber = 570; // Default base sequence
          if (counterDoc.exists) {
            const data = counterDoc.data();
            if (data && typeof data.lastNumber === "number") {
              lastNumber = data.lastNumber;
            }
          }
          const nextNumber = lastNumber + 1;
          invoiceNumberToUse = String(nextNumber);
          transaction.set(counterRef, { lastNumber: nextNumber }, { merge: true });
        });
      } else {
        const customVal = parseInt(invoiceNumberToUse, 10);
        if (!isNaN(customVal) && String(customVal) === invoiceNumberToUse) {
          const counterRef = adminDb.collection("metadata").doc("invoice_counter");
          const counterDoc = await counterRef.get();
          let lastNumber = 570;
          if (counterDoc.exists) {
            const data = counterDoc.data();
            if (data && typeof data.lastNumber === "number") {
              lastNumber = data.lastNumber;
            }
          }
          if (customVal > lastNumber) {
            await counterRef.set({ lastNumber: customVal }, { merge: true });
          }
        }
      }
    }

    // 4. Create and Issue Razorpay Invoice
    const result = await createRazorpayInvoice({
      email: validatedData.email,
      name: validatedData.name,
      phone: validatedData.phone || "",
      invoiceNumber: invoiceNumberToUse,
      description: validatedData.description,
      planType: validatedData.planType,
      amount: validatedData.amount,
      deliveryCharge: validatedData.deliveryCharge,
      issueDate: validatedData.issueDate || undefined,
      expiryDate: validatedData.expiryDate || undefined,
      billingAddress: validatedData.billingAddress,
    });

    logger.info("[CRM API] Razorpay invoice created and issued successfully", {
      invoiceId: result.id,
      invoiceNumber: result.invoiceNumber,
      shortUrl: result.shortUrl,
      duration: Date.now() - startTime,
    });

    return NextResponse.json({
      success: true,
      id: result.id,
      invoiceNumber: result.invoiceNumber,
      shortUrl: result.shortUrl,
    });
  } catch (error) {
    logger.error("[CRM API] Failed to create invoice", error as Error, {
      duration: Date.now() - startTime,
    });

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }

    let msg = "Failed to create invoice";
    if (error instanceof Error) {
      msg = error.message;
    }
    const rzpErr = error as any;
    if (rzpErr.error?.description) {
      msg = rzpErr.error.description;
    } else if (rzpErr.description) {
      msg = rzpErr.description;
    }

    return NextResponse.json(
      { success: false, error: msg },
      { status: 500 }
    );
  }
}
