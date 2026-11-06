/**
 * Money is always an integer number of US cents. Conversion to dollars happens
 * only at the display edge, in `formatMoney`.
 */

/** An integer amount of US cents. Signed where the context says so. */
export type Cents = number;

/** Upper bound for user-entered amounts: $999,999,999.99. */
export const MAX_INPUT_CENTS: Cents = 99_999_999_999;

export function isCents(value: unknown): value is Cents {
  return typeof value === "number" && Number.isSafeInteger(value);
}

export function assertCents(value: number): asserts value is Cents {
  if (!Number.isSafeInteger(value)) {
    throw new RangeError(`Expected an integer number of cents, received ${value}`);
  }
}

export type MoneyInputError = "empty" | "invalid" | "negative" | "too_many_decimals" | "too_large";

export type ParseMoneyResult = { ok: true; cents: Cents } | { ok: false; error: MoneyInputError };

// Whole part is either plain digits or correctly grouped thousands ("1,234,567").
const MONEY_INPUT = /^(\d+|\d{1,3}(?:,\d{3})+)?(?:\.(\d*))?$/;

/**
 * Parses a user-entered dollar amount ("1,234.5", "$20", ".75") into cents
 * using string arithmetic only, so no floating-point rounding is involved.
 */
export function parseMoneyInput(input: string): ParseMoneyResult {
  let text = input.trim();
  if (text === "") return { ok: false, error: "empty" };
  if (text.startsWith("-")) return { ok: false, error: "negative" };
  if (text.startsWith("$")) text = text.slice(1).trim();

  const match = MONEY_INPUT.exec(text);
  const whole = match?.[1] ?? "";
  const fraction = match?.[2] ?? "";
  if (!match || (whole === "" && fraction === "")) return { ok: false, error: "invalid" };
  if (fraction.length > 2) return { ok: false, error: "too_many_decimals" };

  const wholeDigits = whole.replaceAll(",", "").replace(/^0+(?=\d)/, "");
  // Checked on the digit string so huge inputs never reach Number precision limits.
  if (wholeDigits.length > 9) return { ok: false, error: "too_large" };

  const cents = Number(wholeDigits || "0") * 100 + Number(fraction.padEnd(2, "0"));
  if (cents > MAX_INPUT_CENTS) return { ok: false, error: "too_large" };
  return { ok: true, cents };
}

export type FormatMoneyOptions = {
  /** Always show a sign: "+$1,250.00" / "-$1,250.00". Zero stays unsigned. */
  signed?: boolean;
  /** Short form for axes and tight spaces: "$1.2M", "$45K". */
  compact?: boolean;
};

const formatters = new Map<string, Intl.NumberFormat>();

function formatterFor({ signed = false, compact = false }: FormatMoneyOptions): Intl.NumberFormat {
  const key = `${signed}:${compact}`;
  let formatter = formatters.get(key);
  if (!formatter) {
    formatter = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      signDisplay: signed ? "exceptZero" : "auto",
      ...(compact ? { notation: "compact", maximumFractionDigits: 1 } : {}),
    });
    formatters.set(key, formatter);
  }
  return formatter;
}

export function formatMoney(cents: Cents, options: FormatMoneyOptions = {}): string {
  assertCents(cents);
  return formatterFor(options).format(cents / 100);
}

export function sumCents(values: Iterable<Cents>): Cents {
  let total = 0;
  for (const value of values) total += value;
  assertCents(total);
  return total;
}
