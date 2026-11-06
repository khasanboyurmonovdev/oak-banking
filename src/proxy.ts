import { NextResponse, type NextRequest } from "next/server";
import { getEnv } from "@/server/env";
import {
  newSessionId,
  SESSION_COOKIE,
  sessionCookieOptions,
  signSessionId,
  verifySessionCookie,
} from "@/server/session/cookie";

/**
 * Mints the signed demo-session cookie (no database access here). A missing
 * or tampered cookie is replaced, and the new value is also written into this
 * request so the page or API call that follows already sees it. The cookie is
 * re-sent on every response to slide its expiry.
 */
export function proxy(request: NextRequest) {
  const { sessionSecret, sessionTtlHours } = getEnv();
  const current = request.cookies.get(SESSION_COOKIE)?.value;
  const valid = verifySessionCookie(current, sessionSecret) ? current : undefined;
  const value = valid ?? signSessionId(newSessionId(), sessionSecret);
  if (value !== current) request.cookies.set(SESSION_COOKIE, value);

  const response = NextResponse.next({ request: { headers: request.headers } });
  response.cookies.set(SESSION_COOKIE, value, sessionCookieOptions(request, sessionTtlHours));
  return response;
}

export const config = {
  // Everything except static assets and the session-free health check.
  matcher: ["/((?!_next/static|_next/image|api/health|favicon.ico|icon.svg|robots.txt).*)"],
};
