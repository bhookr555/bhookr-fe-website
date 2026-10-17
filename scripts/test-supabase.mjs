import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

// Simple .env.local parser
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

console.log("Supabase URL configured:", !!supabaseUrl, supabaseUrl ? `(${supabaseUrl.slice(0, 25)}...)` : "");
console.log("Supabase Service Role Key configured:", !!serviceKey);

if (!supabaseUrl || !serviceKey) {
  console.error("❌ Missing Supabase URL or Service Role Key in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

async function testTables() {
  const tables = ["leads", "subscriptions", "customers", "orders", "crm_users"];
  console.log("\nTesting Supabase table connections...\n");

  let allSuccess = true;
  for (const table of tables) {
    const { data, error, count } = await supabase.from(table).select("*", { count: "exact", head: true });
    if (error) {
      console.error(`❌ Table '${table}': ERROR -> ${error.message}`);
      allSuccess = false;
    } else {
      console.log(`✅ Table '${table}': Accessible! (row count: ${count ?? 0})`);
    }
  }

  if (allSuccess) {
    console.log("\n🎉 All 5 Supabase tables are successfully connected and verified!");
  } else {
    console.log("\n⚠️ Some tables failed verification. Check the error messages above.");
  }
}

testTables().catch(console.error);
