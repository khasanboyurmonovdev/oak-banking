/**
 * The only module that touches the SQLite driver (built-in `node:sqlite`).
 * Everything else depends on the small `Database` interface below, so the
 * driver can be swapped (e.g. for better-sqlite3) by rewriting this file.
 */
import type { DatabaseSync, StatementSync } from "node:sqlite";

export type SqlValue = null | number | string;
export type SqlParams = readonly SqlValue[];
export type Row = Readonly<Record<string, unknown>>;

export interface Database {
  run(sql: string, params?: SqlParams): { changes: number };
  get(sql: string, params?: SqlParams): Row | undefined;
  all(sql: string, params?: SqlParams): Row[];
  exec(sql: string): void;
  /** Runs `fn` inside BEGIN IMMEDIATE; commits on return, rolls back on throw. */
  transaction<T>(fn: () => T): T;
  close(): void;
}

const EXPERIMENTAL_WARNING = "SQLite is an experimental feature";

/**
 * Loads `node:sqlite` lazily, without a static import, so the bundler leaves
 * it to the Node runtime. Node 24 emits a one-off ExperimentalWarning on load;
 * only that exact warning is swallowed, and only for the duration of this call.
 */
function loadDriver(): typeof import("node:sqlite") {
  const emitWarning = process.emitWarning;
  process.emitWarning = function (this: NodeJS.Process, warning: string | Error, ...rest: unknown[]) {
    const message = typeof warning === "string" ? warning : warning.message;
    if (message.startsWith(EXPERIMENTAL_WARNING)) return;
    return Reflect.apply(emitWarning, this, [warning, ...rest]);
  } as typeof process.emitWarning;
  try {
    return process.getBuiltinModule("node:sqlite");
  } finally {
    process.emitWarning = emitWarning;
  }
}

export function openDatabase(path: string): Database {
  const { DatabaseSync: Driver } = loadDriver();
  const db: DatabaseSync = new Driver(path);
  db.exec("PRAGMA foreign_keys = ON");
  db.exec("PRAGMA journal_mode = WAL");
  db.exec("PRAGMA busy_timeout = 5000");

  const statements = new Map<string, StatementSync>();
  const prepare = (sql: string) => {
    let statement = statements.get(sql);
    if (!statement) {
      statement = db.prepare(sql);
      statements.set(sql, statement);
    }
    return statement;
  };
  let inTransaction = false;

  return {
    run(sql, params = []) {
      return { changes: Number(prepare(sql).run(...params).changes) };
    },
    get(sql, params = []) {
      return prepare(sql).get(...params);
    },
    all(sql, params = []) {
      return prepare(sql).all(...params);
    },
    exec(sql) {
      db.exec(sql);
    },
    transaction(fn) {
      if (inTransaction) throw new Error("Nested transactions are not supported");
      inTransaction = true;
      db.exec("BEGIN IMMEDIATE");
      try {
        const result = fn();
        db.exec("COMMIT");
        return result;
      } catch (error) {
        db.exec("ROLLBACK");
        throw error;
      } finally {
        inTransaction = false;
      }
    },
    close() {
      statements.clear();
      db.close();
    },
  };
}

// Row readers: fail loudly on unexpected column types instead of casting.

export function text(row: Row, column: string): string {
  const value = row[column];
  if (typeof value !== "string") throw new TypeError(`Column ${column} is not text`);
  return value;
}

export function optionalText(row: Row, column: string): string | undefined {
  return row[column] === null ? undefined : text(row, column);
}

export function integer(row: Row, column: string): number {
  const value = row[column];
  if (typeof value !== "number" || !Number.isSafeInteger(value)) {
    throw new TypeError(`Column ${column} is not a safe integer`);
  }
  return value;
}
