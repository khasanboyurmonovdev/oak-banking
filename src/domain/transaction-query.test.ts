import { describe, expect, it } from "vitest";
import { makeTransfer, makeTx } from "./test-fixtures";
import {
  DEFAULT_TRANSACTION_QUERY,
  filteredTotals,
  parseTransactionQuery,
  queryTransactions,
  toSearchParams,
  type TransactionQuery,
} from "./transaction-query";

const txs = [
  makeTx({
    id: "a",
    accountId: "op",
    amountCents: 125_000,
    counterparty: "Harborline Plumbing Co.",
    description: "Invoice QF-2041 payment",
    category: "customer_payment",
    occurredAt: "2026-06-03T15:00:00.000Z",
    reference: "OAK-AAA111",
  }),
  makeTx({
    id: "b",
    accountId: "op",
    amountCents: -4_500,
    counterparty: "Copper Kettle Café",
    description: "Coffee meeting",
    category: "meals",
    method: "card",
    occurredAt: "2026-06-05T15:00:00.000Z",
    reference: "OAK-BBB222",
  }),
  makeTx({
    id: "c",
    accountId: "res",
    amountCents: -125_000,
    counterparty: "Nimbusfield Cloud",
    description: "Cloud infrastructure",
    category: "cloud_hosting",
    method: "card",
    status: "pending",
    occurredAt: "2026-06-05T15:00:00.000Z",
    reference: "OAK-CCC333",
    note: "Reserved instances for Q3",
  }),
  makeTx({
    id: "d",
    accountId: "op",
    amountCents: -9_350,
    counterparty: "Kitebrook Dev Co.",
    description: "Contract engineering",
    category: "contractors",
    status: "failed",
    occurredAt: "2026-06-10T15:00:00.000Z",
    reference: "OAK-DDD444",
  }),
];

// Wednesday, a week after the last fixture.
const NOW = new Date("2026-06-17T12:00:00.000Z");

const query = (overrides: Partial<TransactionQuery>): TransactionQuery => ({
  ...DEFAULT_TRANSACTION_QUERY,
  ...overrides,
});
const ids = (overrides: Partial<TransactionQuery>) => queryTransactions(txs, query(overrides), NOW).map((tx) => tx.id);

describe("queryTransactions search", () => {
  it("matches case-insensitively across counterparty, description, reference and note", () => {
    expect(ids({ search: "harborline" })).toEqual(["a"]);
    expect(ids({ search: "COFFEE" })).toEqual(["b"]);
    expect(ids({ search: "oak-ccc333" })).toEqual(["c"]);
    expect(ids({ search: "reserved q3" })).toEqual(["c"]);
  });

  it("requires every whitespace-separated token to match", () => {
    expect(ids({ search: "  cloud   nimbusfield " })).toEqual(["c"]);
    expect(ids({ search: "cloud harborline" })).toEqual([]);
  });
});

describe("queryTransactions filters", () => {
  it("filters by direction", () => {
    expect(ids({ direction: "in" })).toEqual(["a"]);
    expect(ids({ direction: "out" })).toEqual(["d", "b", "c"]);
  });

  it("filters by status, category and account", () => {
    expect(ids({ statuses: ["pending", "failed"] })).toEqual(["d", "c"]);
    expect(ids({ categories: ["meals", "customer_payment"] })).toEqual(["b", "a"]);
    expect(ids({ accountIds: ["res"] })).toEqual(["c"]);
  });

  it("filters by inclusive UTC date bounds", () => {
    expect(ids({ from: "2026-06-05" })).toEqual(["d", "b", "c"]);
    expect(ids({ to: "2026-06-05" })).toEqual(["b", "c", "a"]);
    expect(ids({ from: "2026-06-05", to: "2026-06-05" })).toEqual(["b", "c"]);
  });

  it("combines filters with AND", () => {
    expect(ids({ direction: "out", accountIds: ["op"], statuses: ["completed"] })).toEqual(["b"]);
    expect(ids({ direction: "in", categories: ["meals"] })).toEqual([]);
  });

  it("returns an empty list when nothing matches", () => {
    expect(ids({ search: "no such vendor" })).toEqual([]);
    expect(queryTransactions([], DEFAULT_TRANSACTION_QUERY, NOW)).toEqual([]);
  });
});

describe("queryTransactions range", () => {
  it("resolves a relative range against now, like the Overview", () => {
    // 7d = 2026-06-11 .. 2026-06-17 inclusive.
    expect(ids({ range: "7d" })).toEqual([]);
    // 30d starts 2026-05-19, so every fixture is inside.
    expect(ids({ range: "30d" })).toEqual(["d", "b", "c", "a"]);
    const later = new Date("2026-06-12T09:00:00.000Z");
    // 2026-06-06 .. 2026-06-12: only d.
    expect(queryTransactions(txs, query({ range: "7d" }), later).map((tx) => tx.id)).toEqual(["d"]);
  });
});

