/**
 * Signed session cookie: `<id>.<hmac>`, where id is 32 random bytes
 * (base64url) and hmac is HMAC-SHA256(id, SESSION_SECRET), also base64url.
 * Pure crypto, no database access, so the proxy can use it.
 */
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE = "oak_sid";

const SESSION_ID = /^[A-Za-z0-9_-]{43}$/;

export function newSessionId(): string {
  return randomBytes(32).toString("base64url");
}

function signature(id: string, secret: string): Buffer {
  return createHmac("sha256", secret).update(id).digest();
}

export function signSessionId(id: string, secret: string): string {
  return `${id}.${signature(id, secret).toString("base64url")}`;
}

/** Returns the session id when the cookie value is well-formed and authentic, otherwise null. */
export function verifySessionCookie(value: string | undefined, secret: string): string | null {
  if (!value) return null;
  const [id, mac, ...rest] = value.split(".");
  if (rest.length > 0 || !id || !mac || !SESSION_ID.test(id)) return null;
  const expected = signature(id, secret);
  const actual = Buffer.from(mac, "base64url");
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
  // Reject non-canonical encodings of the same bytes.
  return actual.toString("base64url") === mac ? id : null;
}

/** Reads one cookie from a raw Cookie header. */
export function readCookie(header: string | null, name: string): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const separator = part.indexOf("=");
    if (separator > 0 && part.slice(0, separator).trim() === name) return part.slice(separator + 1).trim();
  }
  return undefined;
}

export function isHttpsRequest(request: Request): boolean {
  const forwarded = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  return forwarded ? forwarded === "https" : new URL(request.url).protocol === "https:";
}

export function sessionCookieOptions(request: Request, ttlHours: number) {
  return {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: isHttpsRequest(request),
    maxAge: ttlHours * 3600,
  } as const;
}
