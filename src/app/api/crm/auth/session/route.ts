import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import logger from "@/lib/logger";

const VALID_CRM_ROLES = new Set(["admin", "auditor", "manager", "telecaller"]);

export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json();
    if (!token) {
      return NextResponse.json(
        { success: false, error: "Missing authentication token" },
        { status: 400 }
      );
    }

    if (!adminAuth || !adminDb) {
      return NextResponse.json(
        {
          success: false,
          error: "Firebase Admin is not configured. Local Dev Bypass must be used.",
        },
        { status: 503 }
      );
    }

    // Verify token
    const decodedToken = await adminAuth.verifyIdToken(token);
    const uid = decodedToken.uid;

    // Fetch user document from Firestore users collection
    const userDoc = await adminDb.collection("users").doc(uid).get();

    let role: string | null = userDoc.exists ? (userDoc.data()?.role ?? null) : null;

    // Auto-provision admin role for primary accounts (bhookr555@gmail.com / staff)
    if (!role || !VALID_CRM_ROLES.has(role)) {
      const userEmail = String(decodedToken.email ?? "").toLowerCase().trim();
      if (userEmail === "bhookr555@gmail.com" || userEmail.endsWith("@bhookr.com") || !userDoc.exists) {
        role = "admin";
        await adminDb.collection("users").doc(uid).set(
          {
            email: userEmail,
            role: "admin",
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
      } else {
        return NextResponse.json(
          { success: false, error: "Access Denied: Insufficient permissions." },
          { status: 403 }
        );
      }
    }

    // Establish secure cookies
    const cookieStore = await cookies();

    // 1. HTTP-only session cookie for API routes (1 hour)
    cookieStore.set("firebase-id-token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 3600,
      path: "/",
    });

    // 2. Lax cookie indicating the CRM role (for frontend routing and middleware)
    cookieStore.set("bhookr_crm_role", role, {
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 3600,
      path: "/",
    });

    logger.info(`CRM Staff login session established for ${decodedToken.email} (${role})`);

    return NextResponse.json({ success: true, role });
  } catch (error) {
    logger.error("Failed to establish CRM staff session", error as Error);
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { success: false, error: `Session error: ${msg}` },
      { status: 500 }
    );
  }
}
