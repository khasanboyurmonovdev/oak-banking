import { describe, expect, it } from "vitest";
import { runwayMonths } from "./analytics";
import { consolidatedBalance } from "./balances";
import { CATEGORY_IDS } from "./categories";
import { addUtcDays, DAY_MS, startOfUtcDay } from "./dates";
import { generateSeed } from "./seed";
import { TRANSACTION_METHODS, TRANSACTION_STATUSES, type Transaction } from "./types";

const NOW = new Date("2026-11-06T09:30:00.000Z");

// Month ends, year ends and a leap day shift every calendar-driven schedule.
const SAMPLE_DAYS = [
  "2026-11-06",
  "2026-01-01",
  "2026-02-28",
  "2026-03-01",
  "2026-06-15",
  "2026-08-31",
  "2026-12-31",
  "2028-02-29",
].map((day) => new Date(`${day}T14:00:00.000Z`));

describe("determinism", () => {
  it("is identical for the same seed and UTC day, whatever the time of day", () => {
    const morning = generateSeed({ now: new Date("2026-11-06T00:00:01.000Z") });
    const evening = generateSeed({ now: new Date("2026-11-06T23:59:59.000Z") });
    expect(evening).toEqual(morning);
  });

  it("changes with the seed", () => {
    const a = generateSeed({ now: NOW, seed: "alpha" });
    const b = generateSeed({ now: NOW, seed: "beta" });
    expect(a.transactions).not.toEqual(b.transactions);
  });

  it("moves dates with the day while keeping the structure", () => {
    const today = generateSeed({ now: NOW });
    const tomorrow = generateSeed({ now: addUtcDays(NOW, 1) });
    const latest = (txs: Transaction[]) => txs[txs.length - 1].occurredAt.slice(0, 10);
    expect(latest(today.transactions)).not.toBe(latest(tomorrow.transactions));
    expect(tomorrow.accounts.map((account) => account.id)).toEqual(today.accounts.map((account) => account.id));
    expect(Math.abs(tomorrow.transactions.length - today.transactions.length)).toBeLessThan(15);
  });
});

