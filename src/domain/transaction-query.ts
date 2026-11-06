/**
 * Transaction search, filtering and sorting, plus a tolerant mapping to and
 * from URL search params so the filter state can live in the URL.
 */
import { RANGE_KEYS, resolveRange, type RangeKey } from "./analytics";
import { CATEGORY_IDS, isCategoryId, type CategoryId } from "./categories";
import { isIsoDate } from "./dates";
import type { Cents } from "./money";
import { isTransferLeg, TRANSACTION_STATUSES, type Transaction, type TransactionStatus } from "./types";

export type DirectionFilter = "all" | "in" | "out";
export type SortField = "date" | "amount";
export type SortDirection = "asc" | "desc";

export type TransactionQuery = {
  search: string;
  direction: DirectionFilter;
  /** Empty means "any". */
  statuses: TransactionStatus[];
  categories: CategoryId[];
  accountIds: string[];
  /**
   * A relative period, resolved against "now" exactly like the Overview
   * ranges (see `resolveRange`). When set, `from`/`to` are dropped.
   */
  range?: RangeKey;
  /** Inclusive UTC calendar dates, `YYYY-MM-DD`. */
  from?: string;
  to?: string;
  sort: { field: SortField; dir: SortDirection };
};

export const DEFAULT_TRANSACTION_QUERY: TransactionQuery = {
  search: "",
  direction: "all",
  statuses: [],
  categories: [],
  accountIds: [],
  sort: { field: "date", dir: "desc" },
};

function searchTokens(search: string): string[] {
  return search.toLowerCase().split(/\s+/).filter(Boolean);
}

type Bounds = { start: number; end: number } | undefined;

function matches(tx: Transaction, query: TransactionQuery, tokens: readonly string[], bounds: Bounds): boolean {
  if (query.direction === "in" && tx.amountCents < 0) return false;
  if (query.direction === "out" && tx.amountCents > 0) return false;
  if (query.statuses.length > 0 && !query.statuses.includes(tx.status)) return false;
  if (query.categories.length > 0 && !query.categories.includes(tx.category)) return false;
  if (query.accountIds.length > 0 && !query.accountIds.includes(tx.accountId)) return false;

  const day = tx.occurredAt.slice(0, 10);
  if (query.from && day < query.from) return false;
  if (query.to && day > query.to) return false;
  if (bounds) {
    const time = Date.parse(tx.occurredAt);
    if (time < bounds.start || time >= bounds.end) return false;
  }

  if (tokens.length === 0) return true;
  const haystack = [tx.counterparty, tx.description, tx.reference, tx.note ?? ""].join(" ").toLowerCase();
  return tokens.every((token) => haystack.includes(token));
}

/**
 * Filters and sorts transactions. Search is case-insensitive; every
 * whitespace-separated token must appear in the counterparty, description,
 * reference or note. Amount sorts by absolute value. Ties break on id
 * (ascending) so the order is always stable. `now` resolves `query.range`.
 */
export function queryTransactions(
  transactions: readonly Transaction[],
  query: TransactionQuery,
  now: Date,
): Transaction[] {
  const tokens = searchTokens(query.search);
  const range = query.range ? resolveRange(query.range, now) : undefined;
  const bounds: Bounds = range ? { start: range.start.getTime(), end: range.end.getTime() } : undefined;
  const { field, dir } = query.sort;
  const sign = dir === "asc" ? 1 : -1;
  const sortValue =
    field === "date" ? (tx: Transaction) => Date.parse(tx.occurredAt) : (tx: Transaction) => Math.abs(tx.amountCents);

  return transactions
    .filter((tx) => matches(tx, query, tokens, bounds))
    .map((tx) => ({ tx, value: sortValue(tx) }))
    .sort((a, b) => sign * (a.value - b.value) || (a.tx.id < b.tx.id ? -1 : a.tx.id > b.tx.id ? 1 : 0))
    .map(({ tx }) => tx);
}

// URL mapping. Defaults are omitted so URLs stay short. Multi-value filters
// are comma-separated, e.g. ?status=pending,failed&sort=amount-asc.

const PARAM = {
  search: "q",
  direction: "direction",
  statuses: "status",
  categories: "category",
  accountIds: "account",
  range: "range",
  from: "from",
  to: "to",
  sort: "sort",
} as const;

const ACCOUNT_ID = /^[A-Za-z0-9_-]{1,64}$/;
const MAX_SEARCH_LENGTH = 200;

