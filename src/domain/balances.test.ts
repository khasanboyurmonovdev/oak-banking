import { describe, expect, it } from "vitest";
import { accountBalance, consolidatedBalance, ledgerBalance } from "./balances";
import { makeAccount, makeTransfer, makeTx } from "./test-fixtures";

const operating = makeAccount({ id: "op", openingBalanceCents: 100_000 });
const reserve = makeAccount({ id: "res", kind: "reserve", openingBalanceCents: 500_000 });

const transactions = [
  makeTx({ accountId: "op", amountCents: 20_000 }), // completed in
  makeTx({ accountId: "op", amountCents: -5_000 }), // completed out
  makeTx({ accountId: "op", amountCents: -3_000, status: "pending" }), // hold
  makeTx({ accountId: "op", amountCents: -1_000, status: "pending" }), // hold
  makeTx({ accountId: "op", amountCents: 7_000, status: "pending" }), // pending in
  makeTx({ accountId: "op", amountCents: -50_000, status: "failed" }),
  makeTx({ accountId: "op", amountCents: 90_000, status: "failed" }),
  makeTx({ accountId: "res", amountCents: 2_500 }),
  ...makeTransfer("res", "op", 40_000),
];

describe("accountBalance", () => {
  const balance = accountBalance(operating, transactions);

  it("ledger is opening plus completed transactions only", () => {
    expect(balance.ledgerCents).toBe(100_000 + 20_000 - 5_000 + 40_000);
  });

  it("holds are pending outflows and available = ledger − holds", () => {
    expect(balance.holdsCents).toBe(4_000);
    expect(balance.availableCents).toBe(balance.ledgerCents - balance.holdsCents);
  });

  it("keeps pending inflows out of available", () => {
    expect(balance.pendingInCents).toBe(7_000);
    expect(balance.availableCents).toBe(155_000 - 4_000);
  });

  it("ignores failed transactions entirely", () => {
    const withoutFailed = transactions.filter((tx) => tx.status !== "failed");
    expect(accountBalance(operating, withoutFailed)).toEqual(balance);
  });

  it("only counts the account's own transactions", () => {
    expect(accountBalance(reserve, transactions)).toEqual({
      accountId: "res",
      ledgerCents: 500_000 + 2_500 - 40_000,
      holdsCents: 0,
      availableCents: 462_500,
      pendingInCents: 0,
    });
  });
});

describe("ledgerBalance", () => {
  it("can be computed strictly before an instant", () => {
    const txs = [
      makeTx({ accountId: "op", amountCents: 1_000, occurredAt: "2026-06-01T00:00:00.000Z" }),
      makeTx({ accountId: "op", amountCents: 2_000, occurredAt: "2026-06-02T00:00:00.000Z" }),
    ];
    expect(ledgerBalance(operating, txs, new Date("2026-06-02T00:00:00.000Z"))).toBe(101_000);
    expect(ledgerBalance(operating, txs)).toBe(103_000);
  });
});

describe("consolidatedBalance", () => {
  it("is the sum of the account balances", () => {
    const accounts = [operating, reserve];
    const parts = accounts.map((account) => accountBalance(account, transactions));
    const total = consolidatedBalance(accounts, transactions);
    expect(total.ledgerCents).toBe(parts[0].ledgerCents + parts[1].ledgerCents);
    expect(total.holdsCents).toBe(parts[0].holdsCents + parts[1].holdsCents);
    expect(total.availableCents).toBe(parts[0].availableCents + parts[1].availableCents);
    expect(total.pendingInCents).toBe(parts[0].pendingInCents + parts[1].pendingInCents);
  });

  it("is unchanged by internal transfers", () => {
    const accounts = [operating, reserve];
    const withoutTransfers = transactions.filter((tx) => tx.method !== "transfer");
    expect(consolidatedBalance(accounts, transactions)).toEqual(consolidatedBalance(accounts, withoutTransfers));
  });
});
