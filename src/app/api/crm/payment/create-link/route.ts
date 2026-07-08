import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authorizeCrmStaff } from "@/lib/api-auth";
import logger from "@/lib/logger";
import { createRazorpayPaymentLink } from "@/lib/payment/razorpay";

export const dynamic = "force-dynamic";

const createLinkSchema = z.object({
  email: z.string().email("Invalid email address"),
  name: z.string().optional(),
  phone: z.string().optional(),
  amount: z.number().positive("Amount must be positive").min(1, "Minimum amount is ₹1"),
  planType: z.string().default("custom"),
  description: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    // 1. Authorization
    const authStatus = await authorizeCrmStaff(req);
    if (!authStatus.authorized) {
      logger.warn("[CRM API] Unauthorized access attempt to create-link");
      return NextResponse.json(
        { success: false, error: authStatus.error || "Forbidden" },
        { status: 403 }
      );
    }

    // 2. Parse request body
    const body = await req.json();
    const validatedData = createLinkSchema.parse(body);

    const description = validatedData.description || `Fresh meals subscription plan: ${validatedData.planType}`;

    logger.info("[CRM API] Creating Razorpay payment link", {
      staffRole: authStatus.role,
      targetEmail: validatedData.email,
      amount: validatedData.amount,
    });

    // 3. Create payment link
    const result = await createRazorpayPaymentLink({
      email: validatedData.email,
      name: validatedData.name || "Customer",
      phone: validatedData.phone || "",
      amount: validatedData.amount,
      description,
      planType: validatedData.planType,
    });

    logger.info("[CRM API] Razorpay payment link created successfully", {
      targetEmail: validatedData.email,
      duration: Date.now() - startTime,
    });

    return NextResponse.json({
      success: true,
      id: result.id,
      shortUrl: result.shortUrl,
    });
  } catch (error) {
    logger.error("[CRM API] Failed to create payment link", error as Error, {
      duration: Date.now() - startTime,
    });

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }

    const msg = error instanceof Error ? error.message : "Failed to create payment link";
    return NextResponse.json(
      { success: false, error: msg },
      { status: 500 }
    );
  }
}
