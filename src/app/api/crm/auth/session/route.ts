import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import logger from "@/lib/logger";

import { signCrmRoleToken } from "@/lib/jwt-auth";

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
    const userEmail = String(decodedToken.email ?? "").toLowerCase().trim();

    // Fetch user document from Firestore users collection
    const userDoc = await adminDb.collection("users").doc(uid).get();

    if (
      !userDoc.exists ||
      !userDoc.data()?.role ||
      !VALID_CRM_ROLES.has(userDoc.data()?.role)
    ) {
      return NextResponse.json(
        { success: false, error: "No CRM access assigned to this account. Contact an administrator." },
        { status: 403 }
      );
    }

    const role = userDoc.data()!.role as string;

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

    // 2. Signed HTTP-only cookie indicating the CRM role (for frontend routing and middleware)
    const roleToken = await signCrmRoleToken({
      role,
      uid,
      email: userEmail,
    });

    cookieStore.set("bhookr_crm_role", roleToken, {
      httpOnly: true,
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
