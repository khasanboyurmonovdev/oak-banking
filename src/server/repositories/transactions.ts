import {
  isCategoryId,
  TRANSACTION_METHODS,
  TRANSACTION_STATUSES,
  type Transaction,
} from "@/domain";
import { integer, optionalText, text, type Database, type Row } from "../db";

const COLUMNS =
  "id, account_id, amount_cents, counterparty, description, status, occurred_at, reference, method, category, transfer_id, note";

function toTransaction(row: Row): Transaction {
  const status = TRANSACTION_STATUSES.find((candidate) => candidate === row.status);
  const method = TRANSACTION_METHODS.find((candidate) => candidate === row.method);
  const category = text(row, "category");
  if (!status || !method || !isCategoryId(category)) throw new TypeError(`Malformed transaction row ${String(row.id)}`);

  const note = optionalText(row, "note");
  const base = {
    id: text(row, "id"),
    accountId: text(row, "account_id"),
    amountCents: integer(row, "amount_cents"),
    counterparty: text(row, "counterparty"),
    description: text(row, "description"),
    status,
    occurredAt: text(row, "occurred_at"),
    reference: text(row, "reference"),
    ...(note !== undefined ? { note } : {}),
  };
  if (method === "transfer") {
    if (category !== "internal_transfer") throw new TypeError(`Malformed transfer row ${base.id}`);
    return { ...base, method, category, transferId: text(row, "transfer_id") };
  }
  if (category === "internal_transfer") throw new TypeError(`Malformed transaction row ${base.id}`);
  return { ...base, method, category };
}

/** All of a session's transactions in chronological order. */
export function listTransactions(db: Database, sessionId: string): Transaction[] {
  return db
    .all(`SELECT ${COLUMNS} FROM transactions WHERE session_id = ? ORDER BY occurred_at, id`, [sessionId])
    .map(toTransaction);
}

export function findTransaction(db: Database, sessionId: string, id: string): Transaction | undefined {
  const row = db.get(`SELECT ${COLUMNS} FROM transactions WHERE session_id = ? AND id = ?`, [sessionId, id]);
  return row ? toTransaction(row) : undefined;
}

export function insertTransactions(db: Database, sessionId: string, transactions: readonly Transaction[]): void {
  for (const tx of transactions) {
    db.run(`INSERT INTO transactions (session_id, ${COLUMNS}) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
      sessionId,
      tx.id,
      tx.accountId,
      tx.amountCents,
      tx.counterparty,
      tx.description,
      tx.status,
      tx.occurredAt,
      tx.reference,
      tx.method,
      tx.category,
      tx.transferId ?? null,
      tx.note ?? null,
    ]);
  }
}

/** Sets or clears (`null`) a note. Returns false when no such transaction exists. */
export function updateTransactionNote(db: Database, sessionId: string, id: string, note: string | null): boolean {
  return db.run("UPDATE transactions SET note = ? WHERE session_id = ? AND id = ?", [note, sessionId, id]).changes > 0;
}

export function deleteTransactions(db: Database, sessionId: string): void {
  db.run("DELETE FROM transactions WHERE session_id = ?", [sessionId]);
}
