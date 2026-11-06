/**
 * Balance model (authoritative, see CLAUDE.md "Money and balance invariants"):
 *
 * - Ledger    = opening balance + sum of signed COMPLETED transactions.
 * - Holds     = sum of |pending outflows|.
 * - Available = Ledger − Holds.
 * - Pending in = sum of pending inflows. Shown separately; never available
 *   until it settles.
 * - Failed transactions never affect any balance.
 */
import type { Cents } from "./money";
import type { Account, Transaction } from "./types";

export type BalanceSummary = {
  ledgerCents: Cents;
  holdsCents: Cents;
  availableCents: Cents;
  pendingInCents: Cents;
};

export type AccountBalance = BalanceSummary & { accountId: string };

/**
 * Ledger balance of one account. With `before`, only completed transactions
 * that occurred strictly before that instant are counted.
 */
export function ledgerBalance(account: Account, transactions: readonly Transaction[], before?: Date): Cents {
  const cutoff = before?.getTime() ?? Number.POSITIVE_INFINITY;
  let ledger = account.openingBalanceCents;
  for (const tx of transactions) {
    if (tx.accountId === account.id && tx.status === "completed" && Date.parse(tx.occurredAt) < cutoff) {
      ledger += tx.amountCents;
    }
  }
  return ledger;
}

export function accountBalance(account: Account, transactions: readonly Transaction[]): AccountBalance {
  let holdsCents = 0;
  let pendingInCents = 0;
  for (const tx of transactions) {
    if (tx.accountId !== account.id || tx.status !== "pending") continue;
    if (tx.amountCents < 0) holdsCents -= tx.amountCents;
    else pendingInCents += tx.amountCents;
  }
  const ledgerCents = ledgerBalance(account, transactions);
  return {
    accountId: account.id,
    ledgerCents,
    holdsCents,
    availableCents: ledgerCents - holdsCents,
    pendingInCents,
  };
}

/** Totals across accounts. Internal transfers net to zero here by construction. */
export function consolidatedBalance(
  accounts: readonly Account[],
  transactions: readonly Transaction[],
): BalanceSummary {
  const total: BalanceSummary = { ledgerCents: 0, holdsCents: 0, availableCents: 0, pendingInCents: 0 };
  for (const account of accounts) {
    const balance = accountBalance(account, transactions);
    total.ledgerCents += balance.ledgerCents;
    total.holdsCents += balance.holdsCents;
    total.availableCents += balance.availableCents;
    total.pendingInCents += balance.pendingInCents;
  }
  return total;
}
