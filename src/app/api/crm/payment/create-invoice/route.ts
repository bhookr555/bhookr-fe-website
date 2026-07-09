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
  discount: z.number().nonnegative().optional(),
  issueDate: z.string().optional(),
  expiryDate: z.string().optional(),
  lineItems: z.array(
    z.object({
      name: z.string().min(1, "Item name is required"),
      rate: z.number().nonnegative("Rate must be non-negative"),
      taxRate: z.number().nonnegative("Tax rate must be non-negative"),
    })
  ).min(1, "At least one line item is required"),
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

    logger.info("[CRM API] Creating Razorpay Invoice with dynamic line items", {
      staffRole: authStatus.role,
      targetEmail: validatedData.email,
      itemsCount: validatedData.lineItems.length,
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

    // 4. Auto-fill address details from historical Firestore records (orders or subscriptions)
    let line1 = "N/A - Meal Subscription Customer";
    let line2 = "";
    let city = "Hyderabad";
    let state = "Telangana";
    let zipcode = "500092";

    if (adminDb) {
      logger.info("[CRM API] Searching database for customer address details", { email: validatedData.email });
      
      // Look up orders first
      const ordersSnap = await adminDb.collection("orders")
        .where("customerEmail", "==", validatedData.email)
        .limit(1)
        .get();

      if (!ordersSnap.empty && ordersSnap.docs[0]) {
        const orderData = ordersSnap.docs[0].data();
        if (orderData?.deliveryAddress) {
          const addr = orderData.deliveryAddress;
          line1 = addr.address || line1;
          city = addr.city || city;
          state = addr.state || state;
          zipcode = addr.pinCode || zipcode;
          logger.info("[CRM API] Address recovered from previous order records", { zipcode });
        }
      } else {
        // Look up subscriptions next
        const subsSnap = await adminDb.collection("subscriptions")
          .where("email", "==", validatedData.email)
          .limit(1)
          .get();

        if (!subsSnap.empty && subsSnap.docs[0]) {
          const subData = subsSnap.docs[0].data();
          if (subData?.address) {
            line1 = subData.address;
            const zipMatch = subData.address.match(/\b\d{6}\b/);
            if (zipMatch) zipcode = zipMatch[0];
            logger.info("[CRM API] Address recovered from previous subscription records", { zipcode });
          }
        }
      }
    }

    // 5. Convert frontend line items list to Razorpay API format (including discount subtraction on the first item)
    const razorpayLineItems = validatedData.lineItems.map((item, idx) => {
      let rateAfterDiscount = item.rate;
      
      if (idx === 0 && validatedData.discount && validatedData.discount > 0) {
        rateAfterDiscount = Math.max(0, rateAfterDiscount - validatedData.discount);
      }

      const rzpItem: any = {
        name: item.name,
        amount: Math.round(rateAfterDiscount * 100), // in paise
        currency: 'INR',
        quantity: 1,
      };

      if (item.taxRate > 0) {
        rzpItem.tax_rate = String(item.taxRate) + ".00";
      }

      return rzpItem;
    });

    const firstItemName = validatedData.lineItems[0]?.name || "Meal Subscription";
    const planType = firstItemName.toLowerCase().includes("elite") ? "elite" : "custom";

    // 6. Create and Issue Razorpay Invoice
    const result = await createRazorpayInvoice({
      email: validatedData.email,
      name: validatedData.name,
      phone: validatedData.phone || "",
      invoiceNumber: invoiceNumberToUse,
      description: firstItemName,
      planType,
      issueDate: validatedData.issueDate || undefined,
      expiryDate: validatedData.expiryDate || undefined,
      billingAddress: {
        line1,
        line2: line2 || undefined,
        city,
        state,
        zipcode,
      },
      lineItems: razorpayLineItems,
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
