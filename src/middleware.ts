import { NextResponse, type NextRequest } from "next/server";
import { verifyCrmRoleToken } from "@/lib/jwt-auth";

const CRM_COOKIE = "bhookr_crm_role";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Protect everything under /crm/* EXCEPT the login page itself.
  if (pathname.startsWith("/crm") && pathname !== "/crm") {
    const roleCookie = req.cookies.get(CRM_COOKIE)?.value;
    const verified = roleCookie ? await verifyCrmRoleToken(roleCookie) : null;
    if (!verified) {
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
