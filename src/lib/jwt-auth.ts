import { SignJWT, jwtVerify } from "jose";

const getSecretKey = () => {
  const secret = process.env.CRM_SESSION_SECRET || "default_bhookr_crm_session_secret_change_in_prod";
  return new TextEncoder().encode(secret);
};

export async function signCrmRoleToken(payload: {
  role: string;
  uid?: string;
  email?: string;
}): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(getSecretKey());
}

export async function verifyCrmRoleToken(
  token: string
): Promise<{ role: string; uid?: string; email?: string } | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    const role = typeof payload.role === "string" ? payload.role : "";
    const VALID_ROLES = new Set(["admin", "auditor", "manager", "telecaller"]);
    if (VALID_ROLES.has(role)) {
      return {
        role,
        uid: typeof payload.uid === "string" ? payload.uid : undefined,
        email: typeof payload.email === "string" ? payload.email : undefined,
      };
    }
    return null;
  } catch {
    return null;
  }
}
