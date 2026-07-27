import { NextRequest, NextResponse } from "next/server";
import { authorizeCrmStaff } from "@/lib/api-auth";
import logger from "@/lib/logger";

export const dynamic = "force-dynamic";

/**
 * GET /api/crm/payment/invoices
 * Fetches all invoices from Razorpay using their REST API.
 * Uses Basic Auth with key_id:key_secret (same keys the SDK uses).
 */
export async function GET(req: NextRequest) {
  try {
    const authStatus = await authorizeCrmStaff(req);
    if (!authStatus.authorized) {
      return NextResponse.json(
        { success: false, error: authStatus.error || "Forbidden" },
        { status: 403 }
      );
    }

    const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      return NextResponse.json(
        { success: false, error: "Razorpay keys not configured" },
        { status: 500 }
      );
    }

    const basicAuth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");

    // Fetch up to 100 most recent invoices
    const url = "https://api.razorpay.com/v1/invoices?count=100";

    const response = await fetch(url, {
      headers: {
        Authorization: `Basic ${basicAuth}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error("[CRM API] Razorpay invoices fetch failed", new Error(errorText));
      return NextResponse.json(
        { success: false, error: `Razorpay API error: ${response.status}` },
        { status: 502 }
      );
    }

    const data = await response.json();
    const invoices = data.items || [];

    logger.info("[CRM API] Fetched Razorpay invoices", { count: invoices.length });

    return NextResponse.json({ success: true, invoices });
  } catch (error) {
    logger.error("[CRM API] Failed to fetch invoices", error as Error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch invoices" },
      { status: 500 }
    );
  }
}
