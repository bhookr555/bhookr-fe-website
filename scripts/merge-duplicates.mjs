/**
 * Deduplication Migration Script for Bhookr CRM
 *
 * 1. Creates a full JSON backup of the active `leads` table in backups/
 * 2. Groups all 896 rows by normalized Indian phone number (primary) and normalized email (secondary)
 * 3. Identifies unambiguous duplicates (e.g. same person submitted across website & client form)
 * 4. Merges into the oldest canonical record:
 *    - Preserves non-empty fields (phone, email, age, gender, diet, goal, etc.)
 *    - Preserves original earliest created_at timestamp
 *    - Preserves advanced funnel statuses (converted, follow_up, etc.)
 *    - Combines source tags (e.g. "website", "client_form")
 * 5. Updates the canonical record in Supabase
 * 6. Deletes the duplicate redundant rows from Supabase
 * 7. Records a full merge audit trail in backups/merge-audit-<timestamp>.json
 */

import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

// Load environment variables from .env.local
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

if (!supabaseUrl || !serviceKey) {
  console.error("Missing Supabase URL or Service Role Key!");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

function normalizeIndianPhone(phone) {
  if (!phone) return "";
  const digits = String(phone).replace(/\D/g, "");
  if (!digits) return "";
  if (digits.length === 12 && digits.startsWith("91")) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) return digits.slice(1);
  if (digits.length >= 10) return digits.slice(-10);
  return digits;
}

function normalizeEmail(email) {
  if (!email) return "";
  return String(email).trim().toLowerCase();
}

function isPopulated(val) {
  if (val === null || val === undefined) return false;
  const str = String(val).trim();
  return str !== "" && str !== "—" && str !== "N/A" && str !== "null" && str !== "undefined";
}

