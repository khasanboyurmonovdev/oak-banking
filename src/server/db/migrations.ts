/**
 * Versioned schema migrations, tracked with PRAGMA user_version. Append new
 * entries; never edit one that has shipped.
 *
 * Every data table carries session_id and cascades from sessions, so deleting
 * a session removes its whole sandbox. Money is INTEGER cents. Accounts store
 * only the opening balance: every other balance is derived in src/domain.
 */
import type { Database } from "./sqlite";

const MIGRATIONS: readonly string[] = [
  `
  CREATE TABLE sessions (
    id            TEXT PRIMARY KEY,
    created_at    INTEGER NOT NULL,
    last_seen_at  INTEGER NOT NULL,
    seeded_at     INTEGER NOT NULL
  ) STRICT;
  CREATE INDEX sessions_last_seen ON sessions (last_seen_at);

  CREATE TABLE accounts (
    session_id             TEXT NOT NULL REFERENCES sessions (id) ON DELETE CASCADE,
    id                     TEXT NOT NULL,
    position               INTEGER NOT NULL,
    name                   TEXT NOT NULL,
    kind                   TEXT NOT NULL CHECK (kind IN ('operating', 'payroll', 'reserve')),
    currency               TEXT NOT NULL CHECK (currency = 'USD'),
    opening_balance_cents  INTEGER NOT NULL,
    opened_at              TEXT NOT NULL,
    status                 TEXT NOT NULL CHECK (status IN ('active', 'inactive')),
    masked_number          TEXT NOT NULL,
    PRIMARY KEY (session_id, id)
  ) STRICT;

  CREATE TABLE transactions (
    session_id    TEXT NOT NULL REFERENCES sessions (id) ON DELETE CASCADE,
    id            TEXT NOT NULL,
    account_id    TEXT NOT NULL,
    amount_cents  INTEGER NOT NULL CHECK (amount_cents <> 0),
    counterparty  TEXT NOT NULL,
    description   TEXT NOT NULL,
    status        TEXT NOT NULL CHECK (status IN ('completed', 'pending', 'failed')),
    occurred_at   TEXT NOT NULL,
    reference     TEXT NOT NULL,
    method        TEXT NOT NULL,
    category      TEXT NOT NULL,
    transfer_id   TEXT,
    note          TEXT,
    PRIMARY KEY (session_id, id),
    FOREIGN KEY (session_id, account_id) REFERENCES accounts (session_id, id) ON DELETE CASCADE,
    CHECK ((method = 'transfer') = (transfer_id IS NOT NULL))
  ) STRICT;
  CREATE INDEX transactions_session_date ON transactions (session_id, occurred_at);
  CREATE INDEX transactions_session_account ON transactions (session_id, account_id);

  CREATE TABLE idempotency_keys (
    session_id     TEXT NOT NULL REFERENCES sessions (id) ON DELETE CASCADE,
    key            TEXT NOT NULL,
    request_hash   TEXT NOT NULL,
    response_body  TEXT NOT NULL,
    created_at     INTEGER NOT NULL,
    PRIMARY KEY (session_id, key)
  ) STRICT;
  `,
];

export const SCHEMA_VERSION = MIGRATIONS.length;

export function migrate(db: Database): void {
  const row = db.get("PRAGMA user_version");
  const current = typeof row?.user_version === "number" ? row.user_version : 0;
  if (current > SCHEMA_VERSION) {
    throw new Error(`Database schema v${current} is newer than this build (v${SCHEMA_VERSION})`);
  }
  for (let version = current + 1; version <= SCHEMA_VERSION; version++) {
    db.transaction(() => {
      db.exec(MIGRATIONS[version - 1]);
      db.exec(`PRAGMA user_version = ${version}`);
    });
  }
}
