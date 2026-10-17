import { createClient } from "@supabase/supabase-js";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";
import path from "path";

// Load .env.local
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
  console.error("❌ Missing Supabase URL or Service Role Key in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

// Firebase Admin setup
let db = null;
try {
  if (getApps().length === 0) {
    const privateKey = process.env.FIREBASE_PRIVATE_KEY
      ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n")
      : undefined;

    if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && privateKey) {
      initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey,
        }),
      });
      db = getFirestore();
      console.log("✅ Firebase Admin initialized for fallback cache extraction");
    }
  } else {
    db = getFirestore();
  }
} catch (e) {
  console.warn("⚠️ Firebase Admin could not be initialized:", e.message);
}

async function fetchGasRows(url) {
  if (!url) return [];
  try {
    const res = await fetch(`${url}?action=list`, {
      method: "GET",
      signal: AbortSignal.timeout(20000),
      redirect: "follow",
    });
    if (!res.ok) return [];
    const text = await res.text();
    if (text.trim().startsWith("<") || text.includes("Page not found")) return [];
    const data = JSON.parse(text);
    return Array.isArray(data.rows) ? data.rows : [];
  } catch (err) {
    console.warn(`⚠️ Fetch failed for ${url}:`, err.message);
    return [];
  }
}

// Helper: parse date safely
function parseDateSafe(val) {
  if (!val) return null;
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d.toISOString().split("T")[0];
}

