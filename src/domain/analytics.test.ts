import { describe, expect, it } from "vitest";
import { cashFlowSeries, categorySpend, periodSummary, RANGE_KEYS, resolveRange, runwayMonths } from "./analytics";
import { ledgerBalance } from "./balances";
import { generateSeed } from "./seed";
import { makeAccount, makeTransfer, makeTx } from "./test-fixtures";

// Wednesday.
const NOW = new Date("2026-06-17T12:00:00.000Z");
const op = makeAccount({ id: "op", openingBalanceCents: 1_000_000 });
const res = makeAccount({ id: "res", kind: "reserve", openingBalanceCents: 5_000_000 });

const at = (day: string) => `${day}T15:00:00.000Z`;

const recent = [
  makeTx({ accountId: "op", amountCents: 50_000, occurredAt: at("2026-06-16") }),
  makeTx({ accountId: "op", amountCents: -12_000, category: "software", occurredAt: at("2026-06-15") }),
  makeTx({ accountId: "op", amountCents: -8_000, category: "rent", occurredAt: at("2026-06-12") }),
  makeTx({ accountId: "op", amountCents: -2_000, category: "software", occurredAt: at("2026-06-11") }),
  makeTx({ accountId: "op", amountCents: -3_000, status: "pending", occurredAt: at("2026-06-16") }),
  makeTx({ accountId: "op", amountCents: 4_000, status: "pending", occurredAt: at("2026-06-16") }),
  makeTx({ accountId: "op", amountCents: -99_000, status: "failed", occurredAt: at("2026-06-14") }),
  makeTx({ accountId: "op", amountCents: -7_000, occurredAt: at("2026-06-10") }), // outside 7d
  ...makeTransfer("res", "op", 300_000, at("2026-06-13")),
];

describe("resolveRange", () => {
  it("aligns ranges to UTC days, Monday weeks and calendar months", () => {
    expect(resolveRange("7d", NOW)).toMatchObject({
      start: new Date("2026-06-11T00:00:00.000Z"),
      end: new Date("2026-06-18T00:00:00.000Z"),
      bucketCount: 7,
    });
    const weekly = resolveRange("90d", NOW);
    expect(weekly.start.getUTCDay()).toBe(1);
    expect(weekly.end).toEqual(new Date("2026-06-22T00:00:00.000Z"));
    expect(resolveRange("12m", NOW)).toMatchObject({
      start: new Date("2025-07-01T00:00:00.000Z"),
      end: new Date("2026-07-01T00:00:00.000Z"),
    });
  });
});

describe("periodSummary", () => {
  const summary = periodSummary(recent, "7d", NOW);

  it("counts completed external transactions in the range only", () => {
    expect(summary.inCents).toBe(50_000);
    expect(summary.outCents).toBe(22_000);
    expect(summary.netCents).toBe(28_000);
    expect(summary.count).toBe(4);
  });

  it("reports pending separately and ignores failed", () => {
    expect(summary.pendingInCents).toBe(4_000);
    expect(summary.pendingOutCents).toBe(3_000);
  });

  it("excludes internal transfers", () => {
    const withoutTransfers = recent.filter((tx) => tx.method !== "transfer");
    expect(periodSummary(withoutTransfers, "7d", NOW)).toEqual(summary);
  });
});

describe("categorySpend", () => {
  it("groups outflows, sorted descending, excluding transfers", () => {
    expect(categorySpend(recent, "7d", NOW)).toEqual([
      { category: "software", cents: 14_000, share: 14_000 / 22_000 },
      { category: "rent", cents: 8_000, share: 8_000 / 22_000 },
    ]);
  });

  it("returns an empty list when there is no spend", () => {
    expect(categorySpend([], "30d", NOW)).toEqual([]);
  });
});

