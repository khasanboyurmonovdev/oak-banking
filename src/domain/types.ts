import type { ExternalCategoryId } from "./categories";
import type { Cents } from "./money";

export const ACCOUNT_KINDS = ["operating", "payroll", "reserve"] as const;
export type AccountKind = (typeof ACCOUNT_KINDS)[number];

export type AccountStatus = "active" | "inactive";

/**
 * A bank account. Only the opening balance is stored; ledger, available and
 * pending amounts are always derived from transactions (see balances.ts).
 */
export type Account = {
  id: string;
  name: string;
  kind: AccountKind;
  currency: "USD";
  openingBalanceCents: Cents;
  /** ISO 8601 UTC timestamp. */
  openedAt: string;
  status: AccountStatus;
  /** Display-only and fictional, e.g. "•••• 4821". Never a full number. */
  maskedNumber: string;
};

export const TRANSACTION_STATUSES = ["completed", "pending", "failed"] as const;
export type TransactionStatus = (typeof TRANSACTION_STATUSES)[number];

export const TRANSACTION_METHODS = ["card", "ach", "wire", "check", "transfer", "deposit", "fee"] as const;
export type TransactionMethod = (typeof TRANSACTION_METHODS)[number];

type TransactionBase = {
  id: string;
  accountId: string;
  /** Signed, never zero: inflows are positive, outflows negative. */
  amountCents: Cents;
  counterparty: string;
  description: string;
  status: TransactionStatus;
  /** ISO 8601 UTC timestamp. */
  occurredAt: string;
  /** Fictional bank reference, e.g. "OAK-7F3K2Q". */
  reference: string;
  note?: string;
};

/** A payment to or from someone outside the business. */
export type ExternalTransaction = TransactionBase & {
  method: Exclude<TransactionMethod, "transfer">;
  category: ExternalCategoryId;
  transferId?: never;
};

/** One of the two linked legs of an internal transfer between own accounts. */
export type TransferLeg = TransactionBase & {
  method: "transfer";
  category: "internal_transfer";
  /** Shared by both legs of the same transfer. */
  transferId: string;
};

export type Transaction = ExternalTransaction | TransferLeg;

export type Direction = "in" | "out";

export function directionOf(transaction: Pick<Transaction, "amountCents">): Direction {
  return transaction.amountCents > 0 ? "in" : "out";
}

export function isTransferLeg(transaction: Transaction): transaction is TransferLeg {
  return transaction.method === "transfer";
}

export type TransferRequest = {
  fromAccountId: string;
  toAccountId: string;
  /** Positive amount to move. */
  amountCents: Cents;
  description?: string;
};
