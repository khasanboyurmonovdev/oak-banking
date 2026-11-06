import { describe, expect, it } from "vitest";
import { noteBodySchema, paginationSchema, transferBodySchema } from "./schemas";

describe("noteBodySchema", () => {
  it("trims, clears on empty and caps at 500 characters", () => {
    expect(noteBodySchema.parse({ note: "  Paid early  " })).toEqual({ note: "Paid early" });
    expect(noteBodySchema.parse({ note: "   " })).toEqual({ note: null });
    expect(noteBodySchema.parse({ note: "" })).toEqual({ note: null });
    expect(noteBodySchema.parse({ note: ` ${"x".repeat(500)} ` }).note).toHaveLength(500);
    expect(noteBodySchema.safeParse({ note: "x".repeat(501) }).success).toBe(false);
  });

  it("rejects missing, non-string and unknown fields", () => {
    expect(noteBodySchema.safeParse({}).success).toBe(false);
    expect(noteBodySchema.safeParse({ note: 42 }).success).toBe(false);
    expect(noteBodySchema.safeParse({ note: "ok", extra: true }).success).toBe(false);
  });
});

describe("transferBodySchema", () => {
  const base = { fromAccountId: "acc_operating", toAccountId: "acc_reserve" };

  it("parses decimal strings into integer cents", () => {
    expect(transferBodySchema.parse({ ...base, amount: "1,000.00" }).amount).toBe(100_000);
    expect(transferBodySchema.parse({ ...base, amount: "$0.07" }).amount).toBe(7);
  });

  it("rejects invalid, zero and numeric amounts with a field error", () => {
    for (const amount of ["", "abc", "-5", "1.005", "0", "0.00", 1000]) {
      const result = transferBodySchema.safeParse({ ...base, amount });
      expect(result.success, String(amount)).toBe(false);
      expect(result.error?.issues[0].path).toEqual(["amount"]);
    }
  });
});

describe("paginationSchema", () => {
  it("defaults to page 1 of 25 and caps the page size at 100", () => {
    expect(paginationSchema.parse({})).toEqual({ page: 1, pageSize: 25 });
    expect(paginationSchema.parse({ page: "3", pageSize: "100" })).toEqual({ page: 3, pageSize: 100 });
    expect(paginationSchema.safeParse({ pageSize: "101" }).success).toBe(false);
    expect(paginationSchema.safeParse({ page: "0" }).success).toBe(false);
    expect(paginationSchema.safeParse({ page: "1.5" }).success).toBe(false);
  });
});
