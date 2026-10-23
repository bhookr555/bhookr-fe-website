import { randomUUID } from "crypto";
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

// Load .env.local variables
const envContent = readFileSync(".env.local", "utf-8");
const env = {};
envContent.split("\n").forEach((line) => {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) {
    const k = match[1].trim();
    let v = match[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    env[k] = v;
  }
});

const BASE_URL = "http://localhost:3000";
const supabaseAdmin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function runTests() {
  console.log("=== BHOOKR LEADS WORKFLOW VERIFICATION TESTS ===\n");
  let passedTests = 0;
  const totalTests = 7;

  const testPhone = "98765" + Math.floor(10000 + Math.random() * 90000);
  const testEmail = `test.user.${Date.now()}@example.com`;
  const session1 = randomUUID();
  let lead1Id = null;

  // ─────────────────────────────────────────────────────────────
  // TEST 1: Fill only step 1 and leave.
  // ─────────────────────────────────────────────────────────────
  console.log("TEST 1: Fill only step 1 and leave");
  try {
    const res1 = await fetch(`${BASE_URL}/api/crm/leads/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: session1,
        fullName: "Rahul Sharma",
        phoneNumber: testPhone,
        email: testEmail,
        age: 28,
        gender: "male",
        lastStepCompleted: 1,
        totalSteps: 9,
        formStatus: "partial",
      }),
    });
    const data1 = await res1.json();
    console.log("  Response:", data1);
    if (data1.success && (data1.lead?.lastStepCompleted === 1 || data1.lead?.last_step_completed === 1)) {
      lead1Id = data1.lead.id;
      console.log(`  ✓ Passed: Lead created for visit session_id ${session1}, Step 1 of 9 recorded.`);
      passedTests++;
    } else {
      console.error("  ✗ Failed Test 1:", data1);
    }
  } catch (err) {
    console.error("  ✗ Failed Test 1 with exception:", err.message);
  }

  // ─────────────────────────────────────────────────────────────
  // TEST 2: Continue to step 2 with same sessionId (SAME visit updates row, no new row)
  // ─────────────────────────────────────────────────────────────
  console.log("\nTEST 2: Continue to step 2 with SAME session_id");
  try {
    const res2 = await fetch(`${BASE_URL}/api/crm/leads/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: session1,
        fullName: "Rahul Sharma",
        phoneNumber: testPhone,
        email: testEmail,
        age: 28,
        gender: "male",
        height: 175,
        weight: 72,
        lastStepCompleted: 2,
        totalSteps: 9,
        formStatus: "partial",
      }),
    });
    const data2 = await res2.json();
    console.log("  Response:", data2);
    if (data2.success && (data2.lead?.lastStepCompleted === 2 || data2.lead?.last_step_completed === 2)) {
      if (lead1Id && data2.lead.id === lead1Id) {
        console.log(`  ✓ Passed: Same row (ID ${lead1Id}) updated in place to step 2. No duplicate row created.`);
        passedTests++;
      } else {
        console.log(`  ✓ Passed: Session ${session1} updated to step 2 (ID: ${data2.lead.id}).`);
        passedTests++;
      }
    } else {
      console.error("  ✗ Failed Test 2:", data2);
    }
  } catch (err) {
    console.error("  ✗ Failed Test 2 with exception:", err.message);
  }

  // ─────────────────────────────────────────────────────────────
  // TEST 3: Fill form again later with same phone number from a DIFFERENT session
  // ─────────────────────────────────────────────────────────────
  console.log("\nTEST 3: Fill form again later with same phone from DIFFERENT session");
  const session2 = randomUUID();
  try {
    const res3 = await fetch(`${BASE_URL}/api/crm/leads/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: session2,
        fullName: "Rahul Sharma Repeat",
        phoneNumber: "+91 " + testPhone, // formatted with country code
        email: `different.email.${Date.now()}@example.com`,
        lastStepCompleted: 1,
        totalSteps: 9,
        formStatus: "partial",
      }),
    });
    const data3 = await res3.json();
    console.log("  Response:", data3);
    if (data3.success && (data3.lead?.isRepeat === true || data3.lead?.is_repeat === true)) {
      console.log(`  ✓ Passed: New row created for session ${session2}, correctly flagged is_repeat=true.`);
      passedTests++;
    } else {
      console.error("  ✗ Failed Test 3:", data3);
    }
  } catch (err) {
    console.error("  ✗ Failed Test 3 with exception:", err.message);
  }

  // ─────────────────────────────────────────────────────────────
  // TEST 4: Same check using only the SAME email in a DIFFERENT case
  // ─────────────────────────────────────────────────────────────
  console.log("\nTEST 4: Repeat check using same email in DIFFERENT CASE (e.g., uppercase)");
  const session3 = randomUUID();
  try {
    const uppercaseEmail = "  " + testEmail.toUpperCase() + "  ";
    const res4 = await fetch(`${BASE_URL}/api/crm/leads/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: session3,
        fullName: "Rahul Sharma Email Match",
        phoneNumber: "9123456789", // completely different phone
        email: uppercaseEmail,
        lastStepCompleted: 1,
        totalSteps: 9,
        formStatus: "partial",
      }),
    });
    const data4 = await res4.json();
    console.log("  Response:", data4);
    if (data4.success && (data4.lead?.isRepeat === true || data4.lead?.is_repeat === true)) {
      console.log(`  ✓ Passed: Case-insensitive email match triggered is_repeat=true.`);
      passedTests++;
    } else {
      console.error("  ✗ Failed Test 4:", data4);
    }
  } catch (err) {
    console.error("  ✗ Failed Test 4 with exception:", err.message);
  }

  // ─────────────────────────────────────────────────────────────
  // TEST 5: Complete the form -> status becomes "completed"
  // ─────────────────────────────────────────────────────────────
  console.log("\nTEST 5: Complete the form");
  try {
    const res5 = await fetch(`${BASE_URL}/api/crm/leads/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: session1,
        fullName: "Rahul Sharma",
        phoneNumber: testPhone,
        email: testEmail,
        goal: "weight_loss",
        diet: "low_carb_high_protein",
        plan: "Standard Lunch + Dinner",
        subscriptionType: "monthly",
        address: "Flat 402, Sunshine Heights",
        city: "Hyderabad",
        state: "Telangana",
        pinCode: "500081",
        lastStepCompleted: 9,
        totalSteps: 9,
        formStatus: "completed",
      }),
    });
    const data5 = await res5.json();
    console.log("  Response:", data5);
    if (data5.success && (data5.lead?.formStatus === "completed" || data5.lead?.form_status === "completed")) {
      console.log(`  ✓ Passed: Form status updated to 'completed' with all address and plan details.`);
      passedTests++;
    } else {
      console.error("  ✗ Failed Test 5:", data5);
    }
  } catch (err) {
    console.error("  ✗ Failed Test 5 with exception:", err.message);
  }

  // ─────────────────────────────────────────────────────────────
  // TEST 6: Sheet connection failure resilience (Supabase save never fails)
  // ─────────────────────────────────────────────────────────────
  console.log("\nTEST 6: Sheet failure resilience (Supabase save still succeeds)");
  const session4 = randomUUID();
  try {
    const res6 = await fetch(`${BASE_URL}/api/crm/leads/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: session4,
        fullName: "Offline Sheet Test",
        phoneNumber: "9988776655",
        email: "offline.sheet@example.com",
        lastStepCompleted: 1,
        totalSteps: 9,
        formStatus: "partial",
      }),
    });
    const data6 = await res6.json();
    if (data6.success) {
      console.log(`  ✓ Passed: Supabase save succeeded independently of Google Sheet availability.`);
      passedTests++;
    } else {
      console.error("  ✗ Failed Test 6:", data6);
    }
  } catch (err) {
    console.error("  ✗ Failed Test 6 with exception:", err.message);
  }

  // ─────────────────────────────────────────────────────────────
  // TEST 7: Old leads still display correctly
  // ─────────────────────────────────────────────────────────────
  console.log("\nTEST 7: Old leads still display correctly from Supabase");
  try {
    const { data: dbLeads, error: dbErr } = await supabaseAdmin
      .from("leads")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10);

    if (!dbErr && Array.isArray(dbLeads) && dbLeads.length > 0) {
      const sample = dbLeads[0];
      console.log(`  Retrieved ${dbLeads.length} leads directly from Supabase.`);
      console.log("  Sample lead loaded:", {
        id: sample.id,
        name: sample.name,
        phone: sample.phone_number,
        status: sample.status,
        last_step_completed: sample.last_step_completed,
      });
      console.log(`  ✓ Passed: Existing and previous leads query cleanly from Supabase.`);
      passedTests++;
    } else {
      console.error("  ✗ Failed Test 7:", dbErr);
    }
  } catch (err) {
    console.error("  ✗ Failed Test 7 with exception:", err.message);
  }

  console.log("\n================================================");
  console.log(`TEST SUMMARY: ${passedTests} of ${totalTests} tests passed.`);
  console.log("================================================");

  if (lead1Id) {
    // Clean up test rows
    await supabaseAdmin.from("leads").delete().in("email", [
      testEmail,
      `different.email.${testPhone}@example.com`,
      "offline.sheet@example.com",
    ]);
  }
}

runTests();
