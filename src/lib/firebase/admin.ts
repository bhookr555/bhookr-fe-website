import { initializeApp, getApps, cert, App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

let app: App | undefined;

// Initialize Firebase Admin (server-side only)
if (getApps().length === 0) {
  try {
    // Format the private key properly (handle escaped newlines)
    const privateKey = process.env.FIREBASE_PRIVATE_KEY
      ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n")
      : undefined;

    if (!privateKey || !process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL) {
      console.error("[Firebase Admin] Missing required environment variables:");
      console.error("  - FIREBASE_PROJECT_ID:", !!process.env.FIREBASE_PROJECT_ID);
      console.error("  - FIREBASE_CLIENT_EMAIL:", !!process.env.FIREBASE_CLIENT_EMAIL);
      console.error("  - FIREBASE_PRIVATE_KEY:", !!process.env.FIREBASE_PRIVATE_KEY);
      throw new Error("Firebase Admin: Missing required environment variables. Please check your .env.local file.");
    }

    app = initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: privateKey,
      }),
    });

    console.log("[Firebase Admin] Initialized successfully");
  } catch (error) {
    console.error("[Firebase Admin] Initialization error:", error);
    console.error("[Firebase Admin] Payment operations will fail without proper initialization.");
    // Re-throw to prevent app from starting in broken state
    throw error;
  }
} else {
  app = getApps()[0];
  console.log("[Firebase Admin] Using existing app");
}

// Export services
export const adminAuth = app ? getAuth(app) : null;
export const adminDb = app ? getFirestore(app) : null;

export default app;
