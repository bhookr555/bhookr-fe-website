import { NextResponse, type NextRequest } from "next/server";

const CRM_COOKIE = "bhookr_crm_role";
const VALID_ROLES = new Set(["admin", "auditor", "manager", "telecaller"]);

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Protect everything under /crm/* EXCEPT the login page itself.
  if (pathname.startsWith("/crm") && pathname !== "/crm") {
    const role = req.cookies.get(CRM_COOKIE)?.value;
    if (!role || !VALID_ROLES.has(role)) {
      const url = req.nextUrl.clone();
      url.pathname = "/crm";
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/crm/:path*"],
};
