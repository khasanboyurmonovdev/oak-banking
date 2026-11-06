/**
 * Per-session sandboxes: lazy creation and seeding, sliding TTL, the session
 * cap, loading a session's data, and demo reset.
 */
import { generateSeed, type Account, type Transaction } from "@/domain";
import { now } from "../clock";
import type { Database } from "../db";
import { getEnv } from "../env";
import { deleteAccounts, insertAccounts, listAccounts } from "../repositories/accounts";
import { deleteIdempotencyRecords } from "../repositories/idempotency";
import {
  deleteLeastRecentlySeen,
  deleteSession,
  deleteSessionsSeenBefore,
  findSession,
  insertSession,
  setSessionSeededAt,
  touchSession,
} from "../repositories/sessions";
import { deleteTransactions, insertTransactions, listTransactions } from "../repositories/transactions";

export type SessionPolicy = { ttlMs: number; maxSessions: number };

export function sessionPolicy(): SessionPolicy {
  const env = getEnv();
  return { ttlMs: env.sessionTtlHours * 3_600_000, maxSessions: env.maxSessions };
}

/** last_seen_at is only rewritten when older than this, to avoid a write per request. */
const TOUCH_INTERVAL_MS = 60_000;

function seed(db: Database, sessionId: string, at: Date): void {
  const { accounts, transactions } = generateSeed({ now: at });
  insertAccounts(db, sessionId, accounts);
  insertTransactions(db, sessionId, transactions);
}

/**
 * Makes sure the session has a live, seeded sandbox. Idempotent: an existing
 * live session is only touched (sliding TTL). An expired one is replaced by a
 * fresh sandbox. Creating a session first purges expired sessions and evicts
 * the least recently seen ones beyond the cap.
 */
export function ensureSession(db: Database, sessionId: string, policy: SessionPolicy = sessionPolicy()): void {
  const time = now().getTime();
  db.transaction(() => {
    const existing = findSession(db, sessionId);
    if (existing && existing.lastSeenAt >= time - policy.ttlMs) {
      if (time - existing.lastSeenAt >= TOUCH_INTERVAL_MS) touchSession(db, sessionId, time);
      return;
    }
    if (existing) deleteSession(db, sessionId);
    deleteSessionsSeenBefore(db, time - policy.ttlMs);
    deleteLeastRecentlySeen(db, policy.maxSessions - 1);
    insertSession(db, { id: sessionId, createdAt: time, lastSeenAt: time, seededAt: time });
    seed(db, sessionId, new Date(time));
  });
}

export type Sandbox = { accounts: Account[]; transactions: Transaction[] };

export function loadSandbox(db: Database, sessionId: string): Sandbox {
  return { accounts: listAccounts(db, sessionId), transactions: listTransactions(db, sessionId) };
}

/** Wipes this session's data and reseeds it as of now. Other sessions are untouched. */
export function resetSandbox(db: Database, sessionId: string): { accounts: number; transactions: number } {
  const time = now();
  return db.transaction(() => {
    deleteIdempotencyRecords(db, sessionId);
    deleteTransactions(db, sessionId);
    deleteAccounts(db, sessionId);
    seed(db, sessionId, time);
    setSessionSeededAt(db, sessionId, time.getTime());
    const { accounts, transactions } = loadSandbox(db, sessionId);
    return { accounts: accounts.length, transactions: transactions.length };
  });
}
