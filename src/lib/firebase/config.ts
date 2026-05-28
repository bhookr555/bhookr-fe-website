import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getAnalytics, isSupported } from "firebase/analytics";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// True only when the public API key is provided. In production this is always
// set; in local dev without .env.local it is undefined, and we degrade
// gracefully instead of crashing the entire app at module load.
export const isFirebaseConfigured = Boolean(firebaseConfig.apiKey);

let app: FirebaseApp | undefined;
let authInstance: Auth | undefined;
let dbInstance: Firestore | undefined;

if (isFirebaseConfigured) {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  authInstance = getAuth(app);
  dbInstance = getFirestore(app);
} else if (typeof window !== "undefined") {
  console.warn(
    "[Firebase] Skipped initialization — NEXT_PUBLIC_FIREBASE_API_KEY is missing. " +
      "Auth and Firestore are disabled in this environment. " +
      "Copy .env.example to .env.local with real credentials to enable them."
  );
}

// Cast to non-null so existing consumers don't need null checks. Any runtime
// access in an unconfigured environment will throw a clear Firebase error,
// but module load (and therefore page render) succeeds.
export const auth = authInstance as Auth;
export const db = dbInstance as Firestore;

// Configure Google Auth Provider
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

// Initialize Analytics (only in browser AND only when Firebase is configured)
export const analytics =
  typeof window !== "undefined" && app
    ? isSupported()
        .then((yes) => (yes && app ? getAnalytics(app) : null))
        .catch(() => null)
    : null;

export default app;
