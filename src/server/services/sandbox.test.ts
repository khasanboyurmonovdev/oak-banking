import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { consolidatedBalance, generateSeed } from "@/domain";
import type { Database } from "../db";
import { countSessions, findSession } from "../repositories/sessions";
import { memoryDb } from "../test-utils";
import { ensureSession, loadSandbox, resetSandbox, type SessionPolicy } from "./sandbox";
import { setTransactionNote } from "./transactions";
import { createTransfer } from "./transfers";

const HOUR = 3_600_000;
const START = new Date("2026-11-06T09:30:00.000Z");
const policy: SessionPolicy = { ttlMs: 72 * HOUR, maxSessions: 3 };

let db: Database;

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(START);
  db = memoryDb();
});

afterEach(() => {
  db.close();
  vi.useRealTimers();
});

describe("lazy sandbox creation", () => {
  it("seeds a new session with the seed as of its creation time", () => {
    ensureSession(db, "alpha", policy);
    expect(loadSandbox(db, "alpha")).toEqual(generateSeed({ now: START }));
  });

  it("is idempotent", () => {
    ensureSession(db, "alpha", policy);
    setTransactionNote(db, "alpha", "txn_0001", "kept");
    ensureSession(db, "alpha", policy);
    ensureSession(db, "alpha", policy);
    const { transactions } = loadSandbox(db, "alpha");
    expect(transactions).toHaveLength(generateSeed({ now: START }).transactions.length);
    expect(transactions.find((tx) => tx.id === "txn_0001")?.note).toBe("kept");
    expect(countSessions(db)).toBe(1);
  });
});

describe("session isolation", () => {
  it("keeps each session's data invisible and unchangeable to the others", () => {
    ensureSession(db, "alpha", policy);
    ensureSession(db, "beta", policy);
    const before = loadSandbox(db, "beta");

    setTransactionNote(db, "alpha", "txn_0001", "alpha only");
    createTransfer(db, "alpha", "7d3c1f0e-3a55-4b8e-9a43-0c7f3f2a1b10", {
      fromAccountId: "acc_operating",
      toAccountId: "acc_reserve",
      amountCents: 1_000_00,
    });
    expect(loadSandbox(db, "beta")).toEqual(before);
    expect(loadSandbox(db, "alpha").transactions).toHaveLength(before.transactions.length + 2);
    expect(setTransactionNote(db, "gamma", "txn_0001", "nope")).toBeUndefined();
    expect(loadSandbox(db, "gamma")).toEqual({ accounts: [], transactions: [] });
  });
});

describe("reset", () => {
  it("restores the seed and drops idempotency records, for this session only", () => {
    ensureSession(db, "alpha", policy);
    ensureSession(db, "beta", policy);
    setTransactionNote(db, "beta", "txn_0003", "beta keeps this");
    const key = "1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed";
    const request = { fromAccountId: "acc_operating", toAccountId: "acc_payroll", amountCents: 50_00 };
    createTransfer(db, "alpha", key, request);
    setTransactionNote(db, "alpha", "txn_0001", "temporary");

    vi.setSystemTime(new Date(START.getTime() + 2 * HOUR));
    expect(resetSandbox(db, "alpha").transactions).toBe(generateSeed({ now: new Date() }).transactions.length);

    expect(loadSandbox(db, "alpha")).toEqual(generateSeed({ now: new Date() }));
    expect(createTransfer(db, "alpha", key, request).kind).toBe("created");
    expect(loadSandbox(db, "beta").transactions.find((tx) => tx.id === "txn_0003")?.note).toBe("beta keeps this");
  });
});

describe("expiry and the session cap", () => {
  it("slides the TTL on use and replaces an expired sandbox with a fresh one", () => {
    ensureSession(db, "alpha", policy);
    setTransactionNote(db, "alpha", "txn_0001", "old");

    vi.setSystemTime(new Date(START.getTime() + 60 * HOUR));
    ensureSession(db, "alpha", policy);
    vi.setSystemTime(new Date(START.getTime() + 120 * HOUR)); // 60h after last use: still live
    ensureSession(db, "alpha", policy);
    expect(loadSandbox(db, "alpha").transactions.find((tx) => tx.id === "txn_0001")?.note).toBe("old");

    vi.setSystemTime(new Date(START.getTime() + 193 * HOUR)); // 73h idle: expired
    ensureSession(db, "alpha", policy);
    expect(loadSandbox(db, "alpha").transactions.find((tx) => tx.id === "txn_0001")?.note).toBeUndefined();
    expect(findSession(db, "alpha")?.createdAt).toBe(START.getTime() + 193 * HOUR);
  });

  it("purges expired sessions when a new session is created", () => {
    ensureSession(db, "old", policy);
    vi.setSystemTime(new Date(START.getTime() + 50 * HOUR));
    ensureSession(db, "recent", policy);
    vi.setSystemTime(new Date(START.getTime() + 73 * HOUR));
    ensureSession(db, "new", policy);

    expect(findSession(db, "old")).toBeUndefined();
    expect(findSession(db, "recent")).toBeDefined();
    // Cascade removed the purged session's data too.
    expect(db.get("SELECT COUNT(*) AS n FROM transactions WHERE session_id = 'old'")?.n).toBe(0);
    expect(db.get("SELECT COUNT(*) AS n FROM accounts WHERE session_id = 'old'")?.n).toBe(0);
  });

  it("evicts the least recently seen sessions beyond MAX_SESSIONS", () => {
    for (const [index, id] of ["s1", "s2", "s3"].entries()) {
      vi.setSystemTime(new Date(START.getTime() + index * HOUR));
      ensureSession(db, id, policy);
    }
    vi.setSystemTime(new Date(START.getTime() + 3 * HOUR));
    ensureSession(db, "s1", policy); // s1 is now the most recently seen
    ensureSession(db, "s4", policy);

    expect(countSessions(db)).toBe(3);
    expect(findSession(db, "s2")).toBeUndefined();
    expect(["s1", "s3", "s4"].every((id) => findSession(db, id))).toBe(true);
  });

  it("keeps balances derived: the sandbox stores no balance columns", () => {
    ensureSession(db, "alpha", policy);
    const columns = db.all("PRAGMA table_info(accounts)").map((row) => row.name);
    expect(columns).not.toContain("ledger_cents");
    const { accounts, transactions } = loadSandbox(db, "alpha");
    const seed = generateSeed({ now: START });
    expect(consolidatedBalance(accounts, transactions)).toEqual(consolidatedBalance(seed.accounts, seed.transactions));
  });
});
