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
  return String(email ?? "").toLowerCase().trim();
}

function cleanPhoneKey(phone) {
  if (!phone) return "";
  const digits = String(phone).replace(/\D/g, "");
  if (digits.length >= 10) return `phone_${digits.slice(-10)}`;
  return digits ? `phone_${digits}` : "";
}

function effectiveStatus(email, pipeline, verifiedEmails, phone, sheetStatus, name) {
  const emailKey = normaliseEmail(email);
  if (emailKey && verifiedEmails.has(emailKey)) return { status: "converted", source: "online" };

  if (emailKey && pipeline[emailKey]) {
    return { status: pipeline[emailKey].status, source: "local" };
  }

  const strippedEmail = emailKey.replace(/\s+/g, "");
  if (strippedEmail && pipeline[strippedEmail]) {
    return { status: pipeline[strippedEmail].status, source: "local" };
  }

  const pKey = cleanPhoneKey(phone);
  if (pKey && pipeline[pKey]) {
    return { status: pipeline[pKey].status, source: "local" };
  }

  const rawDigits = String(phone ?? "").replace(/\D/g, "");
  if (rawDigits) {
    const pKey10 = `phone_${rawDigits.slice(-10)}`;
    if (pipeline[pKey10]) return { status: pipeline[pKey10].status, source: "local" };
    if (pipeline[rawDigits]) return { status: pipeline[rawDigits].status, source: "local" };
    if (rawDigits.length >= 10 && pipeline[rawDigits.slice(-10)]) {
      return { status: pipeline[rawDigits.slice(-10)].status, source: "local" };
    }
  }

  if (name) {
    const nameKey = normaliseEmail(name);
    if (nameKey && pipeline[nameKey]) return { status: pipeline[nameKey].status, source: "local" };
  }

  if (emailKey || rawDigits) {
    const normSearch = emailKey.replace(/\s+/g, "");
    const last10 = rawDigits.length >= 10 ? rawDigits.slice(-10) : rawDigits;

    for (const [pDocId, pEntry] of Object.entries(pipeline)) {
      const pNorm = pDocId.toLowerCase().replace(/\s+/g, "");
      if (normSearch && normSearch.length > 4 && (pNorm === normSearch || pNorm.includes(normSearch))) {
        return { status: pEntry.status, source: "local" };
      }
      if (last10 && last10.length >= 8 && pNorm.includes(last10)) {
        return { status: pEntry.status, source: "local" };
      }
    }
  }

  return { status: "new", source: "default" };
}

async function testImprovedMatching() {
  const pipeSnapshot = await db.collection("crm_pipeline").get();
  const pipelineMap = {};
  pipeSnapshot.docs.forEach((doc) => {
    pipelineMap[doc.id] = doc.data();
  });

  const leadsUrl = envVars.NEXT_PUBLIC_LEADS_SHEET_URL;
  const res = await fetch(`${leadsUrl}?action=list`);
  const data = await res.json();
  const leads = data.rows || [];

  const verifiedEmails = new Set();

  const statusCounts = {
    all: leads.length,
    new: 0, pending: 0, follow_up: 0, trial_requested: 0,
    hot_prospect: 0, future_prospect: 0, converted: 0, sale_rejected: 0,
  };

  leads.forEach((l) => {
    const eff = effectiveStatus(l.email, pipelineMap, verifiedEmails, l.phoneNumber, l.status, l.name);
    if (statusCounts[eff.status] !== undefined) {
      statusCounts[eff.status]++;
    }
  });

  console.log("\n==========================================");
  console.log("IMPROVED STATUS CHIP COUNTS (ALL TIME LEADS):");
  console.log(JSON.stringify(statusCounts, null, 2));
  console.log("==========================================\n");
}

testImprovedMatching().catch(console.error);
