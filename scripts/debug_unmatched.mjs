import fs from "fs";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const envText = fs.readFileSync(".env.local", "utf8");
const envVars = {};
for (const line of envText.split("\n")) {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith("#")) {
    const idx = trimmed.indexOf("=");
    if (idx > 0) {
      const key = trimmed.slice(0, idx).trim();
      let val = trimmed.slice(idx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      envVars[key] = val;
    }
  }
}

const privateKey = envVars.FIREBASE_PRIVATE_KEY
  ? envVars.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n")
  : undefined;

const app = initializeApp({
  credential: cert({
    projectId: envVars.FIREBASE_PROJECT_ID,
    clientEmail: envVars.FIREBASE_CLIENT_EMAIL,
    privateKey: privateKey,
  }),
});

const db = getFirestore(app);

function normaliseEmail(email) {
  return String(email ?? "").toLowerCase().replace(/\s+/g, "").trim();
}

function cleanDigits(phone) {
  return String(phone ?? "").replace(/\D/g, "");
}

async function debugUnmatched() {
  const pipeSnapshot = await db.collection("crm_pipeline").get();
  const pipelineDocs = pipeSnapshot.docs.map((d) => ({ id: d.id, ...d.data() }));

  const leadsUrl = envVars.NEXT_PUBLIC_LEADS_SHEET_URL;
  const res = await fetch(`${leadsUrl}?action=list`);
  const data = await res.json();
  const leads = data.rows || [];

  console.log("--- SAMPLE 15 FIRESTORE DOC IDs ---");
  pipelineDocs.slice(0, 15).forEach((d) => {
    console.log(`Doc ID: "${d.id}" | status: ${d.status} | notes: ${d.notes || "none"}`);
  });

  console.log("\n--- SAMPLE 15 LEADS FROM SHEET ---");
  leads.slice(0, 15).forEach((l) => {
    console.log(`Lead Name: "${l.name}" | Email: "${l.email}" | Phone: "${l.phoneNumber}" | Sheet Status: "${l.status}"`);
  });

  // Fuzzy matching check (by phone digits or email substring)
  console.log("\n--- FUZZY MATCH CHECK ---");
  let fuzzyMatches = 0;
  pipelineDocs.forEach((d) => {
    const docNorm = normaliseEmail(d.id);
    const docDigits = cleanDigits(d.id);

    const leadMatch = leads.find((l) => {
      const lEmail = normaliseEmail(l.email);
      const lPhone = cleanDigits(l.phoneNumber);
      const lName = normaliseEmail(l.name);

      if (lEmail && docNorm && (lEmail === docNorm || lEmail.includes(docNorm) || docNorm.includes(lEmail))) return true;
      if (lPhone && docDigits && (lPhone.includes(docDigits) || docDigits.includes(lPhone))) return true;
      if (lName && docNorm && (lName.includes(docNorm) || docNorm.includes(lName))) return true;
      return false;
    });

    if (leadMatch) {
      fuzzyMatches++;
      console.log(`MATCHED: Doc "${d.id}" (${d.status}) <---> Lead "${leadMatch.name}" (${leadMatch.email} / ${leadMatch.phoneNumber})`);
    } else {
      console.log(`UNMATCHED DOC: "${d.id}" (${d.status}) - no lead in sheet!`);
    }
  });

  console.log(`Total fuzzy matches found: ${fuzzyMatches} of ${pipelineDocs.length} pipeline docs.`);
}

debugUnmatched().catch(console.error);
