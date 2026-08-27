/**
 * CRM auth — PROTOTYPE ONLY.
 * Replaces with Firebase Auth + per-staff accounts before production.
 * Shared password "0000" and role-as-username are NOT secure.
 */

export type CrmRole = "admin" | "auditor" | "manager" | "telecaller";

export interface CrmRoleMeta {
  value: CrmRole;
  label: string;
  readOnly: boolean;
  description: string;
}

export const CRM_ROLES: CrmRoleMeta[] = [
  {
    value: "admin",
    label: "Admin",
    readOnly: false,
    description: "Full access to everything",
  },
  {
    value: "auditor",
    label: "Auditor",
    readOnly: true,
    description: "Read-only access to everything",
  },
  {
    value: "manager",
    label: "Manager",
    readOnly: false,
    description: "Role scope to be defined",
  },
  {
    value: "telecaller",
    label: "Tele-caller",
    readOnly: false,
    description: "Role scope to be defined",
  },
];

export const CRM_DEMO_PASSWORD = "0000";
const COOKIE_NAME = "bhookr_crm_role";
const STORAGE_KEY = "bhookr_crm_role";

export function loginAs(role: CrmRole): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(STORAGE_KEY, role);
  // Note: Cookie is set server-side (httpOnly) via login/session API routes.
}

export function getCurrentRole(): CrmRole | null {
  if (typeof window === "undefined") return null;
  const stored = sessionStorage.getItem(STORAGE_KEY);
  if (!stored) return null;
  return CRM_ROLES.some((r) => r.value === stored) ? (stored as CrmRole) : null;
}

export async function logoutCrm(): Promise<void> {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(STORAGE_KEY);
  
  // Clear cookies client-side immediately
  document.cookie = `${COOKIE_NAME}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
  document.cookie = `firebase-id-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;

  try {
    // Clear cookies server-side
    await fetch("/api/auth/clear-session", { method: "POST" });
  } catch (err) {
    console.error("Failed to clear server session:", err);
  }

  try {
    const { auth } = await import("@/lib/firebase/config");
    const { signOut } = await import("firebase/auth");
    if (auth) {
      await signOut(auth);
    }
  } catch (err) {
    console.error("Failed to sign out from Firebase client:", err);
  }
}

export function getRoleMeta(role: CrmRole): CrmRoleMeta | undefined {
  return CRM_ROLES.find((r) => r.value === role);
}

export { COOKIE_NAME as CRM_COOKIE_NAME };