describe("cashFlowSeries", () => {
  it("zero-fills buckets and excludes transfers from in/out", () => {
    const series = cashFlowSeries(recent, [op, res], "7d", NOW);
    expect(series).toHaveLength(7);
    expect(series[0].start).toBe("2026-06-11T00:00:00.000Z");
    expect(series.map((bucket) => bucket.inCents)).toEqual([0, 0, 0, 0, 0, 50_000, 0]);
    expect(series.map((bucket) => bucket.outCents)).toEqual([2_000, 8_000, 0, 0, 12_000, 0, 0]);
    // Consolidated closing ledger ignores the transfer; failed and pending never count.
    expect(series[6].closingLedgerCents).toBe(6_000_000 - 7_000 - 2_000 - 8_000 - 12_000 + 50_000);
  });

  it("includes transfers in a single account's closing ledger", () => {
    const series = cashFlowSeries(recent, [op, res], "7d", NOW, "op");
    expect(series[2].closingLedgerCents).toBe(1_000_000 - 7_000 - 2_000 - 8_000 + 300_000);
    expect(series[2].inCents).toBe(0);
  });
});

describe("runwayMonths", () => {
  // Trailing window for June 17 is March 1 – May 31.
  const history = [
    ...["2026-03-10", "2026-04-10", "2026-05-10"].flatMap((day) => [
      makeTx({ accountId: "op", amountCents: 10_000, occurredAt: at(day) }),
      makeTx({ accountId: "op", amountCents: -30_000, occurredAt: at(day) }),
    ]),
    makeTx({ accountId: "op", amountCents: -500_000, occurredAt: at("2026-02-27") }), // before window
    makeTx({ accountId: "op", amountCents: -500_000, occurredAt: at("2026-06-02") }), // current month
    makeTx({ accountId: "op", amountCents: -500_000, status: "pending", occurredAt: at("2026-05-20") }),
    ...makeTransfer("op", "res", 900_000, at("2026-04-15")),
  ];

  it("divides available cash by the trailing 3-month average net burn", () => {
    expect(runwayMonths(200_000, history, NOW)).toBe(10);
  });

  it("returns null when the business is not burning", () => {
    const profitable = [makeTx({ accountId: "op", amountCents: 1_000, occurredAt: at("2026-04-01") })];
    expect(runwayMonths(200_000, profitable, NOW)).toBeNull();
    expect(runwayMonths(200_000, [], NOW)).toBeNull();
  });

  it("returns 0 when nothing is available", () => {
    expect(runwayMonths(-5_000, history, NOW)).toBe(0);
  });
});

describe("analytics on seed data", () => {
  const now = new Date("2026-11-06T09:30:00.000Z");
  const { accounts, transactions } = generateSeed({ now });

  it.each([
    ["7d", 7],
    ["30d", 30],
    ["90d", 13],
    ["12m", 12],
  ] as const)("%s has %i buckets whose totals match the period summary", (range, count) => {
    const series = cashFlowSeries(transactions, accounts, range, now);
    const summary = periodSummary(transactions, range, now);
    expect(series).toHaveLength(count);
    expect(series.reduce((sum, bucket) => sum + bucket.inCents, 0)).toBe(summary.inCents);
    expect(series.reduce((sum, bucket) => sum + bucket.outCents, 0)).toBe(summary.outCents);
  });

  it.each(RANGE_KEYS)("%s closing ledgers equal a direct ledger computation at each bucket end", (range) => {
    for (const scope of [undefined, ...accounts.map((account) => account.id)]) {
      const scoped = scope ? accounts.filter((account) => account.id === scope) : accounts;
      const series = cashFlowSeries(transactions, accounts, range, now, scope);
      const ends = [...series.slice(1).map((bucket) => new Date(bucket.start)), resolveRange(range, now).end];
      series.forEach((bucket, index) => {
        const direct = scoped.reduce((sum, account) => sum + ledgerBalance(account, transactions, ends[index]), 0);
        expect(bucket.closingLedgerCents).toBe(direct);
      });
    }
  });

  it.each(RANGE_KEYS)("%s category cents sum exactly to outCents and shares to 1", (range) => {
    const spend = categorySpend(transactions, range, now);
    expect(spend.reduce((sum, row) => sum + row.cents, 0)).toBe(periodSummary(transactions, range, now).outCents);
    expect(spend.reduce((sum, row) => sum + row.share, 0)).toBeCloseTo(1, 10);
    expect(spend.some((row) => row.category === "internal_transfer")).toBe(false);
  });

  it("never counts transfer legs as income or expense", () => {
    const withoutTransfers = transactions.filter((tx) => tx.method !== "transfer");
    for (const range of RANGE_KEYS) {
      expect(periodSummary(transactions, range, now)).toEqual(periodSummary(withoutTransfers, range, now));
    }
  });
});
