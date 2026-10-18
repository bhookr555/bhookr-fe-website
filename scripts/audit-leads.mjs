import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

const envPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      process.env[key] = val;
    }
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, serviceKey);

// Indian phone normalization rule
function normalizePhone(raw) {
  if (!raw) return "";
  const digits = String(raw).replace(/\D/g, "");
  if (!digits) return "";
  if (digits.length === 12 && digits.startsWith("91")) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) return digits.slice(1);
  if (digits.length >= 10) return digits.slice(-10);
  return digits;
}

function normalizeEmail(raw) {
  if (!raw) return "";
  return String(raw).trim().toLowerCase();
}

async function audit() {
  console.log("=== BHOOKR LEADS & CUSTOMER AUDIT ===");
  const { data: rows, error } = await supabase.from("leads").select("*");
  if (error) {
    console.error("Error fetching leads:", error);
    return;
  }

  console.log(`Total lead records in Supabase: ${rows.length}`);

  const phoneMap = new Map(); // normalizedPhone -> Array of rows
  const emailMap = new Map(); // normalizedEmail -> Array of rows

  for (const r of rows) {
    const p = normalizePhone(r.phone_number);
    const e = normalizeEmail(r.email);

    if (p && p.length === 10) {
      if (!phoneMap.has(p)) phoneMap.set(p, []);
      phoneMap.get(p).push(r);
    }

    if (e && !e.includes("@bhookr.lead")) {
      if (!emailMap.has(e)) emailMap.set(e, []);
      emailMap.get(e).push(r);
    }
  }

  // Count duplicate phones
  let duplicatePhonesCount = 0;
  for (const [phone, list] of phoneMap.entries()) {
    if (list.length > 1) {
      duplicatePhonesCount++;
      if (duplicatePhonesCount <= 5) {
        console.log(`\nDuplicate Phone: ${phone} (${list.length} rows):`);
        list.forEach((l) => console.log(`  - [${l.id}] name: "${l.name}", email: "${l.email}", source: "${l.lead_source}", created: ${l.created_at}`));
      }
    }
  }

  // Count duplicate emails
  let duplicateEmailsCount = 0;
  for (const [email, list] of emailMap.entries()) {
    if (list.length > 1) {
      duplicateEmailsCount++;
    }
  }

  console.log("\n--- Audit Summary ---");
  console.log(`Total rows in leads table: ${rows.length}`);
  console.log(`Unique normalized 10-digit phones: ${phoneMap.size}`);
  console.log(`Phones with multiple records: ${duplicatePhonesCount}`);
  console.log(`Unique verified emails: ${emailMap.size}`);
  console.log(`Emails with multiple records: ${duplicateEmailsCount}`);
}

audit().catch(console.error);
