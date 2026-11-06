/** Zod schemas for every API input: query strings, bodies, headers and path ids. */
import { z } from "zod";
import { MAX_NOTE_LENGTH, parseMoneyInput, RANGE_KEYS, type MoneyInputError } from "@/domain";

const emptyAsUndefined = (value: unknown) => (value === "" ? undefined : value);

export const overviewQuerySchema = z.object({
  range: z.preprocess(emptyAsUndefined, z.enum(RANGE_KEYS).default("30d")),
});

export const MAX_PAGE_SIZE = 100;

/** Pagination only; the filters themselves go through the domain URL parser. */
export const paginationSchema = z.object({
  page: z.preprocess(emptyAsUndefined, z.coerce.number().int().min(1).max(100_000).default(1)),
  pageSize: z.preprocess(emptyAsUndefined, z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(25)),
});

/** Ids we issue are short and URL-safe; anything else cannot exist. */
export const resourceIdSchema = z.string().regex(/^[A-Za-z0-9_-]{1,80}$/);

/** Trimmed; an empty note clears it (null). */
export const noteBodySchema = z.strictObject({
  note: z
    .string()
    .trim()
    .max(MAX_NOTE_LENGTH, `Notes can be at most ${MAX_NOTE_LENGTH} characters.`)
    .transform((note) => (note === "" ? null : note)),
});

const MONEY_ERRORS: Record<MoneyInputError, string> = {
  empty: "Enter an amount.",
  invalid: "Enter a dollar amount, like 1,250.00.",
  negative: "Enter a positive amount.",
  too_many_decimals: "Use at most two decimal places.",
  too_large: "That amount is too large.",
};

export const MAX_TRANSFER_DESCRIPTION_LENGTH = 140;

const accountIdSchema = z.string().trim().min(1, "Choose an account.").max(64);

export const transferBodySchema = z.strictObject({
  fromAccountId: accountIdSchema,
  toAccountId: accountIdSchema,
  /** A decimal dollar string, parsed to integer cents without floating point. */
  amount: z
    .string()
    .max(32, MONEY_ERRORS.too_large)
    .transform((value, context) => {
      const parsed = parseMoneyInput(value);
      if (!parsed.ok) {
        context.addIssue({ code: "custom", message: MONEY_ERRORS[parsed.error] });
        return z.NEVER;
      }
      if (parsed.cents === 0) {
        context.addIssue({ code: "custom", message: "Enter an amount greater than $0.00." });
        return z.NEVER;
      }
      return parsed.cents;
    }),
  description: z
    .string()
    .trim()
    .max(MAX_TRANSFER_DESCRIPTION_LENGTH, `Use at most ${MAX_TRANSFER_DESCRIPTION_LENGTH} characters.`)
    .optional(),
});

export const idempotencyKeySchema = z.uuid({ error: "Idempotency-Key must be a UUID." });

/** The reset endpoint takes no options; an empty JSON object is the only valid body. */
export const emptyBodySchema = z.strictObject({});
