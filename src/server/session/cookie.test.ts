import { describe, expect, it } from "vitest";
import { TEST_SECRET } from "../test-utils";
import { isHttpsRequest, newSessionId, readCookie, signSessionId, verifySessionCookie } from "./cookie";

describe("session cookie", () => {
  const id = newSessionId();
  const value = signSessionId(id, TEST_SECRET);

  it("mints 32 random bytes as base64url", () => {
    expect(id).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(Buffer.from(id, "base64url")).toHaveLength(32);
    expect(newSessionId()).not.toBe(id);
  });

  it("verifies its own signature", () => {
    expect(verifySessionCookie(value, TEST_SECRET)).toBe(id);
  });

  it("rejects tampered, re-signed, forged and malformed values", () => {
    const [, mac] = value.split(".");
    const otherId = newSessionId();
    const flipped = value.slice(0, -1) + (value.endsWith("A") ? "B" : "A");
    expect(verifySessionCookie(`${otherId}.${mac}`, TEST_SECRET)).toBeNull();
    expect(verifySessionCookie(flipped, TEST_SECRET)).toBeNull();
    expect(verifySessionCookie(signSessionId(id, "another-secret-another-secret-0000"), TEST_SECRET)).toBeNull();
    expect(verifySessionCookie(id, TEST_SECRET)).toBeNull();
    expect(verifySessionCookie(`${value}.extra`, TEST_SECRET)).toBeNull();
    expect(verifySessionCookie(`short.${mac}`, TEST_SECRET)).toBeNull();
    expect(verifySessionCookie("", TEST_SECRET)).toBeNull();
    expect(verifySessionCookie(undefined, TEST_SECRET)).toBeNull();
  });

  it("reads a cookie out of a header", () => {
    expect(readCookie(`theme=dark; oak_sid=${value}; other=1`, "oak_sid")).toBe(value);
    expect(readCookie("theme=dark", "oak_sid")).toBeUndefined();
    expect(readCookie(null, "oak_sid")).toBeUndefined();
  });

  it("marks the cookie secure only for HTTPS requests", () => {
    expect(isHttpsRequest(new Request("http://localhost/"))).toBe(false);
    expect(isHttpsRequest(new Request("https://example.test/"))).toBe(true);
    expect(isHttpsRequest(new Request("http://app/", { headers: { "x-forwarded-proto": "https" } }))).toBe(true);
  });
});