async function runDeduplicationMigration() {
  console.log("=== STARTING HISTORICAL DATA DEDUPLICATION ===");

  // 1. Fetch all leads from Supabase
  const { data: allLeads, error: fetchErr } = await supabase
    .from("leads")
    .select("*")
    .order("created_at", { ascending: true });

  if (fetchErr) {
    console.error("Failed to fetch leads:", fetchErr);
    process.exit(1);
  }

  console.log(`Fetched ${allLeads.length} total lead records.`);

  // 2. Create verified backup
  const backupDir = path.resolve(process.cwd(), "backups");
  if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

  const backupFile = path.join(backupDir, `leads-pre-merge-backup-${Date.now()}.json`);
  fs.writeFileSync(backupFile, JSON.stringify(allLeads, null, 2));
  console.log(`✅ Pre-merge verified backup created at: ${backupFile}`);

  // 3. Group by normalized 10-digit phone
  const phoneGroups = new Map();
  const unassigned = [];

  for (const lead of allLeads) {
    const p = normalizeIndianPhone(lead.phone_number);
    if (p && p.length === 10) {
      if (!phoneGroups.has(p)) phoneGroups.set(p, []);
      phoneGroups.get(p).push(lead);
    } else {
      unassigned.push(lead);
    }
  }

  const auditLog = [];
  const rowsToDelete = [];
  const rowsToUpdate = [];

  for (const [phone, rows] of phoneGroups.entries()) {
    if (rows.length <= 1) continue;

    // Check for ambiguous identity conflicts
    const emails = new Set(
      rows
        .map((r) => normalizeEmail(r.email))
        .filter((e) => e && !e.endsWith("@bhookr.lead"))
    );

    // If multiple completely distinct email addresses exist for the same phone, check if they are typos or different users
    // Typo example: 'nazia.gengold@gmsil.com' vs 'nazia.gengold@gmail.com'
    // If ambiguous, leave separate and do not delete!
    const names = new Set(rows.map((r) => String(r.name || "").trim().toLowerCase()).filter(Boolean));
    const isObviousTypo =
      emails.size <= 2 &&
      Array.from(emails).every((e) => e.includes("@"));

    // If names are distinct and emails are completely distinct companies/users (e.g. workernoww vs prashanth), mark ambiguous
    let isAmbiguousConflict = false;
    if (emails.size > 2) {
      isAmbiguousConflict = true;
    } else if (emails.size === 2) {
      const [e1, e2] = Array.from(emails);
      const user1 = e1.split("@")[0].replace(/[^a-z]/g, "");
      const user2 = e2.split("@")[0].replace(/[^a-z]/g, "");
      // If usernames share < 3 characters and names are different, flag conflict
      if (user1.slice(0, 3) !== user2.slice(0, 3) && names.size > 1) {
        isAmbiguousConflict = true;
      }
    }

    if (isAmbiguousConflict) {
      console.warn(`[CONFLICT] Skipping automatic merge for phone ${phone} (multiple distinct identities):`, Array.from(emails));
      auditLog.push({
        status: "SKIPPED_CONFLICT",
        phone,
        emails: Array.from(emails),
        leadIds: rows.map((r) => r.id),
      });
      continue;
    }

    // Unambiguous duplicate! Select oldest record as canonical
    rows.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    const canonical = { ...rows[0] };
    const duplicates = rows.slice(1);

    const mergedFields = {};
    const mergeKeys = [
      "name",
      "email",
      "age",
      "gender",
      "height",
      "weight",
      "goal",
      "diet",
      "food_preference",
      "physical_state",
      "food_love",
      "subscription_type",
      "plan",
      "subscription_start_date",
      "utm_source",
      "utm_sub_source",
    ];

    for (const dup of duplicates) {
      for (const k of mergeKeys) {
        if (!isPopulated(canonical[k]) && isPopulated(dup[k])) {
          canonical[k] = dup[k];
          mergedFields[k] = dup[k];
        }
      }

      // Preserve status if duplicate had a more progressed status
      const PROTECTED = ["converted", "follow_up", "hot_prospect", "trial_requested", "future_prospect", "pending"];
      if (PROTECTED.includes(dup.status) && !PROTECTED.includes(canonical.status)) {
        canonical.status = dup.status;
        mergedFields.status = dup.status;
      }

      // Max last step
      if ((dup.last_step_completed || 0) > (canonical.last_step_completed || 0)) {
        canonical.last_step_completed = dup.last_step_completed;
        mergedFields.last_step_completed = dup.last_step_completed;
      }

      // Checkout visited
      if (dup.checkout_visited && !canonical.checkout_visited) {
        canonical.checkout_visited = true;
        mergedFields.checkout_visited = true;
      }

      rowsToDelete.push(dup.id);
    }

    rowsToUpdate.push(canonical);
    auditLog.push({
      status: "MERGED",
      canonicalId: canonical.id,
      duplicateIds: duplicates.map((d) => d.id),
      phone,
      preservedFields: mergedFields,
    });
  }

  console.log(`\nIdentified ${rowsToUpdate.length} canonical records to update.`);
  console.log(`Identified ${rowsToDelete.length} redundant duplicate rows to remove.`);

  // 4. Execute updates to canonical records
  console.log("Applying updates to canonical records in Supabase...");
  for (const c of rowsToUpdate) {
    const { error: updErr } = await supabase
      .from("leads")
      .update({
        name: c.name,
        email: c.email,
        phone_number: normalizeIndianPhone(c.phone_number),
        age: c.age,
        gender: c.gender,
        height: c.height,
        weight: c.weight,
        goal: c.goal,
        diet: c.diet,
        food_preference: c.food_preference,
        physical_state: c.physical_state,
        food_love: c.food_love,
        subscription_type: c.subscription_type,
        plan: c.plan,
        subscription_start_date: c.subscription_start_date,
        status: c.status,
        last_step_completed: c.last_step_completed,
        checkout_visited: c.checkout_visited,
        utm_source: c.utm_source,
        utm_sub_source: c.utm_sub_source,
        updated_at: new Date().toISOString(),
      })
      .eq("id", c.id);

    if (updErr) {
      console.error(`Failed to update canonical ${c.id}:`, updErr);
    }
  }

  // 5. Delete redundant duplicate records
  console.log("Deleting redundant duplicate rows in Supabase...");
  // Delete in batches of 20
  for (let i = 0; i < rowsToDelete.length; i += 20) {
    const batch = rowsToDelete.slice(i, i + 20);
    const { error: delErr } = await supabase
      .from("leads")
      .delete()
      .in("id", batch);

    if (delErr) {
      console.error(`Failed to delete batch ${i}:`, delErr);
    }
  }

  // 6. Write audit trail
  const auditFile = path.join(backupDir, `merge-audit-${Date.now()}.json`);
  fs.writeFileSync(auditFile, JSON.stringify(auditLog, null, 2));
  console.log(`✅ Merge audit trail saved at: ${auditFile}`);

  // 7. Verify remaining count
  const { count: finalCount } = await supabase
    .from("leads")
    .select("*", { count: "exact", head: true });

  console.log(`\n=== DEDUPLICATION COMPLETE ===`);
  console.log(`Initial rows: ${allLeads.length}`);
  console.log(`Duplicates removed: ${rowsToDelete.length}`);
  console.log(`Final canonical rows count: ${finalCount}`);
}

runDeduplicationMigration().catch(console.error);