function parseTimestampSafe(val) {
  if (!val) return new Date().toISOString();
  const d = new Date(val);
  return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

function parseNumber(val) {
  if (val === undefined || val === null || val === "") return null;
  const num = parseFloat(String(val).replace(/[^0-9.-]/g, ""));
  return isNaN(num) ? null : num;
}

// -------------------------------------------------------------
// 1. MIGRATE CUSTOMERS
// -------------------------------------------------------------
async function migrateCustomers() {
  console.log("\n📦 [1/5] Migrating Customers...");
  const sheetUrl = process.env.NEXT_PUBLIC_ACTIVE_CUSTOMERS_SHEET_URL;
  const sheetRows = await fetchGasRows(sheetUrl);
  console.log(`  Fetched ${sheetRows.length} customers from Google Sheet`);

  let firestoreRows = [];
  if (db) {
    try {
      const snap = await db.collection("crm_manual_customers").get();
      firestoreRows = snap.docs.map((d) => ({ ...d.data(), id: d.id, is_manual: true }));
      console.log(`  Fetched ${firestoreRows.length} manual customers from Firestore`);
    } catch (e) {
      console.warn("  Could not read crm_manual_customers from Firestore:", e.message);
    }
  }

  const allRows = [...sheetRows, ...firestoreRows];
  if (allRows.length === 0) {
    console.log("  No customers to migrate.");
    return;
  }

  const customersToUpsert = [];
  let seq = 1;
  const seenCodes = new Set();

  for (const r of allRows) {
    const rawCode = r["DELIVERY CODE"] || r["DELIVERY_CODE"] || r["Delivery Code"] || r["delivery_code"] || r.deliveryCode;
    const code = rawCode ? String(rawCode).trim().toUpperCase() : `BDC${String(seq++).padStart(4, "0")}`;

    if (seenCodes.has(code)) continue;
    seenCodes.add(code);

    const name = r["NAME"] || r["Name"] || r["name"] || "Customer";
    const mobile = r["MOBILE"] || r["Mobile"] || r["mobile"] || r.phoneNumber || "";
    const location = r["LOCATION"] || r["Location"] || r["location"] || "";
    const zone = r["ZONE"] || r["Zone"] || r["zone"] || "";
    const status = r["STATUS"] || r["Status"] || r["status"] || "NORMAL";
    const plan = r["PLAN"] || r["Plan"] || r["plan"] || "";
    const type = r["TYPE"] || r["Type"] || r["type"] || "";
    const meal = r["MEAL"] || r["Meal"] || r["meal"] || "";
    const goal = r["GOAL"] || r["Goal"] || r["goal"] || "";
    const customization = r["CUSTOMIZATION"] || r["Customization"] || r["customization"] || "";
    const inspection = r["INSPECTION"] || r["Inspection"] || r["inspection"] || "";
    const recipeId = r["RECIPE ID"] || r["RECIPE_ID"] || r["Recipe Id"] || r["recipe_id"] || "";
    const isManual = Boolean(r.is_manual);

    customersToUpsert.push({
      delivery_code: code,
      name,
      mobile: String(mobile),
      location: String(location),
      zone: String(zone),
      status: String(status),
      plan: String(plan),
      type: String(type),
      meal: String(meal),
      goal: String(goal),
      customization: String(customization),
      inspection: String(inspection),
      recipe_id: String(recipeId),
      is_manual: isManual,
    });
  }

  console.log(`  Upserting ${customersToUpsert.length} unique customers into Supabase...`);
  const { error } = await supabase.from("customers").upsert(customersToUpsert, {
    onConflict: "delivery_code",
  });

  if (error) {
    console.error("  ❌ Customers upsert error:", error.message);
  } else {
    console.log(`  ✅ Successfully migrated ${customersToUpsert.length} customers!`);
  }
}

// -------------------------------------------------------------
// 2. MIGRATE LEADS
// -------------------------------------------------------------
async function migrateLeads() {
  console.log("\n📦 [2/5] Migrating Leads...");
  const webSheetUrl = process.env.NEXT_PUBLIC_LEADS_SHEET_URL;
  const clientSheetUrl = process.env.NEXT_PUBLIC_CLIENT_FORM_SHEET_URL;

  const [webRows, clientRows] = await Promise.all([
    fetchGasRows(webSheetUrl),
    fetchGasRows(clientSheetUrl),
  ]);
  console.log(`  Fetched ${webRows.length} website leads and ${clientRows.length} client form leads from Google Sheets`);

  let firestoreLeads = [];
  if (db && webRows.length === 0) {
    try {
      const snap = await db.collection("crm_cache").doc("leads_v10").get();
      if (snap.exists) {
        firestoreLeads = snap.data()?.data?.rows || [];
        console.log(`  Found ${firestoreLeads.length} fallback leads in Firestore crm_cache/leads_v10`);
      }
    } catch (e) {
      console.warn("  Could not fetch fallback Firestore leads:", e.message);
    }
  }

  const leadsToUpsert = [];
  const seenLeads = new Set();

  function processLeadRow(r, source) {
    const rawEmail = r.email || r.Email || "";
    const rawPhone = r.phoneNumber || r.phone || r.Phone || r["Phone Number"] || r.Mobile || r.mobile || "";
    const name = r.name || r.Name || "Lead";

    let email = String(rawEmail).trim().toLowerCase();
    const phone = String(rawPhone).trim();

    // If no email exists, make a deterministic unique placeholder so the record is not lost
    if (!email) {
      if (phone) {
        email = `phone_${phone.replace(/\D/g, "")}@bhookr.lead`;
      } else {
        email = `lead_${Math.random().toString(36).substring(2, 10)}@bhookr.lead`;
      }
    }

    const key = `${email}:${source}`;
    if (seenLeads.has(key)) return;
    seenLeads.add(key);

    const planVal = Array.isArray(r.plan) ? r.plan.join(", ") : (r.plan || r.Plan || "");

    leadsToUpsert.push({
      name,
      email,
      phone_number: phone,
      age: parseNumber(r.age || r.Age),
      gender: r.gender || r.Gender || null,
      height: parseNumber(r.height || r.Height),
      weight: parseNumber(r.weight || r.Weight),
      goal: r.goal || r.Goal || null,
      diet: r.diet || r.Diet || null,
      food_preference: r.foodPreference || r["Food Preference"] || null,
      physical_state: r.physicalState || r["Physical State"] || null,
      food_love: r.foodLove || r["Food Love"] || null,
      subscription_type: r.subscriptionType || r["Subscription Type"] || null,
      plan: planVal || null,
      subscription_start_date: parseDateSafe(r.subscriptionStartDate || r["Subscription Start Date"]),
      status: r.status || r.Status || "lead",
      last_step_completed: parseNumber(r.lastStepCompleted) || 0,
      checkout_visited: Boolean(r.checkoutVisited),
      utm_source: r.utmSource || r.utm_source || null,
      utm_sub_source: r.utmSubSource || r.utm_sub_source || null,
      lead_source: source,
      created_at: parseTimestampSafe(r.timestamp || r.createdAt || r["Timestamp"]),
    });
  }

  for (const r of (webRows.length > 0 ? webRows : firestoreLeads)) {
    processLeadRow(r, "website");
  }
  for (const r of clientRows) {
    processLeadRow(r, "client_form");
  }

  if (leadsToUpsert.length === 0) {
    console.log("  No leads found to migrate.");
    return;
  }

  console.log(`  Upserting ${leadsToUpsert.length} leads into Supabase...`);
  // Batch in chunks of 100 to avoid payload size limit
  for (let i = 0; i < leadsToUpsert.length; i += 100) {
    const chunk = leadsToUpsert.slice(i, i + 100);
    const { error } = await supabase.from("leads").upsert(chunk, {
      onConflict: "email,lead_source",
    });
    if (error) {
      console.error(`  ❌ Leads chunk ${i}-${i + chunk.length} error:`, error.message);
    }
  }
  console.log(`  ✅ Finished migrating ${leadsToUpsert.length} leads!`);
}

// -------------------------------------------------------------
// 3. MIGRATE SUBSCRIPTIONS
// -------------------------------------------------------------
async function migrateSubscriptions() {
  console.log("\n📦 [3/5] Migrating Subscriptions...");
  const sheetUrl = process.env.NEXT_PUBLIC_SUBSCRIPTIONS_SHEET_URL;
  const sheetRows = await fetchGasRows(sheetUrl);
  console.log(`  Fetched ${sheetRows.length} subscriptions from Google Sheet`);

  if (sheetRows.length === 0) {
    console.log("  No subscriptions to migrate.");
    return;
  }

  const subsToUpsert = [];
  const seenOrders = new Set();
  let seq = 1;

  for (const r of sheetRows) {
    const orderId = r.orderId || r["Order ID"] || r["order_id"] || `SUB_MIGRATED_${seq++}`;
    if (seenOrders.has(orderId)) continue;
    seenOrders.add(orderId);

    const name = r.name || r.Name || "Subscriber";
    const email = (r.email || r.Email || `subscriber_${orderId}@bhookr.com`).toLowerCase().trim();
    const phone = r.phoneNumber || r.phone || r["Phone Number"] || "";

    const planVal = Array.isArray(r.plan) ? r.plan.join(", ") : (r.plan || r.Plan || "");

    subsToUpsert.push({
      order_id: orderId,
      transaction_id: r.transactionId || r["Transaction ID"] || null,
      name,
      email,
      phone_number: phone,
      age: parseNumber(r.age || r.Age),
      gender: r.gender || r.Gender || null,
      height: parseNumber(r.height || r.Height),
      weight: parseNumber(r.weight || r.Weight),
      goal: r.goal || r.Goal || null,
      diet: r.diet || r.Diet || null,
      food_preference: r.foodPreference || r["Food Preference"] || null,
      physical_state: r.physicalState || r["Physical State"] || null,
      subscription_type: r.subscriptionType || r["Subscription Type"] || null,
      plan: planVal || null,
      subscription_start_date: parseDateSafe(r.subscriptionStartDate || r["Subscription Start Date"]),
      subscription_end_date: parseDateSafe(r.subscriptionEndDate || r["Subscription End Date"]),
      status: r.status || r.Status || "active",
      delivery_full_name: r.deliveryFullName || r["Delivery Name"] || null,
      delivery_phone: r.deliveryPhone || r["Delivery Phone"] || null,
      delivery_address: r.deliveryAddress || r["Delivery Address"] || null,
      delivery_city: r.deliveryCity || r["Delivery City"] || null,
      delivery_state: r.deliveryState || r["Delivery State"] || null,
      delivery_pin_code: r.deliveryPinCode || r["Delivery Pin Code"] || null,
      payment_status: r.paymentStatus || r["Payment Status"] || "success",
      amount_paid: parseNumber(r.amountPaid || r["Amount Paid"]),
      payment_method: r.paymentMethod || r["Payment Method"] || null,
      payment_timestamp: parseTimestampSafe(r.paymentTimestamp || r["Payment Timestamp"]),
      created_at: parseTimestampSafe(r.timestamp || r.createdAt || r["Timestamp"]),
    });
  }

  console.log(`  Upserting ${subsToUpsert.length} subscriptions into Supabase...`);
  const { error } = await supabase.from("subscriptions").upsert(subsToUpsert, {
    onConflict: "order_id",
  });

  if (error) {
    console.error("  ❌ Subscriptions upsert error:", error.message);
  } else {
    console.log(`  ✅ Successfully migrated ${subsToUpsert.length} subscriptions!`);
  }
}

// -------------------------------------------------------------
// 4. MIGRATE ORDERS
// -------------------------------------------------------------
async function migrateOrders() {
  console.log("\n📦 [4/5] Migrating Orders...");
  const sheetUrl = process.env.NEXT_PUBLIC_ORDERS_SHEET_URL;
  const sheetRows = await fetchGasRows(sheetUrl);
  console.log(`  Fetched ${sheetRows.length} orders from Google Sheet`);

  if (sheetRows.length === 0) {
    console.log("  No orders to migrate.");
    return;
  }

  const ordersToUpsert = [];
  const seenOrders = new Set();
  let seq = 1;

  for (const r of sheetRows) {
    const orderId = r.orderId || r["Order ID"] || r["order_id"] || `ORD_MIGRATED_${seq++}`;
    if (seenOrders.has(orderId)) continue;
    seenOrders.add(orderId);

    ordersToUpsert.push({
      order_id: orderId,
      customer_name: r.customerName || r["Customer Name"] || null,
      customer_email: r.customerEmail || r["Customer Email"] || null,
      customer_phone: r.customerPhone || r["Customer Phone"] || null,
      delivery_full_name: r.deliveryFullName || r["Delivery Name"] || null,
      delivery_phone: r.deliveryPhone || r["Delivery Phone"] || null,
      delivery_address: r.deliveryAddress || r["Delivery Address"] || null,
      delivery_city: r.deliveryCity || r["Delivery City"] || null,
      delivery_state: r.deliveryState || r["Delivery State"] || null,
      delivery_pin_code: r.deliveryPinCode || r["Delivery Pin Code"] || null,
      items: typeof r.items === "string" ? (() => { try { return JSON.parse(r.items); } catch { return []; } })() : (r.items || []),
      item_count: parseNumber(r.itemCount || r["Item Count"]),
      subtotal: parseNumber(r.subtotal || r["Subtotal"]),
      item_gst: parseNumber(r.itemGST || r["Item GST"]),
      delivery_base: parseNumber(r.deliveryBase || r["Delivery Base"]),
      delivery_gst: parseNumber(r.deliveryGST || r["Delivery GST"]),
      grand_total: parseNumber(r.grandTotal || r["Grand Total"]),
      payment_status: r.paymentStatus || r["Payment Status"] || "success",
      payment_id: r.paymentId || r["Payment ID"] || null,
      payment_method: r.paymentMethod || r["Payment Method"] || null,
      payment_timestamp: parseTimestampSafe(r.paymentTimestamp || r["Payment Timestamp"]),
      created_at: parseTimestampSafe(r.timestamp || r.createdAt || r["Timestamp"]),
    });
  }

  console.log(`  Upserting ${ordersToUpsert.length} orders into Supabase...`);
  const { error } = await supabase.from("orders").upsert(ordersToUpsert, {
    onConflict: "order_id",
  });

  if (error) {
    console.error("  ❌ Orders upsert error:", error.message);
  } else {
    console.log(`  ✅ Successfully migrated ${ordersToUpsert.length} orders!`);
  }
}

// -------------------------------------------------------------
// 5. MIGRATE CRM USERS
// -------------------------------------------------------------
async function migrateCrmUsers() {
  console.log("\n📦 [5/5] Migrating CRM Users from Firestore...");
  if (!db) {
    console.log("  Firebase Admin not configured, skipping CRM users migration.");
    return;
  }

  try {
    const snap = await db.collection("users").get();
    const users = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    console.log(`  Found ${users.length} users in Firestore 'users' collection`);

    const usersToUpsert = [];
    for (const u of users) {
      if (!u.email) continue;
      usersToUpsert.push({
        email: u.email.toLowerCase().trim(),
        name: u.name || null,
        role: u.role || "telecaller",
        is_active: u.isActive !== false,
        created_at: parseTimestampSafe(u.createdAt),
      });
    }

    if (usersToUpsert.length > 0) {
      const { error } = await supabase.from("crm_users").upsert(usersToUpsert, {
        onConflict: "email",
      });
      if (error) {
        console.error("  ❌ CRM users upsert error:", error.message);
      } else {
        console.log(`  ✅ Successfully migrated ${usersToUpsert.length} CRM users!`);
      }
    }
  } catch (e) {
    console.warn("  Could not migrate CRM users:", e.message);
  }
}

async function main() {
  console.log("=================================================");
  console.log("🚀 Starting Google Sheets & Firestore → Supabase Migration");
  console.log("=================================================");

  await migrateCustomers();
  await migrateLeads();
  await migrateSubscriptions();
  await migrateOrders();
  await migrateCrmUsers();

  console.log("\n=================================================");
  console.log("🎉 Migration process completed!");
  console.log("=================================================");
}

main().catch(console.error);
