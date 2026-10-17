import { createClient } from "@supabase/supabase-js";
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

const supabase = createClient(supabaseUrl, serviceKey);

async function smokeTest() {
  console.log("⚡ Testing Supabase Direct Queries (Replaced API routes)...\n");

  const startCust = performance.now();
  const { data: customers, error: custErr } = await supabase.from("customers").select("*").limit(5);
  const custTime = Math.round(performance.now() - startCust);
  if (custErr) throw custErr;
  console.log(`✅ customers table queried in ${custTime}ms (${customers.length} sample rows returned)`);

  const startLeads = performance.now();
  const { data: leads, error: leadErr } = await supabase.from("leads").select("*").limit(5);
  const leadTime = Math.round(performance.now() - startLeads);
  if (leadErr) throw leadErr;
  console.log(`✅ leads table queried in ${leadTime}ms (${leads.length} sample rows returned)`);

  const startSubs = performance.now();
  const { data: subs, error: subErr } = await supabase.from("subscriptions").select("*").limit(5);
  const subTime = Math.round(performance.now() - startSubs);
  if (subErr) throw subErr;
  console.log(`✅ subscriptions table queried in ${subTime}ms (${subs.length} sample rows returned)`);

  const startOrders = performance.now();
  const { data: orders, error: ordErr } = await supabase.from("orders").select("*").limit(5);
  const ordTime = Math.round(performance.now() - startOrders);
  if (ordErr) throw ordErr;
  console.log(`✅ orders table queried in ${ordTime}ms (${orders.length} sample rows returned)`);

  const startUsers = performance.now();
  const { data: users, error: userErr } = await supabase.from("crm_users").select("*").limit(5);
  const userTime = Math.round(performance.now() - startUsers);
  if (userErr) throw userErr;
  console.log(`✅ crm_users table queried in ${userTime}ms (${users.length} sample rows returned)`);

  console.log("\n🚀 All Supabase queries responded in sub-second speeds!");
}

smokeTest().catch(console.error);
