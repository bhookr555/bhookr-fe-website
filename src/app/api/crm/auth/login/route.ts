import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { CRM_DEMO_PASSWORD, type CrmRole } from "@/lib/crm/auth";
import logger from "@/lib/logger";

import { signCrmRoleToken } from "@/lib/jwt-auth";

const VALID_CRM_ROLES = new Set(["admin", "auditor", "manager", "telecaller"]);

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: "Email and password are required" },
        { status: 400 }
      );
    }

    const trimmedEmail = String(email).trim().toLowerCase();
    const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

    let idToken: string | null = null;
    let uid: string | null = null;

    // 1. Try server-side Firebase Auth REST API
    if (apiKey) {
      try {
        const fbRes = await fetch(
          `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: trimmedEmail,
              password,
              returnSecureToken: true,
            }),
          }
        );

        const fbData = await fbRes.json();

        if (fbRes.ok && fbData.idToken) {
          idToken = fbData.idToken;
          uid = fbData.localId;
        } else if (fbData.error?.message) {
          const errCode = fbData.error.message;
          if (
            errCode === "INVALID_PASSWORD" ||
            errCode === "EMAIL_NOT_FOUND" ||
            errCode === "INVALID_LOGIN_CREDENTIALS"
          ) {
            return NextResponse.json(
              { success: false, error: "Invalid email or password. Please try again." },
              { status: 401 }
            );
          }
        }
      } catch (fbErr) {
        logger.warn("Server-side Firebase REST auth failed:", fbErr as Error);
      }
    }

    // 2. Determine Role & Validate Access
    let userRole: CrmRole = "admin";

    if (idToken && uid && adminDb && adminAuth) {
      // Fetch staff record from Firestore
      const userDoc = await adminDb.collection("users").doc(uid).get();
      if (
        userDoc.exists &&
        userDoc.data()?.role &&
        VALID_CRM_ROLES.has(userDoc.data()?.role)
      ) {
        userRole = userDoc.data()!.role as CrmRole;
      } else {
        return NextResponse.json(
          { success: false, error: "No CRM access assigned to this account. Contact an administrator." },
          { status: 403 }
        );
      }
    } else {
      // Fallback: Validate password against demo credentials
      if (password !== CRM_DEMO_PASSWORD) {
        return NextResponse.json(
          { success: false, error: "Invalid email or password. Please try again." },
          { status: 401 }
        );
      }
    }

    // 3. Set Session Cookies
    const cookieStore = await cookies();

    if (idToken) {
      cookieStore.set("firebase-id-token", idToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 3600,
        path: "/",
      });
    }

    const roleToken = await signCrmRoleToken({
      role: userRole,
      uid: uid || undefined,
      email: trimmedEmail,
    });

    cookieStore.set("bhookr_crm_role", roleToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 3600,
      path: "/",
    });

    logger.info(`CRM Staff login (server relay) successful for ${trimmedEmail} (${userRole})`);

    return NextResponse.json({ success: true, role: userRole });
  } catch (error) {
    logger.error("Failed server-side CRM login", error as Error);
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { success: false, error: `Login error: ${msg}` },
      { status: 500 }
    );
  }
}
