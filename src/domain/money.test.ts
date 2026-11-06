import { describe, expect, it } from "vitest";
import { assertCents, formatMoney, MAX_INPUT_CENTS, parseMoneyInput, sumCents } from "./money";

describe("parseMoneyInput", () => {
  it.each([
    ["1234.56", 123456],
    ["1,234.5", 123450],
    ["1,234,567.89", 123456789],
    ["$20", 2000],
    ["$ 20.05", 2005],
    ["  7 ", 700],
    [".75", 75],
    ["5.", 500],
    ["0.01", 1],
    ["0", 0],
    ["007.10", 710],
    ["999,999,999.99", MAX_INPUT_CENTS],
  ])("parses %j as %i cents", (input, cents) => {
    expect(parseMoneyInput(input)).toEqual({ ok: true, cents });
  });

  it.each([
    ["", "empty"],
    ["   ", "empty"],
    ["-5", "negative"],
    ["-$5.00", "negative"],
    ["1.234", "too_many_decimals"],
    ["0.001", "too_many_decimals"],
    ["NaN", "invalid"],
    ["abc", "invalid"],
    ["1e5", "invalid"],
    [".", "invalid"],
    ["$", "invalid"],
    ["12,34", "invalid"],
    ["1,2345.00", "invalid"],
    ["1 000", "invalid"],
    ["1000000000", "too_large"],
    ["99999999999999999999999", "too_large"],
  ])("rejects %j as %s", (input, error) => {
    expect(parseMoneyInput(input)).toEqual({ ok: false, error });
  });

  it("is exact where float math is not", () => {
    // 0.1 + 0.2 !== 0.3 in floating point; parsed cents add exactly.
    const parsed = ["0.10", "0.20"].map((value) => {
      const result = parseMoneyInput(value);
      if (!result.ok) throw new Error(result.error);
      return result.cents;
    });
    expect(sumCents(parsed)).toBe(30);
    expect(parseMoneyInput("4.35")).toEqual({ ok: true, cents: 435 }); // 4.35 * 100 = 434.99999999999994
  });
});

describe("formatMoney", () => {
  it("formats USD with grouping and two decimals", () => {
    expect(formatMoney(123456)).toBe("$1,234.56");
    expect(formatMoney(5)).toBe("$0.05");
    expect(formatMoney(-98765)).toBe("-$987.65");
    expect(formatMoney(0)).toBe("$0.00");
  });

  it("adds an explicit sign when asked, except for zero", () => {
    expect(formatMoney(125000, { signed: true })).toBe("+$1,250.00");
    expect(formatMoney(-125000, { signed: true })).toBe("-$1,250.00");
    expect(formatMoney(0, { signed: true })).toBe("$0.00");
  });

  it("supports compact notation", () => {
    expect(formatMoney(123_456_789, { compact: true })).toBe("$1.2M");
    expect(formatMoney(4_500_000, { compact: true })).toBe("$45K");
  });

  it("rejects non-integer cents", () => {
    expect(() => formatMoney(10.5)).toThrow(RangeError);
  });
});

describe("sumCents / assertCents", () => {
  it("sums many small amounts without drift", () => {
    expect(sumCents(Array.from({ length: 1000 }, () => 10))).toBe(10000);
    expect(sumCents([])).toBe(0);
    expect(sumCents([150, -275, 125])).toBe(0);
  });

  it("rejects fractional and non-finite values", () => {
    expect(() => assertCents(1.5)).toThrow(RangeError);
    expect(() => assertCents(Number.NaN)).toThrow(RangeError);
    expect(() => assertCents(Number.POSITIVE_INFINITY)).toThrow(RangeError);
    expect(() => assertCents(42)).not.toThrow();
  });
});
