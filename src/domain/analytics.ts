/**
 * Business analytics over transactions.
 *
 * Rules:
 * - Income, expense, net and category figures count COMPLETED transactions only.
 * - Internal transfers (non-analytic category) are always excluded: moving
 *   money between own accounts is neither income nor expense.
 * - Failed transactions are always excluded.
 * - Pending transactions are reported separately (`pendingInCents`,
 *   `pendingOutCents`) and never mixed into completed totals.
 * - `inCents` and `outCents` are positive magnitudes; `netCents = in − out`.
 * - Ranges and buckets are UTC and calendar-aligned, so a range's summary
 *   always equals the sum of its cash-flow buckets.
 */
import { isAnalyticCategory, type CategoryId } from "./categories";
import { ledgerBalance } from "./balances";
import { addUtcDays, addUtcMonths, DAY_MS, startOfUtcDay, startOfUtcMonth, startOfUtcWeek } from "./dates";
import type { Cents } from "./money";
import type { Account, Transaction } from "./types";

export const RANGE_KEYS = ["7d", "30d", "90d", "12m"] as const;
export type RangeKey = (typeof RANGE_KEYS)[number];

/** User-facing names. "90d" is 13 whole weeks (see `resolveRange`), so it is labelled that way. */
export const RANGE_LABELS: Record<RangeKey, string> = {
  "7d": "7 days",
  "30d": "30 days",
  "90d": "13 weeks",
  "12m": "12 months",
};

export type BucketUnit = "day" | "week" | "month";

/** Half-open interval [start, end) split into `bucketCount` buckets of `unit`. */
export type ResolvedRange = { start: Date; end: Date; unit: BucketUnit; bucketCount: number };

/**
 * - 7d / 30d: the last 7 / 30 UTC days, including today; daily buckets.
 * - 90d: the current week plus the previous 12 (Monday start); weekly buckets.
 * - 12m: the current month plus the previous 11; monthly buckets.
 */
export function resolveRange(key: RangeKey, now: Date): ResolvedRange {
  switch (key) {
    case "7d":
    case "30d": {
      const bucketCount = key === "7d" ? 7 : 30;
      const end = addUtcDays(startOfUtcDay(now), 1);
      return { start: addUtcDays(end, -bucketCount), end, unit: "day", bucketCount };
    }
    case "90d": {
      const end = addUtcDays(startOfUtcWeek(now), 7);
      return { start: addUtcDays(end, -13 * 7), end, unit: "week", bucketCount: 13 };
    }
    case "12m": {
      const end = addUtcMonths(startOfUtcMonth(now), 1);
      return { start: addUtcMonths(end, -12), end, unit: "month", bucketCount: 12 };
    }
  }
}

function isAnalytic(tx: Transaction): boolean {
  return tx.status !== "failed" && isAnalyticCategory(tx.category);
}

function inRange(tx: Transaction, start: Date, end: Date): boolean {
  const time = Date.parse(tx.occurredAt);
  return time >= start.getTime() && time < end.getTime();
}

export type PeriodSummary = {
  inCents: Cents;
  outCents: Cents;
  netCents: Cents;
  pendingInCents: Cents;
  pendingOutCents: Cents;
  /** Number of completed transactions included in in/out. */
  count: number;
};

function summarize(transactions: readonly Transaction[], start: Date, end: Date): PeriodSummary {
  const summary: PeriodSummary = { inCents: 0, outCents: 0, netCents: 0, pendingInCents: 0, pendingOutCents: 0, count: 0 };
  for (const tx of transactions) {
    if (!isAnalytic(tx) || !inRange(tx, start, end)) continue;
    const inflow = tx.amountCents > 0;
    if (tx.status === "pending") {
      if (inflow) summary.pendingInCents += tx.amountCents;
      else summary.pendingOutCents -= tx.amountCents;
      continue;
    }
    if (inflow) summary.inCents += tx.amountCents;
    else summary.outCents -= tx.amountCents;
    summary.count += 1;
  }
  summary.netCents = summary.inCents - summary.outCents;
  return summary;
}

export function periodSummary(transactions: readonly Transaction[], range: RangeKey, now: Date): PeriodSummary {
  const { start, end } = resolveRange(range, now);
  return summarize(transactions, start, end);
}

export type CashFlowBucket = {
  /** ISO timestamp of the bucket's first instant (UTC). */
  start: string;
  inCents: Cents;
  outCents: Cents;
  netCents: Cents;
  /**
   * Ledger balance at the end of the bucket. Unlike in/out, this includes
   * transfers, so for a single account it moves with transfers in and out.
   */
  closingLedgerCents: Cents;
};

function bucketStart(range: ResolvedRange, index: number): Date {
  if (range.unit === "month") return addUtcMonths(range.start, index);
  return addUtcDays(range.start, index * (range.unit === "week" ? 7 : 1));
}

function bucketIndex(range: ResolvedRange, time: number): number {
  if (range.unit === "month") {
    const date = new Date(time);
    return (
      (date.getUTCFullYear() - range.start.getUTCFullYear()) * 12 + date.getUTCMonth() - range.start.getUTCMonth()
    );
  }
  const size = range.unit === "week" ? 7 * DAY_MS : DAY_MS;
  return Math.floor((time - range.start.getTime()) / size);
}

