import {
  filteredTotals,
  queryTransactions,
  type FilteredTotals,
  type Transaction,
  type TransactionQuery,
} from "@/domain";
import { now } from "../clock";
import type { Database } from "../db";
import { findTransaction, listTransactions, updateTransactionNote } from "../repositories/transactions";

export type TransactionPage = {
  items: Transaction[];
  total: number;
  page: number;
  pageSize: number;
  /** In/out across every match (not just this page), transfers and failed items excluded. */
  totals: FilteredTotals;
};

/** Filters and sorts with the domain query, then slices one page (1-based) and totals the full match. */
export function listTransactionPage(
  db: Database,
  sessionId: string,
  query: TransactionQuery,
  page: number,
  pageSize: number,
): TransactionPage {
  const matching = queryTransactions(listTransactions(db, sessionId), query, now());
  const start = (page - 1) * pageSize;
  return {
    items: matching.slice(start, start + pageSize),
    total: matching.length,
    page,
    pageSize,
    totals: filteredTotals(matching),
  };
}

export function getTransaction(db: Database, sessionId: string, id: string): Transaction | undefined {
  return findTransaction(db, sessionId, id);
}

/** Sets (or, with null, clears) a note. Returns the updated transaction, or undefined if not found. */
export function setTransactionNote(
  db: Database,
  sessionId: string,
  id: string,
  note: string | null,
): Transaction | undefined {
  return db.transaction(() =>
    updateTransactionNote(db, sessionId, id, note) ? findTransaction(db, sessionId, id) : undefined,
  );
}
