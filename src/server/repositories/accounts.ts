import { ACCOUNT_KINDS, type Account } from "@/domain";
import { integer, text, type Database, type Row } from "../db";

const COLUMNS = "id, name, kind, currency, opening_balance_cents, opened_at, status, masked_number";

function toAccount(row: Row): Account {
  const kind = ACCOUNT_KINDS.find((candidate) => candidate === row.kind);
  const status = row.status === "active" || row.status === "inactive" ? row.status : undefined;
  if (!kind || !status || row.currency !== "USD") throw new TypeError(`Malformed account row ${String(row.id)}`);
  return {
    id: text(row, "id"),
    name: text(row, "name"),
    kind,
    currency: "USD",
    openingBalanceCents: integer(row, "opening_balance_cents"),
    openedAt: text(row, "opened_at"),
    status,
    maskedNumber: text(row, "masked_number"),
  };
}

export function listAccounts(db: Database, sessionId: string): Account[] {
  return db
    .all(`SELECT ${COLUMNS} FROM accounts WHERE session_id = ? ORDER BY position`, [sessionId])
    .map(toAccount);
}

export function insertAccounts(db: Database, sessionId: string, accounts: readonly Account[]): void {
  accounts.forEach((account, position) => {
    db.run(
      `INSERT INTO accounts (session_id, position, ${COLUMNS}) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        sessionId,
        position,
        account.id,
        account.name,
        account.kind,
        account.currency,
        account.openingBalanceCents,
        account.openedAt,
        account.status,
        account.maskedNumber,
      ],
    );
  });
}

export function deleteAccounts(db: Database, sessionId: string): void {
  db.run("DELETE FROM accounts WHERE session_id = ?", [sessionId]);
}
