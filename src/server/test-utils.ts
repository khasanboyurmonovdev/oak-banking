// Test-only helpers for the server layer.
import { createDatabase, type Database } from "./db";
import { newSessionId, signSessionId } from "./session/cookie";

export const TEST_SECRET = "test-only-session-secret-0123456789abcdef";

export function memoryDb(): Database {
  return createDatabase(":memory:");
}

export function sessionCookie(id = newSessionId()): { id: string; header: string } {
  return { id, header: `oak_sid=${signSessionId(id, TEST_SECRET)}` };
}