describe("queryTransactions sorting", () => {
  it("sorts by date, newest first by default, with id breaking ties", () => {
    expect(ids({})).toEqual(["d", "b", "c", "a"]);
    expect(ids({ sort: { field: "date", dir: "asc" } })).toEqual(["a", "b", "c", "d"]);
  });

  it("sorts by absolute amount with stable ties", () => {
    expect(ids({ sort: { field: "amount", dir: "desc" } })).toEqual(["a", "c", "d", "b"]);
    expect(ids({ sort: { field: "amount", dir: "asc" } })).toEqual(["b", "d", "a", "c"]);
  });

  it("does not mutate its input", () => {
    const before = txs.map((tx) => tx.id);
    queryTransactions(txs, query({ sort: { field: "amount", dir: "asc" } }), NOW);
    expect(txs.map((tx) => tx.id)).toEqual(before);
  });
});

describe("URL params", () => {
  it("serializes the default query to an empty string", () => {
    expect(toSearchParams(DEFAULT_TRANSACTION_QUERY).toString()).toBe("");
    expect(parseTransactionQuery(new URLSearchParams())).toEqual(DEFAULT_TRANSACTION_QUERY);
  });

  it("round-trips a full query", () => {
    const full: TransactionQuery = {
      search: "cloud & co, q3",
      direction: "out",
      statuses: ["pending", "failed"],
      categories: ["software", "cloud_hosting"],
      accountIds: ["acc_operating", "acc_reserve"],
      from: "2026-01-01",
      to: "2026-06-30",
      sort: { field: "amount", dir: "asc" },
    };
    const params = toSearchParams(full);
    expect(params.get("sort")).toBe("amount-asc");
    const parsed = parseTransactionQuery(new URLSearchParams(params.toString()));
    // Multi-value filters come back in canonical order.
    expect(parsed).toEqual({ ...full, categories: ["cloud_hosting", "software"] });
    expect(toSearchParams(parsed).toString()).toBe(params.toString());
  });

  it("omits defaults so URLs stay short", () => {
    expect(toSearchParams(query({ direction: "in" })).toString()).toBe("direction=in");
    expect(toSearchParams(query({ sort: { field: "date", dir: "asc" } })).toString()).toBe("sort=date-asc");
  });

  it("falls back to defaults for garbage and never throws", () => {
    const garbage = new URLSearchParams(
      "direction=sideways&status=lost,,PENDING&category=caviar&account=%3Cscript%3E&from=2026-02-30&to=yesterday&sort=amount-up&tx=txn_0001&utm_source=x",
    );
    expect(parseTransactionQuery(garbage)).toEqual(DEFAULT_TRANSACTION_QUERY);
  });

  it("keeps valid values and drops invalid ones from the same list", () => {
    const parsed = parseTransactionQuery(new URLSearchParams("status=failed,nope,failed&category=meals,caviar"));
    expect(parsed.statuses).toEqual(["failed"]);
    expect(parsed.categories).toEqual(["meals"]);
  });

  it("round-trips a range and lets it win over explicit dates", () => {
    const parsed = parseTransactionQuery(new URLSearchParams("range=90d&from=2026-01-01&to=2026-02-01"));
    expect(parsed.range).toBe("90d");
    expect(parsed.from).toBeUndefined();
    expect(parsed.to).toBeUndefined();
    expect(toSearchParams(parsed).toString()).toBe("range=90d");
    expect(parseTransactionQuery(new URLSearchParams("range=1y")).range).toBeUndefined();
  });

  it("normalizes search whitespace and swaps reversed date bounds", () => {
    const parsed = parseTransactionQuery(new URLSearchParams("q=%20%20coffee%20%20meeting%20&from=2026-06-30&to=2026-06-01"));
    expect(parsed.search).toBe("coffee meeting");
    expect(parsed).toMatchObject({ from: "2026-06-01", to: "2026-06-30" });
  });
});

describe("filteredTotals", () => {
  it("sums external in and out, counting transfers and failed items separately", () => {
    const transfer = makeTransfer("op", "res", 50_000, "2026-06-06T15:00:00.000Z");
    expect(filteredTotals([...txs, ...transfer])).toEqual({
      inCents: 125_000,
      // b (completed) + c (pending); d failed is excluded.
      outCents: 129_500,
      transferCount: 2,
      failedCount: 1,
    });
  });

  it("is all zeros for an empty list", () => {
    expect(filteredTotals([])).toEqual({ inCents: 0, outCents: 0, transferCount: 0, failedCount: 0 });
  });
});
