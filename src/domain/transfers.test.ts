import { describe, expect, it } from "vitest";
import { accountBalance } from "./balances";
import { makeAccount, makeTx } from "./test-fixtures";
import { buildTransferLegs, validateTransfer } from "./transfers";
import type { TransferRequest } from "./types";

const operating = makeAccount({ id: "op", name: "Operating", openingBalanceCents: 100_000 });
const payroll = makeAccount({ id: "pay", name: "Payroll", kind: "payroll", openingBalanceCents: 0 });
const closed = makeAccount({ id: "old", name: "Old", status: "inactive", openingBalanceCents: 50_000 });
const accounts = [operating, payroll, closed];

// Operating: ledger 100,000, one 30,000 hold → available 70,000.
const transactions = [
  makeTx({ accountId: "op", amountCents: -30_000, status: "pending" }),
  makeTx({ accountId: "op", amountCents: 20_000, status: "pending" }),
];

const request = (overrides: Partial<TransferRequest> = {}): TransferRequest => ({
  fromAccountId: "op",
  toAccountId: "pay",
  amountCents: 10_000,
  ...overrides,
});

describe("validateTransfer", () => {
  it.each([
    [{ toAccountId: "op" }, "same_account"],
    [{ amountCents: 0 }, "invalid_amount"],
    [{ amountCents: -100 }, "invalid_amount"],
    [{ amountCents: 10.5 }, "invalid_amount"],
    [{ amountCents: Number.NaN }, "invalid_amount"],
    [{ fromAccountId: "missing" }, "unknown_account"],
    [{ toAccountId: "missing" }, "unknown_account"],
    [{ toAccountId: "old" }, "inactive_account"],
    [{ fromAccountId: "old" }, "inactive_account"],
  ] as const)("rejects %o with %s", (overrides, error) => {
    expect(validateTransfer(request(overrides), accounts, transactions)).toEqual({ ok: false, error });
  });

  it("measures funds against available, not ledger", () => {
    expect(accountBalance(operating, transactions)).toMatchObject({ ledgerCents: 100_000, availableCents: 70_000 });
    expect(validateTransfer(request({ amountCents: 70_001 }), accounts, transactions)).toEqual({
      ok: false,
      error: "insufficient_funds",
    });
    expect(validateTransfer(request({ amountCents: 70_000 }), accounts, transactions).ok).toBe(true);
  });

  it("does not let pending inflows fund a transfer", () => {
    expect(validateTransfer(request({ amountCents: 80_000 }), accounts, transactions)).toEqual({
      ok: false,
      error: "insufficient_funds",
    });
  });

  it("returns the resolved accounts and a trimmed description", () => {
    const result = validateTransfer(request({ description: "  Payroll top-up  " }), accounts, transactions);
    expect(result).toEqual({
      ok: true,
      transfer: { from: operating, to: payroll, amountCents: 10_000, description: "Payroll top-up" },
    });
  });
});

describe("buildTransferLegs", () => {
  const now = new Date("2026-06-15T10:00:00.000Z");
  let counter = 0;
  const newId = () => `id_${++counter}`;

  it("builds two balanced, linked legs", () => {
    const result = validateTransfer(request({ amountCents: 25_000 }), accounts, transactions);
    if (!result.ok) throw new Error(result.error);
    const [out, inflow] = buildTransferLegs(result.transfer, { now, newId });

    expect(out).toMatchObject({ accountId: "op", amountCents: -25_000, counterparty: "Payroll" });
    expect(inflow).toMatchObject({ accountId: "pay", amountCents: 25_000, counterparty: "Operating" });
    expect(out.amountCents + inflow.amountCents).toBe(0);
    for (const leg of [out, inflow]) {
      expect(leg).toMatchObject({
        method: "transfer",
        category: "internal_transfer",
        status: "completed",
        occurredAt: now.toISOString(),
        transferId: out.transferId,
        reference: out.reference,
      });
    }
    expect(out.reference).toMatch(/^OAK-[0-9A-Z]{6}$/);
    expect(new Set([out.id, inflow.id, out.transferId]).size).toBe(3);
  });

  it("uses the description on both legs when given", () => {
    const [out, inflow] = buildTransferLegs(
      { from: operating, to: payroll, amountCents: 1_000, description: "Bonus funding" },
      { now, newId },
    );
    expect(out.description).toBe("Bonus funding");
    expect(inflow.description).toBe("Bonus funding");
  });

  it("moves exactly the amount between the two balances", () => {
    const result = validateTransfer(request({ amountCents: 40_000 }), accounts, transactions);
    if (!result.ok) throw new Error(result.error);
    const after = [...transactions, ...buildTransferLegs(result.transfer, { now, newId })];
    expect(accountBalance(operating, after).ledgerCents).toBe(60_000);
    expect(accountBalance(payroll, after).ledgerCents).toBe(40_000);
  });
});