/** Zero-filled cash-flow buckets, consolidated or for one account. */
export function cashFlowSeries(
  transactions: readonly Transaction[],
  accounts: readonly Account[],
  rangeKey: RangeKey,
  now: Date,
  accountId?: string,
): CashFlowBucket[] {
  const range = resolveRange(rangeKey, now);
  const scopedAccounts = accountId ? accounts.filter((account) => account.id === accountId) : accounts;
  const scopedIds = new Set(scopedAccounts.map((account) => account.id));
  const scoped = transactions.filter((tx) => scopedIds.has(tx.accountId));

  const buckets: CashFlowBucket[] = Array.from({ length: range.bucketCount }, (_, index) => ({
    start: bucketStart(range, index).toISOString(),
    inCents: 0,
    outCents: 0,
    netCents: 0,
    closingLedgerCents: 0,
  }));
  const ledgerChange = new Array<Cents>(range.bucketCount).fill(0);

  for (const tx of scoped) {
    if (tx.status !== "completed" || !inRange(tx, range.start, range.end)) continue;
    const index = bucketIndex(range, Date.parse(tx.occurredAt));
    ledgerChange[index] += tx.amountCents;
    if (!isAnalytic(tx)) continue;
    if (tx.amountCents > 0) buckets[index].inCents += tx.amountCents;
    else buckets[index].outCents -= tx.amountCents;
  }

  let ledger = 0;
  for (const account of scopedAccounts) ledger += ledgerBalance(account, scoped, range.start);
  buckets.forEach((bucket, index) => {
    ledger += ledgerChange[index];
    bucket.netCents = bucket.inCents - bucket.outCents;
    bucket.closingLedgerCents = ledger;
  });
  return buckets;
}

export type CategorySpend = { category: CategoryId; cents: Cents; share: number };

/**
 * Completed external outflows in the range, grouped by category and sorted by
 * amount (largest first). `cents` sum exactly to the period's `outCents`.
 */
export function categorySpend(transactions: readonly Transaction[], range: RangeKey, now: Date): CategorySpend[] {
  const { start, end } = resolveRange(range, now);
  const totals = new Map<CategoryId, Cents>();
  let total = 0;
  for (const tx of transactions) {
    if (tx.status !== "completed" || tx.amountCents >= 0 || !isAnalytic(tx) || !inRange(tx, start, end)) continue;
    totals.set(tx.category, (totals.get(tx.category) ?? 0) - tx.amountCents);
    total -= tx.amountCents;
  }
  return [...totals]
    .map(([category, cents]) => ({ category, cents, share: cents / total }))
    .sort((a, b) => b.cents - a.cents || a.category.localeCompare(b.category));
}

export type RankedSpend = { category: CategoryId | "other"; cents: Cents; share: number };

/**
 * The `limit` largest categories, with the rest folded into one "other" row
 * (only when there is a rest). Expects `categorySpend` output (sorted, largest
 * first), so the rows still sum to the period's spend.
 */
export function topCategorySpend(spend: readonly CategorySpend[], limit: number): RankedSpend[] {
  const top: RankedSpend[] = spend.slice(0, limit);
  const rest = spend.slice(limit);
  if (rest.length === 0) return top;
  const cents = rest.reduce((sum, row) => sum + row.cents, 0);
  const share = rest.reduce((sum, row) => sum + row.share, 0);
  return [...top, { category: "other", cents, share }];
}

export const RUNWAY_TRAILING_MONTHS = 3;

/**
 * Runway in months = available cash ÷ average monthly net burn, where the
 * burn is averaged over the last 3 full calendar months before the current
 * one (completed, non-transfer transactions). Returns null when the business
 * is not burning (average net ≥ 0), and 0 when no cash is available.
 */
export function runwayMonths(availableCents: Cents, transactions: readonly Transaction[], now: Date): number | null {
  return runwayEstimate(availableCents, transactions, now).months;
}

export type RunwayEstimate = {
  /** See `runwayMonths`. */
  months: number | null;
  /** Average monthly net over the basis months, rounded to whole cents (negative = burn). */
  averageMonthlyNetCents: Cents;
  /** The full calendar months averaged, oldest first, as `YYYY-MM`. */
  basisMonths: string[];
};

/** `runwayMonths` together with the basis it was computed from. */
export function runwayEstimate(availableCents: Cents, transactions: readonly Transaction[], now: Date): RunwayEstimate {
  const end = startOfUtcMonth(now);
  const start = addUtcMonths(end, -RUNWAY_TRAILING_MONTHS);
  const averageNet = summarize(transactions, start, end).netCents / RUNWAY_TRAILING_MONTHS;
  const basisMonths = Array.from({ length: RUNWAY_TRAILING_MONTHS }, (_, index) =>
    addUtcMonths(start, index).toISOString().slice(0, 7),
  );
  const months = averageNet >= 0 ? null : availableCents <= 0 ? 0 : availableCents / -averageNet;
  return { months, averageMonthlyNetCents: Math.round(averageNet), basisMonths };
}
