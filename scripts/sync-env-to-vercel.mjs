import { readFileSync } from "fs";
import { execSync } from "child_process";

const envContent = readFileSync(".env.local", "utf-8");
const lines = envContent.split("\n");

let currentKey = null;
let currentValue = "";
let inMultiline = false;

const envVars = {};

for (const line of lines) {
  if (inMultiline) {
    if (line.endsWith('"') || line.endsWith("'")) {
      currentValue += "\n" + line.slice(0, -1);
      envVars[currentKey] = currentValue;
      inMultiline = false;
      currentKey = null;
      currentValue = "";
    } else {
      currentValue += "\n" + line;
    }
    continue;
  }

  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;

  const eqIdx = line.indexOf("=");
  if (eqIdx === -1) continue;

  const key = line.slice(0, eqIdx).trim();
  let val = line.slice(eqIdx + 1).trim();

  if ((val.startsWith('"') && !val.endsWith('"')) || (val.startsWith("'") && !val.endsWith("'"))) {
    inMultiline = true;
    currentKey = key;
    currentValue = val.slice(1);
    continue;
  }

  if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
    val = val.slice(1, -1);
  }

  envVars[key] = val;
}

console.log(`Found ${Object.keys(envVars).length} environment variables to sync.`);

for (const [key, val] of Object.entries(envVars)) {
  try {
    console.log(`Setting ${key}...`);
    // Pass value via stdin to handle multi-line strings (like private keys) safely
    execSync(`npx vercel env add ${key} production,preview,development --force --yes`, {
      input: val,
      stdio: ["pipe", "pipe", "pipe"],
    });
    console.log(`✓ Set ${key}`);
  } catch (err) {
    console.warn(`! Failed to set ${key}:`, err.message);
  }
}

console.log("Done syncing environment variables to Vercel.");
