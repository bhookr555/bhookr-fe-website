import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const leadsSheetUrl = process.env.NEXT_PUBLIC_LEADS_SHEET_URL;

if (!leadsSheetUrl) {
  console.error("❌ NEXT_PUBLIC_LEADS_SHEET_URL is missing!");
  process.exit(1);
}

// 1. Initialize Firebase Admin
if (getApps().length === 0) {
  const privateKey = process.env.FIREBASE_PRIVATE_KEY
    ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n")
    : undefined;

  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey,
    }),
  });
}

const db = getFirestore();

async function runBackfill() {
  console.log("🚀 Fetching current Google Sheets lead list...");
  let existingEmails = new Set();

  try {
    const sheetRes = await fetch(`${leadsSheetUrl}?action=list`, {
      redirect: "follow",
    });
    if (sheetRes.ok) {
      const sheetData = await sheetRes.json();
      const rows = sheetData?.rows || [];
      rows.forEach((r) => {
        if (r.email) existingEmails.add(String(r.email).toLowerCase().trim());
      });
      console.log(`📊 Found ${existingEmails.size} existing email entries in Google Sheets.`);
    }
  } catch (err) {
    console.warn("⚠️ Could not fetch existing sheet list, proceeding with caution:", err);
  }

  console.log("🔍 Fetching leads from CRM Database (Firestore)...");
  const cacheDoc = await db.collection("crm_cache").doc("leads").get();
  
  if (!cacheDoc.exists) {
    console.error("❌ No crm_cache/leads document found in Firestore!");
    process.exit(1);
  }

  const cachedData = cacheDoc.data();
  const rows = cachedData?.data?.rows || [];
  console.log(`📋 Total leads in CRM cache: ${rows.length}`);

  let addedCount = 0;
  let skippedCount = 0;

  for (const lead of rows) {
    const email = String(lead.email || "").toLowerCase().trim();
    
    // Skip if lead is already in Google Sheets or has no name/email
    if (!lead.name && !email && !lead.phoneNumber) {
      skippedCount++;
      continue;
    }

    if (email && existingEmails.has(email)) {
      skippedCount++;
      continue;
    }

    console.log(`📤 Backfilling lead to Google Sheets: ${lead.name || lead.email || "Unknown"}`);

    const payload = {
      ...lead,
      plan: Array.isArray(lead.plan) ? lead.plan.join(", ") : lead.plan,
      timestamp: lead.timestamp || new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
      status: lead.status || "lead",
    };

    try {
      const res = await fetch(leadsSheetUrl, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload),
        redirect: "follow",
      });

      if (res.ok || res.status === 200 || res.status === 302 || res.type === "opaque") {
        addedCount++;
        if (email) existingEmails.add(email);
        console.log(`  ✅ Successfully backfilled ${email || lead.name}`);
      } else {
        console.warn(`  ⚠️ Post returned status ${res.status}`);
      }
    } catch (postErr) {
      console.error(`  ❌ Failed to post ${email}:`, postErr);
    }

    // Small delay to prevent rate-limiting Google Apps Script
    await new Promise((r) => setTimeout(r, 600));
  }

  console.log("\n==========================================");
  console.log(`🎉 Backfill Complete!`);
  console.log(`✅ Leads added to Google Sheets: ${addedCount}`);
  console.log(`⏩ Leads already present / skipped: ${skippedCount}`);
  console.log("==========================================");
  process.exit(0);
}

runBackfill();
