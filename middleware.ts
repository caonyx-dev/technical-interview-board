import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const COOKIE_NAME = "caonyx_interview_session";

async function isInterviewer(req: NextRequest): Promise<boolean> {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return false;
  const secret = process.env.JWT_SECRET;
  if (!secret) return false;
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
    return payload.role === "interviewer";
  } catch {
    return false;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Per-session state polling/writing is open to anyone with the link.
  // The route handler enforces the interviewer-only rule for problem edits.
  if (pathname.startsWith("/api/sessions/") && pathname.endsWith("/state")) {
    return NextResponse.next();
  }

  const ok = await isInterviewer(req);

  if (pathname.startsWith("/dashboard") || pathname.startsWith("/api/sessions")) {
    if (!ok) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "unauthorized" }, { status: 401 });
      }
      const url = req.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }
  }

  if (pathname === "/login" && ok) {
    const url = req.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/api/sessions/:path*", "/login"],
};
