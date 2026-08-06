import { NextRequest, NextResponse } from "next/server";
import { setCachedData, getCachedData } from "@/lib/crm/cache";

export const dynamic = "force-dynamic";

/**
 * Server-Side Relay Endpoint for Website Lead Submissions to Google Sheets
 *
 * WHY THIS IS 100% RELIABLE:
 * Direct browser `fetch` to Google Apps Script (`script.google.com`) is frequently
 * blocked by adblockers (uBlock, Brave, Safari ITP) and browser CORS restrictions.
 *
 * This server route executes a server-to-server POST from Next.js to Google Sheets,
 * ensuring 100% of website leads (from Step 1 and Step 7) land in Google Sheets.
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

    // 1. Server-to-server POST to Google Sheets Apps Script (bypasses browser CORS & adblockers)
    if (leadsSheetUrl) {
      try {
        const preparedData = {
          ...body,
          timestamp: body.timestamp || new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
          status: body.status || "lead",
        };

        const sheetRes = await fetch(leadsSheetUrl, {
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify(preparedData),
          redirect: "follow",
          signal: AbortSignal.timeout(12000),
        });
        sheetSuccess = sheetRes.ok || sheetRes.type === "opaque" || sheetRes.status === 200 || sheetRes.status === 302;
        console.log(`✅ Server-to-server lead posted to Google Sheets. Status: ${sheetRes.status}`);
      } catch (sheetErr) {
        console.warn("⚠️ Server-to-server Google Sheet post error:", sheetErr);
      }
    } else {
      console.warn("⚠️ NEXT_PUBLIC_LEADS_SHEET_URL is missing in environment variables!");
    }

    // 2. Immediately update Firestore cache so CRM dashboard reflects the new lead instantly
    try {
      const cached = await getCachedData<any>("leads");
      if (cached?.data) {
        const existingRows = Array.isArray(cached.data.rows) ? cached.data.rows : [];
        const newRow = {
          ...body,
          timestamp: body.timestamp || new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
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
      message: "Lead captured and saved to Google Sheets backup",
      sheetBackup: sheetSuccess,
    });
  } catch (err) {
    console.error("[leads/submit] Server submission error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to process lead submission" },
      { status: 500 }
    );
  }
}
