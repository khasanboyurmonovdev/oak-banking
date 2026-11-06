import { accountBalance, type Account, type AccountBalance, type Transaction } from "@/domain";
import type { Database } from "../db";
import { loadSandbox } from "./sandbox";

export type AccountWithBalance = Account & { balance: Omit<AccountBalance, "accountId"> };

export function withBalance(account: Account, transactions: readonly Transaction[]): AccountWithBalance {
  const { ledgerCents, holdsCents, availableCents, pendingInCents } = accountBalance(account, transactions);
  return { ...account, balance: { ledgerCents, holdsCents, availableCents, pendingInCents } };
}

export function listAccountsWithBalances(db: Database, sessionId: string): AccountWithBalance[] {
  const { accounts, transactions } = loadSandbox(db, sessionId);
  return accounts.map((account) => withBalance(account, transactions));
}

export function getAccountWithBalance(db: Database, sessionId: string, id: string): AccountWithBalance | undefined {
  const { accounts, transactions } = loadSandbox(db, sessionId);
  const account = accounts.find((candidate) => candidate.id === id);
  return account ? withBalance(account, transactions) : undefined;
}
