import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { accountBalance, periodSummary, type TransferRequest } from "@/domain";
import type { Database } from "../db";
import { memoryDb } from "../test-utils";
import { ensureSession, loadSandbox } from "./sandbox";
import { createTransfer } from "./transfers";

const NOW = new Date("2026-11-06T09:30:00.000Z");
const SESSION = "alpha";
const KEY = "0f8fad5b-d9cb-469f-a165-70867728950e";
const request: TransferRequest = {
  fromAccountId: "acc_operating",
  toAccountId: "acc_reserve",
  amountCents: 1_000_00,
};

let db: Database;

const balances = () => {
  const { accounts, transactions } = loadSandbox(db, SESSION);
  return Object.fromEntries(accounts.map((account) => [account.id, accountBalance(account, transactions)]));
};

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
  db = memoryDb();
  ensureSession(db, SESSION, { ttlMs: 72 * 3_600_000, maxSessions: 10 });
});

afterEach(() => {
  db.close();
  vi.useRealTimers();
});

describe("createTransfer", () => {
  it("books two linked legs, moves both balances and leaves income/expense alone", () => {
    const before = balances();
    const summaryBefore = periodSummary(loadSandbox(db, SESSION).transactions, "30d", NOW);

    const outcome = createTransfer(db, SESSION, KEY, { ...request, description: "  Monthly top-up " });
    expect(outcome.kind).toBe("created");
    if (outcome.kind !== "created") return;
    const [out, inflow] = outcome.result.legs;
    expect(out).toMatchObject({ accountId: "acc_operating", amountCents: -1_000_00, description: "Monthly top-up" });
    expect(inflow).toMatchObject({ accountId: "acc_reserve", amountCents: 1_000_00, transferId: out.transferId });
    expect(out.occurredAt).toBe(NOW.toISOString());

    const after = balances();
    expect(after.acc_operating.ledgerCents).toBe(before.acc_operating.ledgerCents - 1_000_00);
    expect(after.acc_reserve.ledgerCents).toBe(before.acc_reserve.ledgerCents + 1_000_00);
    expect(outcome.result.balances.from).toEqual(after.acc_operating);
    expect(periodSummary(loadSandbox(db, SESSION).transactions, "30d", NOW)).toEqual(summaryBefore);
  });

  it("replays the original result for the same key and body, without a duplicate", () => {
    const first = createTransfer(db, SESSION, KEY, request);
    const count = loadSandbox(db, SESSION).transactions.length;
    const second = createTransfer(db, SESSION, KEY, request);

    expect(second.kind).toBe("replayed");
    if (first.kind !== "created" || second.kind !== "replayed") return;
    expect(second.result).toEqual(first.result);
    expect(loadSandbox(db, SESSION).transactions).toHaveLength(count);
  });

  it("returns a conflict when a key is reused with a different body", () => {
    createTransfer(db, SESSION, KEY, request);
    const count = loadSandbox(db, SESSION).transactions.length;
    expect(createTransfer(db, SESSION, KEY, { ...request, amountCents: 2_000_00 }).kind).toBe("conflict");
    expect(createTransfer(db, SESSION, KEY, { ...request, description: "Other" }).kind).toBe("conflict");
    expect(loadSandbox(db, SESSION).transactions).toHaveLength(count);
  });

  it("scopes idempotency keys to the session", () => {
    ensureSession(db, "beta", { ttlMs: 72 * 3_600_000, maxSessions: 10 });
    createTransfer(db, SESSION, KEY, request);
    expect(createTransfer(db, "beta", KEY, request).kind).toBe("created");
  });

  it("writes nothing when the second leg fails", () => {
    const before = loadSandbox(db, SESSION);
    db.exec(`
      CREATE TEMP TRIGGER fail_inflow_leg BEFORE INSERT ON transactions
      WHEN NEW.method = 'transfer' AND NEW.amount_cents > 0
      BEGIN SELECT RAISE(ABORT, 'forced failure on the second leg'); END;
    `);

    expect(() => createTransfer(db, SESSION, KEY, request)).toThrow(/forced failure/);
    expect(loadSandbox(db, SESSION)).toEqual(before);
    expect(db.get("SELECT COUNT(*) AS n FROM idempotency_keys")?.n).toBe(0);

    // The key was not consumed: once the fault is gone, the same request succeeds.
    db.exec("DROP TRIGGER fail_inflow_leg");
    expect(createTransfer(db, SESSION, KEY, request).kind).toBe("created");
  });

  it("rejects insufficient funds, same-account and inactive accounts without writing", () => {
    const available = balances().acc_payroll.availableCents;
    const count = loadSandbox(db, SESSION).transactions.length;

    expect(
      createTransfer(db, SESSION, KEY, { ...request, fromAccountId: "acc_payroll", amountCents: available + 1 }),
    ).toEqual({ kind: "rejected", error: "insufficient_funds" });
    expect(createTransfer(db, SESSION, KEY, { ...request, toAccountId: "acc_operating" })).toEqual({
      kind: "rejected",
      error: "same_account",
    });
    expect(createTransfer(db, SESSION, KEY, { ...request, toAccountId: "acc_missing" })).toEqual({
      kind: "rejected",
      error: "unknown_account",
    });
    db.run("UPDATE accounts SET status = 'inactive' WHERE session_id = ? AND id = 'acc_reserve'", [SESSION]);
    expect(createTransfer(db, SESSION, KEY, request)).toEqual({ kind: "rejected", error: "inactive_account" });

    expect(loadSandbox(db, SESSION).transactions).toHaveLength(count);
    expect(db.get("SELECT COUNT(*) AS n FROM idempotency_keys")?.n).toBe(0);
  });

  it("checks funds against the available balance, so holds count", () => {
    const { ledgerCents, availableCents, holdsCents } = balances().acc_operating;
    expect(holdsCents).toBeGreaterThan(0);
    const between = { ...request, amountCents: availableCents + 1 };
    expect(between.amountCents).toBeLessThanOrEqual(ledgerCents);
    expect(createTransfer(db, SESSION, KEY, between)).toEqual({ kind: "rejected", error: "insufficient_funds" });
    expect(createTransfer(db, SESSION, KEY, { ...request, amountCents: availableCents }).kind).toBe("created");
  });
});
