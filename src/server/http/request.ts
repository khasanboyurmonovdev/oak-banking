/** Request helpers shared by the route handlers: session, guards and input parsing. */
import { z } from "zod";
import { getDb } from "../db";
import { getEnv } from "../env";
import { ensureSession } from "../services/sandbox";
import { readCookie, SESSION_COOKIE, verifySessionCookie } from "../session/cookie";
import { clientIp, mutationLimiter } from "./rate-limit";
import { ApiError, type FieldErrors } from "./response";

export const MAX_BODY_BYTES = 8 * 1024;

function sessionIdFrom(request: Request): string | null {
  return verifySessionCookie(readCookie(request.headers.get("cookie"), SESSION_COOKIE), getEnv().sessionSecret);
}

/**
 * Resolves the caller's sandbox, creating and seeding it on first use. The
 * proxy mints the cookie, so a missing or tampered one means the request did
 * not come through the app.
 */
export function requireSession(request: Request): string {
  const sessionId = sessionIdFrom(request);
  if (!sessionId) throw new ApiError(401, "session_required", "A valid demo session cookie is required.");
  ensureSession(getDb(), sessionId);
  return sessionId;
}

function validationError(error: z.ZodError, message = "Some fields are invalid."): ApiError {
  const { formErrors, fieldErrors } = z.flattenError(error);
  const fields = Object.fromEntries(
    Object.entries(fieldErrors).filter((entry): entry is [string, string[]] => Array.isArray(entry[1])),
  ) satisfies FieldErrors;
  return new ApiError(400, "validation_error", formErrors[0] ?? message, fields);
}

export function parseInput<T>(schema: z.ZodType<T>, input: unknown, message?: string): T {
  const result = schema.safeParse(input);
  if (!result.success) throw validationError(result.error, message);
  return result.data;
}

export function parseSearchParams<T>(schema: z.ZodType<T>, request: Request): T {
  return parseInput(schema, Object.fromEntries(new URL(request.url).searchParams), "Invalid query parameters.");
}

/**
 * Rejects mutations whose `Origin` host differs from the host the browser
 * addressed. `X-Forwarded-Host` is trusted only because production binds the
 * app to 127.0.0.1, so Nginx is the sole caller and it overwrites the header
 * with `$http_host` (deploy/nginx/oak-banking.conf). Exposing the port
 * directly would let clients choose this header.
 */
function assertSameOrigin(request: Request): void {
  const origin = request.headers.get("origin");
  if (origin === null) return;
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? new URL(request.url).host;
  let originHost: string | null = null;
  try {
    originHost = new URL(origin).host;
  } catch {
    // "null" or malformed origins fall through to the rejection below.
  }
  if (originHost !== host) throw new ApiError(403, "forbidden_origin", "Cross-origin requests are not allowed.");
}

function assertRateLimit(request: Request): void {
  const key = sessionIdFrom(request) ?? `ip:${clientIp(request)}`;
  const decision = mutationLimiter.take(key);
  if (!decision.allowed) {
    throw new ApiError(429, "rate_limited", "Too many requests. Please wait a moment and try again.", undefined, {
      "Retry-After": String(decision.retryAfterSeconds),
    });
  }
}

async function readCappedText(request: Request): Promise<string> {
  const declared = Number(request.headers.get("content-length") ?? "0");
  const tooLarge = () => new ApiError(413, "payload_too_large", `Request bodies are limited to ${MAX_BODY_BYTES} bytes.`);
  if (declared > MAX_BODY_BYTES) throw tooLarge();
  if (!request.body) return "";

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BODY_BYTES) {
      await reader.cancel();
      throw tooLarge();
    }
    chunks.push(value);
  }
  return new TextDecoder().decode(Buffer.concat(chunks));
}

/**
 * Guards every mutating request, in order: same origin (403), rate limit
 * (429), session (401), JSON content type (415), body size (413), JSON
 * syntax and schema (400). An empty body is read as `{}`.
 */
export async function readMutation<T>(request: Request, schema: z.ZodType<T>): Promise<{ sessionId: string; body: T }> {
  assertSameOrigin(request);
  assertRateLimit(request);
  const sessionId = requireSession(request);

  const contentType = request.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase();
  if (contentType !== "application/json") {
    throw new ApiError(415, "unsupported_media_type", "Send the request body as application/json.");
  }
  const text = await readCappedText(request);
  let json: unknown = {};
  if (text.trim() !== "") {
    try {
      json = JSON.parse(text);
    } catch {
      throw new ApiError(400, "invalid_json", "The request body is not valid JSON.");
    }
  }
  return { sessionId, body: parseInput(schema, json) };
}
