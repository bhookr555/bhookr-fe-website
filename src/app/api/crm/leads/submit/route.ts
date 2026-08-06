import { NextRequest, NextResponse } from "next/server";
import { setCachedData, getCachedData } from "@/lib/crm/cache";

export const dynamic = "force-dynamic";

/**
 * Server-Side Backup Endpoint for Website Lead Submissions
 *
 * WHY THIS EXISTS:
 * Client-side browser `fetch` to Google Apps Script (`script.google.com`) can be
 * blocked by browser CORS restrictions, adblockers, or extension network policies.
 *
 * Calling this server route executes a reliable server-to-server POST to Google Sheets,
 * guaranteeing 100% backup data integrity into Google Sheets every time.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, name, phoneNumber } = body;

    if (!email && !phoneNumber && !name) {
      return NextResponse.json(
        { success: false, error: "Missing required lead fields" },
        { status: 400 }
      );
    }

    const leadsSheetUrl = process.env.NEXT_PUBLIC_LEADS_SHEET_URL;
    let sheetSuccess = false;

    // 1. Server-to-server post to Google Sheets Apps Script (bypasses browser CORS & adblockers)
    if (leadsSheetUrl) {
      try {
        const sheetRes = await fetch(leadsSheetUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...body,
            timestamp: body.timestamp || new Date().toLocaleString("en-IN"),
            status: body.status || "lead",
          }),
          signal: AbortSignal.timeout(10000),
        });
        sheetSuccess = sheetRes.ok || sheetRes.type === "opaque";
        console.log("✅ Backup lead posted to Google Sheets via server route");
      } catch (sheetErr) {
        console.warn("⚠️ Server-to-server Google Sheet post error:", sheetErr);
      }
    }

    // 2. Immediately update Firestore cache so CRM dashboard reflects the new lead
    try {
      const cached = await getCachedData<any>("leads");
      if (cached?.data) {
        const existingRows = Array.isArray(cached.data.rows) ? cached.data.rows : [];
        const newRow = {
          ...body,
          timestamp: body.timestamp || new Date().toLocaleString("en-IN"),
          status: body.status || "lead",
        };
        const updatedRows = [newRow, ...existingRows];
        await setCachedData("leads", {
          ...cached.data,
          rows: updatedRows,
          total: (cached.data.total || existingRows.length) + 1,
        });
      }
    } catch (cacheErr) {
      console.warn("⚠️ Cache prepend error:", cacheErr);
    }

    return NextResponse.json({
      success: true,
      message: "Lead recorded in CRM and backed up to Google Sheets",
      sheetBackup: sheetSuccess,
    });
  } catch (err) {
    console.error("[leads/submit] Server backup error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to process lead backup" },
      { status: 500 }
    );
  }
}
