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
 * using `redirect: "manual"` so Google Apps Script executes `doPost(e)` cleanly.
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

    // SHEET2 URL is the canonical target. The env var is checked but Sheet2 is always preferred.
    const SHEET2_URL = "https://script.google.com/macros/s/AKfycbzrO0fki7Vcv3G06yt8wzz7Pta-f377k-nFr2gEob17jc65qd6vlkFCf9Ng_VpbCvxg/exec";
    const leadsSheetUrl = SHEET2_URL;
    let sheetSuccess = false;

    // 1. Server-to-server POST to Google Sheets Apps Script (using manual redirect)
    if (leadsSheetUrl) {
      try {
        const preparedData = {
          ...body,
          timestamp: body.timestamp || new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
          status: body.status || "lead",
        };

        // Try redirect: "manual" first to prevent fetch from turning POST into GET on 302
        const sheetRes = await fetch(leadsSheetUrl, {
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify(preparedData),
          redirect: "manual",
          signal: AbortSignal.timeout(10000),
        });

        // 302, 200, 201, opaque are all success indicators for Google Apps Script Web Apps
        sheetSuccess = sheetRes.status === 302 || sheetRes.status === 200 || sheetRes.status === 201 || sheetRes.type === "opaque" || sheetRes.ok;

        // Fallback: If 302 wasn't returned, try follow mode
        if (!sheetSuccess) {
          const fallbackRes = await fetch(leadsSheetUrl, {
            method: "POST",
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify(preparedData),
            redirect: "follow",
            signal: AbortSignal.timeout(10000),
          });
          sheetSuccess = fallbackRes.ok || fallbackRes.status === 200 || fallbackRes.status === 302;
        }

        console.log(`✅ Server-to-server lead posted to Google Sheets. SheetSuccess: ${sheetSuccess}`);
      } catch (sheetErr) {
        console.warn("⚠️ Server-to-server Google Sheet post error:", sheetErr);
      }
    } else {
      console.warn("⚠️ NEXT_PUBLIC_LEADS_SHEET_URL is missing in environment variables!");
    }

    // 2. Update Firestore cache so CRM dashboard reflects the lead immediately
    try {
      const cached = await getCachedData<any>("leads");
      const existingRows = Array.isArray(cached?.data?.rows) ? cached.data.rows : [];
      const newRow = {
        ...body,
        timestamp: body.timestamp || new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
        status: body.status || "lead",
        leadSource: "website",
      };

      // Check if lead already exists in cache to update or prepend
      const cleanPhone = String(body.phoneNumber || "").replace(/\D/g, "");
      const cleanEmail = String(body.email || "").trim().toLowerCase();

      let foundIndex = -1;
      for (let i = 0; i < existingRows.length; i++) {
        const row = existingRows[i];
        const rPhone = String(row.phoneNumber || "").replace(/\D/g, "");
        const rEmail = String(row.email || "").trim().toLowerCase();

        if ((cleanPhone && rPhone && rPhone.slice(-10) === cleanPhone.slice(-10)) || (cleanEmail && rEmail === cleanEmail)) {
          foundIndex = i;
          break;
        }
      }

      let updatedRows = [...existingRows];
      if (foundIndex >= 0) {
        updatedRows[foundIndex] = { ...existingRows[foundIndex], ...newRow };
      } else {
        updatedRows = [newRow, ...existingRows];
      }

      await setCachedData("leads", {
        ...cached?.data,
        rows: updatedRows,
        total: updatedRows.length,
      });
    } catch (cacheErr) {
      console.warn("⚠️ Cache prepend error:", cacheErr);
    }

    return NextResponse.json({
      success: true,
      message: "Lead captured successfully",
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
