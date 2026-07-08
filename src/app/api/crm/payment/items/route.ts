import { NextRequest, NextResponse } from "next/server";
import { authorizeCrmStaff } from "@/lib/api-auth";
import logger from "@/lib/logger";
import { fetchRazorpayItems } from "@/lib/payment/razorpay";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const startTime = Date.now();

  try {
    // 1. Authorization
    const authStatus = await authorizeCrmStaff(req);
    if (!authStatus.authorized) {
      logger.warn("[CRM API] Unauthorized access attempt to GET crm/payment/items");
      return NextResponse.json(
        { success: false, error: authStatus.error || "Forbidden" },
        { status: 403 }
      );
    }

    logger.info("[CRM API] Fetching Razorpay items catalog", {
      staffRole: authStatus.role,
    });

    // 2. Fetch items
    const items = await fetchRazorpayItems();

    logger.info("[CRM API] Razorpay items fetched successfully", {
      count: items.length,
      duration: Date.now() - startTime,
    });

    return NextResponse.json({
      success: true,
      items,
    });
  } catch (error) {
    logger.error("[CRM API] Failed to fetch items", error as Error, {
      duration: Date.now() - startTime,
    });

    const msg = error instanceof Error ? error.message : "Failed to fetch catalog items";
    return NextResponse.json(
      { success: false, error: msg },
      { status: 500 }
    );
  }
}
