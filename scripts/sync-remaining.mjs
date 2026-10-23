import { readFileSync } from "fs";
import { execSync } from "child_process";

const envContent = readFileSync(".env.local", "utf-8");
const keys = [
  "NEXT_PUBLIC_FIREBASE_API_KEY",
  "NEXT_PUBLIC_FIREBASE_DATABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
];

for (const k of keys) {
  const match = envContent.match(new RegExp("^" + k + "=(.*)$", "m"));
  if (match) {
    let val = match[1].trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    console.log("Adding " + k + "...");
    try {
      execSync(`npx vercel env add ${k} production,preview,development --no-sensitive --force --yes`, {
        input: val,
        stdio: ["pipe", "pipe", "pipe"],
      });
      console.log("✓ Added " + k);
    } catch (e) {
      console.error("Error adding " + k, e.message);
    }
  }
}
