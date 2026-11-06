/**
 * Client-side validation for the Move money form. It runs the same Zod schema
 * as `POST /api/transfers`, then the checks the server makes against account
 * state (different, active accounts and enough available funds), so most
 * errors show before a request is sent. The server stays authoritative.
 */
import { formatMoney, type Cents } from "@/domain/money";
import type { AccountStatus } from "@/domain/types";
import { transferBodySchema } from "@/server/http/schemas";

export type TransferFormValues = { fromAccountId: string; toAccountId: string; amount: string; note: string };
export type TransferField = keyof TransferFormValues;
export type TransferFormErrors = Partial<Record<TransferField, string>>;

/** The parts of an account the form needs (an `AccountWithBalance` fits). */
export type TransferFormAccount = {
  id: string;
  name: string;
  status: AccountStatus;
  balance: { availableCents: Cents };
};

/** The JSON body for `POST /api/transfers`. */
export type TransferBody = { fromAccountId: string; toAccountId: string; amount: string; description?: string };

export type TransferFormResult =
  | { ok: true; body: TransferBody; amountCents: Cents }
  | { ok: false; errors: TransferFormErrors };

/** API field names → form field names. */
const FORM_FIELD: Record<string, TransferField> = {
  fromAccountId: "fromAccountId",
  toAccountId: "toAccountId",
  amount: "amount",
  description: "note",
};

/** Maps an API error's `fieldErrors` onto the form's fields (first message per field). */
export function formErrorsFromApi(fieldErrors: Record<string, string[]> | undefined): TransferFormErrors {
  const errors: TransferFormErrors = {};
  for (const [name, messages] of Object.entries(fieldErrors ?? {})) {
    const field = FORM_FIELD[name];
    if (field && messages[0] && !errors[field]) errors[field] = messages[0];
  }
  return errors;
}

export function validateTransferForm(
  values: TransferFormValues,
  accounts: readonly TransferFormAccount[],
): TransferFormResult {
  const note = values.note.trim();
  const body: TransferBody = {
    fromAccountId: values.fromAccountId,
    toAccountId: values.toAccountId,
    amount: values.amount.trim(),
    ...(note ? { description: note } : {}),
  };

  const errors: TransferFormErrors = {};
  const parsed = transferBodySchema.safeParse(body);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const field = FORM_FIELD[String(issue.path[0])];
      if (field && !errors[field]) errors[field] = issue.message;
    }
  }

  const from = accounts.find((account) => account.id === values.fromAccountId);
  const to = accounts.find((account) => account.id === values.toAccountId);
  if (values.fromAccountId && !from) errors.fromAccountId ??= "Choose an account.";
  if (values.toAccountId && !to) errors.toAccountId ??= "Choose an account.";
  if (from && from.status !== "active") errors.fromAccountId ??= "This account is inactive.";
  if (to && to.status !== "active") errors.toAccountId ??= "This account is inactive.";
  if (values.fromAccountId && values.fromAccountId === values.toAccountId) {
    errors.toAccountId ??= "Choose a different account from the source.";
  }
  if (parsed.success && from && !errors.amount && parsed.data.amount > from.balance.availableCents) {
    errors.amount = `Exceeds the available balance of ${formatMoney(from.balance.availableCents)}.`;
  }

  if (!parsed.success || Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, body, amountCents: parsed.data.amount };
}

/**
 * A random v4 UUID for the `Idempotency-Key` header. Built on
 * `crypto.getRandomValues` because `crypto.randomUUID` only exists in secure
 * contexts, and the demo is served over plain HTTP.
 */
export function newIdempotencyKey(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
