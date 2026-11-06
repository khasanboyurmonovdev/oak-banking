/**
 * Pure internal-transfer rules. Persistence, atomicity and idempotency are the
 * service layer's job; this module only decides validity and builds the legs.
 */
import { accountBalance } from "./balances";
import { MAX_INPUT_CENTS, type Cents } from "./money";
import { referenceFor } from "./prng";
import type { Account, Transaction, TransferLeg, TransferRequest } from "./types";

export type TransferError =
  | "same_account"
  | "invalid_amount"
  | "unknown_account"
  | "inactive_account"
  | "insufficient_funds";

/** A transfer whose accounts exist, are active and can cover the amount. */
export type ValidatedTransfer = {
  from: Account;
  to: Account;
  amountCents: Cents;
  description?: string;
};

export type TransferValidation = { ok: true; transfer: ValidatedTransfer } | { ok: false; error: TransferError };

/** Checks input first, then accounts, then funds against the AVAILABLE balance. */
export function validateTransfer(
  request: TransferRequest,
  accounts: readonly Account[],
  transactions: readonly Transaction[],
): TransferValidation {
  if (request.fromAccountId === request.toAccountId) return { ok: false, error: "same_account" };
  if (!Number.isSafeInteger(request.amountCents) || request.amountCents <= 0 || request.amountCents > MAX_INPUT_CENTS) {
    return { ok: false, error: "invalid_amount" };
  }

  const from = accounts.find((account) => account.id === request.fromAccountId);
  const to = accounts.find((account) => account.id === request.toAccountId);
  if (!from || !to) return { ok: false, error: "unknown_account" };
  if (from.status !== "active" || to.status !== "active") return { ok: false, error: "inactive_account" };

  if (request.amountCents > accountBalance(from, transactions).availableCents) {
    return { ok: false, error: "insufficient_funds" };
  }

  const description = request.description?.trim();
  return {
    ok: true,
    transfer: { from, to, amountCents: request.amountCents, ...(description ? { description } : {}) },
  };
}

export type TransferDeps = {
  now: Date;
  newId: () => string;
};

/**
 * Builds the two linked legs of a validated transfer: an outflow on the
 * source and an inflow on the destination, sharing transferId and reference.
 */
export function buildTransferLegs(
  transfer: ValidatedTransfer,
  { now, newId }: TransferDeps,
): [outflow: TransferLeg, inflow: TransferLeg] {
  const transferId = newId();
  const shared = {
    method: "transfer",
    category: "internal_transfer",
    status: "completed",
    occurredAt: now.toISOString(),
    reference: referenceFor(transferId),
    transferId,
  } as const;

  return [
    {
      ...shared,
      id: newId(),
      accountId: transfer.from.id,
      amountCents: -transfer.amountCents,
      counterparty: transfer.to.name,
      description: transfer.description ?? `Transfer to ${transfer.to.name}`,
    },
    {
      ...shared,
      id: newId(),
      accountId: transfer.to.id,
      amountCents: transfer.amountCents,
      counterparty: transfer.from.name,
      description: transfer.description ?? `Transfer from ${transfer.from.name}`,
    },
  ];
}
