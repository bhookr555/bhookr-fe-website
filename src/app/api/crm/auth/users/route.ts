import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { authorizeCrmStaff } from "@/lib/api-auth";
import logger from "@/lib/logger";

export const dynamic = "force-dynamic";

/**
 * GET /api/crm/auth/users
 * Lists all staff members
 */
export async function GET(req: NextRequest) {
  const authStatus = await authorizeCrmStaff(req);
  if (!authStatus.authorized) {
    return NextResponse.json({ success: false, error: authStatus.error || "Forbidden" }, { status: 403 });
  }

  // Bypass if Firebase is not initialized
  if (!adminAuth || !adminDb) {
    return NextResponse.json({
      success: true,
      users: [
        { id: "mock-admin", email: "admin@mock.com", role: "admin", name: "Mock Admin" },
        { id: "mock-manager", email: "manager@mock.com", role: "manager", name: "Mock Manager" },
        { id: "mock-telecaller", email: "telecaller@mock.com", role: "telecaller", name: "Mock Telecaller" },
      ],
      isMock: true,
    });
  }

  try {
    const snapshot = await adminDb.collection("users").get();
    const users = snapshot.docs
      .map((doc) => {
        const data = doc.data();
        // Only return users who have CRM roles
        return {
          id: doc.id,
          email: data.email || "",
          name: data.name || "",
          role: data.role || "user",
          createdAt: data.createdAt,
          lastLogin: data.lastLogin,
        };
      })
      .filter((u) => ["admin", "auditor", "manager", "telecaller"].includes(u.role));

    return NextResponse.json({ success: true, users });
  } catch (error) {
    logger.error("Failed to list staff users", error as Error);
    return NextResponse.json({ success: false, error: "Failed to list users" }, { status: 500 });
  }
}

/**
 * POST /api/crm/auth/users
 * Handles user mutations (create, reset-password, delete, change-self-password)
 */
export async function POST(req: NextRequest) {
  const authStatus = await authorizeCrmStaff(req);
  if (!authStatus.authorized) {
    return NextResponse.json({ success: false, error: authStatus.error || "Forbidden" }, { status: 403 });
  }

  // If Firebase is not initialized, mock success for local dev
  if (!adminAuth || !adminDb) {
    return NextResponse.json({ success: true, message: "Action simulated (Firebase not configured)" });
  }

  try {
    const body = await req.json();
    const { action, email, password, role, name, userId, newPassword } = body;

    const userRole = authStatus.role;
    const isCallerAdmin = userRole === "admin";

    // 1. CREATE USER (Admin only)
    if (action === "create") {
      if (!isCallerAdmin) {
        return NextResponse.json({ success: false, error: "Only admins can create staff" }, { status: 403 });
      }

      if (!email || !password || !role) {
        return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
      }

      // Create in Firebase Auth
      const userRecord = await adminAuth.createUser({
        email,
        password,
        displayName: name || undefined,
      });

      // Create document in Firestore users collection
      await adminDb.collection("users").doc(userRecord.uid).set({
        email,
        name: name || "",
        role,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      logger.info(`CRM User created: ${email} with role: ${role}`);
      return NextResponse.json({ success: true, userId: userRecord.uid });
    }

    // 2. RESET PASSWORD (Admin only)
    if (action === "reset-password") {
      if (!isCallerAdmin) {
        return NextResponse.json({ success: false, error: "Only admins can reset passwords" }, { status: 403 });
      }

      if (!userId || !newPassword) {
        return NextResponse.json({ success: false, error: "Missing userId or newPassword" }, { status: 400 });
      }

      await adminAuth.updateUser(userId, { password: newPassword });

      logger.info(`CRM User password reset for UID: ${userId}`);
      return NextResponse.json({ success: true });
    }

    // 3. DELETE USER (Admin only)
    if (action === "delete") {
      if (!isCallerAdmin) {
        return NextResponse.json({ success: false, error: "Only admins can delete staff" }, { status: 403 });
      }

      if (!userId) {
        return NextResponse.json({ success: false, error: "Missing userId" }, { status: 400 });
      }

      // Delete from Firebase Auth
      await adminAuth.deleteUser(userId);

      // Delete Firestore record
      await adminDb.collection("users").doc(userId).delete();

      logger.info(`CRM User deleted: ${userId}`);
      return NextResponse.json({ success: true });
    }

    // 4. CHANGE SELF PASSWORD (Any authorized caller)
    if (action === "change-self-password") {
      // Find calling user UID from cookie token
      const sessionToken = req.cookies.get("firebase-id-token")?.value;
      if (!sessionToken) {
        return NextResponse.json({ success: false, error: "Missing session token" }, { status: 401 });
      }

      const decodedToken = await adminAuth.verifyIdToken(sessionToken);
      const callerUid = decodedToken.uid;

      if (!newPassword) {
        return NextResponse.json({ success: false, error: "Missing new password" }, { status: 400 });
      }

      await adminAuth.updateUser(callerUid, { password: newPassword });

      logger.info(`CRM User changed self password for UID: ${callerUid}`);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, error: "Unknown action" }, { status: 400 });
  } catch (error: any) {
    logger.error("Failed to perform user mutation", error as Error);
    return NextResponse.json({ success: false, error: error.message || "Failed to edit user" }, { status: 500 });
  }
}
