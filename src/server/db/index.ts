import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { getEnv } from "../env";
import { migrate } from "./migrations";
import { openDatabase, type Database } from "./sqlite";

export { integer, optionalText, text, type Database, type Row } from "./sqlite";

/** Opens and migrates a database, creating its directory if needed. */
export function createDatabase(path: string): Database {
  const isMemory = path === ":memory:";
  const location = isMemory ? path : resolve(path);
  if (!isMemory) mkdirSync(dirname(location), { recursive: true });
  const db = openDatabase(location);
  migrate(db);
  return db;
}

// Cached on globalThis so dev-server hot reloads reuse one connection.
const globalForDb = globalThis as typeof globalThis & { __oakDb?: Database };

/** The process-wide database, opened lazily on first use. */
export function getDb(): Database {
  globalForDb.__oakDb ??= createDatabase(getEnv().databasePath);
  return globalForDb.__oakDb;
}
