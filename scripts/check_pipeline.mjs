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

async function checkPipeline() {
  const snapshot = await db.collection("crm_pipeline").get();
  console.log(`Total documents in Firestore crm_pipeline collection: ${snapshot.docs.length}`);
  snapshot.docs.forEach((doc) => {
    console.log(`- Doc ID: ${doc.id} =>`, JSON.stringify(doc.data()));
  });
}

checkPipeline().catch(console.error);