function listParam(params: URLSearchParams, name: string): string[] {
  return (params.get(name) ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

/** Keeps known values only, de-duplicated, in the canonical order of `known`. */
function canonical<T extends string>(values: readonly string[], known: readonly T[]): T[] {
  return known.filter((value) => values.includes(value));
}

function normalize(query: TransactionQuery): TransactionQuery {
  const range = query.range && RANGE_KEYS.includes(query.range) ? query.range : undefined;
  let { from, to } = query;
  from = !range && from && isIsoDate(from) ? from : undefined;
  to = !range && to && isIsoDate(to) ? to : undefined;
  if (from && to && from > to) [from, to] = [to, from];

  return {
    search: query.search.trim().replace(/\s+/g, " ").slice(0, MAX_SEARCH_LENGTH),
    direction: query.direction,
    statuses: canonical(query.statuses, TRANSACTION_STATUSES),
    categories: canonical(query.categories, CATEGORY_IDS),
    accountIds: [...new Set(query.accountIds.filter((id) => ACCOUNT_ID.test(id)))].sort(),
    ...(range ? { range } : {}),
    ...(from ? { from } : {}),
    ...(to ? { to } : {}),
    sort: query.sort,
  };
}

/** Never throws: unknown or invalid values fall back to the defaults. */
export function parseTransactionQuery(params: URLSearchParams): TransactionQuery {
  const direction = params.get(PARAM.direction);
  const range = params.get(PARAM.range);
  const [sortField, sortDir] = (params.get(PARAM.sort) ?? "").split("-");

  return normalize({
    search: params.get(PARAM.search) ?? "",
    direction: direction === "in" || direction === "out" ? direction : "all",
    statuses: listParam(params, PARAM.statuses).filter((value): value is TransactionStatus =>
      TRANSACTION_STATUSES.some((status) => status === value),
    ),
    categories: listParam(params, PARAM.categories).filter(isCategoryId),
    accountIds: listParam(params, PARAM.accountIds),
    range: RANGE_KEYS.find((key) => key === range),
    from: params.get(PARAM.from) ?? undefined,
    to: params.get(PARAM.to) ?? undefined,
    sort:
      (sortField === "date" || sortField === "amount") && (sortDir === "asc" || sortDir === "desc")
        ? { field: sortField, dir: sortDir }
        : DEFAULT_TRANSACTION_QUERY.sort,
  });
}

/** Serializes a query, omitting every value that equals its default. */
export function toSearchParams(query: TransactionQuery): URLSearchParams {
  const q = normalize(query);
  const params = new URLSearchParams();
  if (q.search) params.set(PARAM.search, q.search);
  if (q.direction !== "all") params.set(PARAM.direction, q.direction);
  if (q.statuses.length > 0) params.set(PARAM.statuses, q.statuses.join(","));
  if (q.categories.length > 0) params.set(PARAM.categories, q.categories.join(","));
  if (q.accountIds.length > 0) params.set(PARAM.accountIds, q.accountIds.join(","));
  if (q.range) params.set(PARAM.range, q.range);
  if (q.from) params.set(PARAM.from, q.from);
  if (q.to) params.set(PARAM.to, q.to);
  const { field, dir } = q.sort;
  if (field !== DEFAULT_TRANSACTION_QUERY.sort.field || dir !== DEFAULT_TRANSACTION_QUERY.sort.dir) {
    params.set(PARAM.sort, `${field}-${dir}`);
  }
  return params;
}

export type FilteredTotals = {
  /** Completed and pending external inflows (positive). */
  inCents: Cents;
  /** Completed and pending external outflows (positive magnitude). */
  outCents: Cents;
  /** Internal transfer legs in the set: listed, but never counted as in/out. */
  transferCount: number;
  /** Failed items in the set: listed, but never counted. */
  failedCount: number;
};

/**
 * Money in and out across a filtered list. Internal transfers and failed
 * items are excluded from the totals and counted separately, so the totals
 * never treat money moved between own accounts as income or spend.
 */
export function filteredTotals(transactions: readonly Transaction[]): FilteredTotals {
  const totals: FilteredTotals = { inCents: 0, outCents: 0, transferCount: 0, failedCount: 0 };
  for (const tx of transactions) {
    if (isTransferLeg(tx)) totals.transferCount += 1;
    else if (tx.status === "failed") totals.failedCount += 1;
    else if (tx.amountCents > 0) totals.inCents += tx.amountCents;
    else totals.outCents -= tx.amountCents;
  }
  return totals;
}
