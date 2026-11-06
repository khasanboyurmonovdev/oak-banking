import { describe, expect, it } from "vitest";

import { idempotencyKeySchema } from "@/server/http/schemas";

import {
  formErrorsFromApi,
  newIdempotencyKey,
  validateTransferForm,
  type TransferFormAccount,
  type TransferFormValues,
} from "./transfer-form";

const accounts: TransferFormAccount[] = [
  { id: "acc_operating", name: "Operating", status: "active", balance: { availableCents: 50_000_00 } },
  { id: "acc_payroll", name: "Payroll", status: "active", balance: { availableCents: 1_000_00 } },
  { id: "acc_closed", name: "Closed", status: "inactive", balance: { availableCents: 10_000_00 } },
];

const valid: TransferFormValues = { fromAccountId: "acc_operating", toAccountId: "acc_payroll", amount: "1,250.50", note: "" };

const errorsFor = (values: Partial<TransferFormValues>) => {
  const result = validateTransferForm({ ...valid, ...values }, accounts);
  return result.ok ? {} : result.errors;
};

describe("validateTransferForm", () => {
  it("accepts a valid transfer and returns the API body and cents", () => {
    const result = validateTransferForm({ ...valid, note: "  Payroll top-up  " }, accounts);
    expect(result).toEqual({
      ok: true,
      amountCents: 1_250_50,
      body: { fromAccountId: "acc_operating", toAccountId: "acc_payroll", amount: "1,250.50", description: "Payroll top-up" },
    });
  });

  it("omits an empty note from the body", () => {
    const result = validateTransferForm({ ...valid, note: "   " }, accounts);
    expect(result.ok && "description" in result.body).toBe(false);
  });

  it("requires both accounts", () => {
    expect(errorsFor({ fromAccountId: "", toAccountId: "" })).toMatchObject({
      fromAccountId: "Choose an account.",
      toAccountId: "Choose an account.",
    });
  });

  it("rejects the same account on both sides", () => {
    expect(errorsFor({ toAccountId: "acc_operating" }).toAccountId).toBe("Choose a different account from the source.");
  });

  it("rejects unknown and inactive accounts", () => {
    expect(errorsFor({ toAccountId: "acc_missing" }).toAccountId).toBe("Choose an account.");
    expect(errorsFor({ toAccountId: "acc_closed" }).toAccountId).toBe("This account is inactive.");
  });

  it.each([
    ["", "Enter an amount."],
    ["abc", "Enter a dollar amount, like 1,250.00."],
    ["-5", "Enter a positive amount."],
    ["0", "Enter an amount greater than $0.00."],
    ["0.00", "Enter an amount greater than $0.00."],
    ["10.005", "Use at most two decimal places."],
    ["1234567890", "That amount is too large."],
  ])("rejects the amount %j", (amount, message) => {
    expect(errorsFor({ amount }).amount).toBe(message);
  });

  it("accepts amounts with a dollar sign, no whole part or one decimal", () => {
    for (const amount of ["$20", ".75", "12.5"]) expect(errorsFor({ amount })).toEqual({});
  });

  it("checks the amount against the source's available balance", () => {
    expect(errorsFor({ fromAccountId: "acc_payroll", toAccountId: "acc_operating", amount: "1000" })).toEqual({});
    expect(errorsFor({ fromAccountId: "acc_payroll", toAccountId: "acc_operating", amount: "1000.01" }).amount).toBe(
      "Exceeds the available balance of $1,000.00.",
    );
  });

  it("caps the note at 140 characters", () => {
    expect(errorsFor({ note: "x".repeat(140) })).toEqual({});
    expect(errorsFor({ note: "x".repeat(141) }).note).toBe("Use at most 140 characters.");
  });
});

describe("formErrorsFromApi", () => {
  it("maps API field names onto form fields", () => {
    expect(formErrorsFromApi({ amount: ["Exceeds the available balance."], description: ["Too long"], other: ["x"] })).toEqual({
      amount: "Exceeds the available balance.",
      note: "Too long",
    });
    expect(formErrorsFromApi(undefined)).toEqual({});
  });
});

describe("newIdempotencyKey", () => {
  it("returns distinct UUIDs the API accepts", () => {
    const keys = new Set(Array.from({ length: 50 }, newIdempotencyKey));
    expect(keys.size).toBe(50);
    for (const key of keys) expect(idempotencyKeySchema.safeParse(key).success).toBe(true);
  });
});