describe.each(SAMPLE_DAYS)("seed invariants for %s", (now) => {
  const { accounts, transactions } = generateSeed({ now });
  const today = startOfUtcDay(now);

  it("has three active accounts with fictional masked numbers", () => {
    expect(accounts.map((account) => account.kind)).toEqual(["operating", "payroll", "reserve"]);
    for (const account of accounts) {
      expect(account.status).toBe("active");
      expect(account.maskedNumber).toMatch(/^•••• \d{4}$/);
      expect(Number.isSafeInteger(account.openingBalanceCents)).toBe(true);
    }
  });

  it("has 350–450 well-formed transactions", () => {
    expect(transactions.length).toBeGreaterThanOrEqual(350);
    expect(transactions.length).toBeLessThanOrEqual(450);
    const accountIds = new Set(accounts.map((account) => account.id));
    expect(new Set(transactions.map((tx) => tx.id)).size).toBe(transactions.length);
    for (const tx of transactions) {
      expect(Number.isSafeInteger(tx.amountCents) && tx.amountCents !== 0).toBe(true);
      expect(accountIds.has(tx.accountId)).toBe(true);
      expect(TRANSACTION_STATUSES).toContain(tx.status);
      expect(TRANSACTION_METHODS).toContain(tx.method);
      expect(CATEGORY_IDS).toContain(tx.category);
      expect(tx.reference).toMatch(/^OAK-[0-9A-Z]{6}$/);
      expect(new Date(tx.occurredAt).toISOString()).toBe(tx.occurredAt);
    }
  });

  it("covers about 12 months and never dates anything today or later", () => {
    const times = transactions.map((tx) => Date.parse(tx.occurredAt));
    expect(Math.max(...times)).toBeLessThan(today.getTime());
    expect(Math.min(...times)).toBeGreaterThanOrEqual(addUtcDays(today, -366).getTime());
    expect(Math.min(...times)).toBeLessThan(addUtcDays(today, -355).getTime());
  });

  it("links every transfer as exactly two legs that net to zero", () => {
    const groups = Map.groupBy(
      transactions.filter((tx) => tx.method === "transfer"),
      (tx) => tx.transferId,
    );
    expect(groups.size).toBeGreaterThan(20);
    for (const legs of groups.values()) {
      expect(legs).toHaveLength(2);
      expect(legs[0].amountCents + legs[1].amountCents).toBe(0);
      expect(legs[0].accountId).not.toBe(legs[1].accountId);
      expect(legs[0].reference).toBe(legs[1].reference);
      expect(legs.every((leg) => leg.category === "internal_transfer" && leg.status === "completed")).toBe(true);
    }
    expect(transactions.filter((tx) => tx.category === "internal_transfer").every((tx) => tx.transferId)).toBe(true);
  });

  it("never lets any account's completed ledger go negative", () => {
    const ordered = transactions
      .filter((tx) => tx.status === "completed")
      .toSorted((a, b) => Date.parse(a.occurredAt) - Date.parse(b.occurredAt));
    const ledger = new Map(accounts.map((account) => [account.id, account.openingBalanceCents]));
    for (const tx of ordered) {
      const next = (ledger.get(tx.accountId) ?? 0) + tx.amountCents;
      ledger.set(tx.accountId, next);
      expect(next, `${tx.accountId} after ${tx.id}`).toBeGreaterThanOrEqual(0);
    }
  });

  it("funds every payroll run from Operating before it is paid", () => {
    const runs = transactions.filter((tx) => tx.category === "payroll");
    expect(runs.length).toBeGreaterThanOrEqual(22);
    for (const run of runs) {
      expect(run.accountId).toBe("acc_payroll");
      const funded = transactions.some(
        (tx) =>
          tx.accountId === "acc_payroll" &&
          tx.amountCents === -run.amountCents &&
          tx.method === "transfer" &&
          Date.parse(tx.occurredAt) < Date.parse(run.occurredAt) &&
          Date.parse(run.occurredAt) - Date.parse(tx.occurredAt) < 5 * DAY_MS,
      );
      expect(funded, run.description).toBe(true);
    }
  });

  it("has 6–10 pending items, all in the last 3 days, mostly outflows", () => {
    const pending = transactions.filter((tx) => tx.status === "pending");
    expect(pending.length).toBeGreaterThanOrEqual(6);
    expect(pending.length).toBeLessThanOrEqual(10);
    const cutoff = addUtcDays(today, -3).getTime();
    expect(pending.every((tx) => Date.parse(tx.occurredAt) >= cutoff)).toBe(true);
    const inflows = pending.filter((tx) => tx.amountCents > 0).length;
    expect(inflows).toBeGreaterThanOrEqual(1);
    expect(inflows).toBeLessThanOrEqual(2);
  });

  it("has 3–6 failed items spread across the year", () => {
    const failed = transactions.filter((tx) => tx.status === "failed");
    expect(failed.length).toBeGreaterThanOrEqual(3);
    expect(failed.length).toBeLessThanOrEqual(6);
    const spanDays = (Date.parse(failed[failed.length - 1].occurredAt) - Date.parse(failed[0].occurredAt)) / DAY_MS;
    expect(spanDays).toBeGreaterThan(180);
  });

  it("ends with a realistic, mildly burning balance sheet", () => {
    const total = consolidatedBalance(accounts, transactions);
    expect(total.ledgerCents).toBeGreaterThanOrEqual(1_200_000_00);
    expect(total.ledgerCents).toBeLessThanOrEqual(1_800_000_00);
    const runway = runwayMonths(total.availableCents, transactions, now);
    expect(runway).not.toBeNull();
    expect(runway).toBeGreaterThanOrEqual(14);
    expect(runway).toBeLessThanOrEqual(24);
  });
});
