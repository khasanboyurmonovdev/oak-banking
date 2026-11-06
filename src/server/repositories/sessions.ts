import { integer, text, type Database } from "../db";

/** Times are epoch milliseconds. */
export type SessionRecord = {
  id: string;
  createdAt: number;
  lastSeenAt: number;
  seededAt: number;
};

export function findSession(db: Database, id: string): SessionRecord | undefined {
  const row = db.get("SELECT id, created_at, last_seen_at, seeded_at FROM sessions WHERE id = ?", [id]);
  if (!row) return undefined;
  return {
    id: text(row, "id"),
    createdAt: integer(row, "created_at"),
    lastSeenAt: integer(row, "last_seen_at"),
    seededAt: integer(row, "seeded_at"),
  };
}

export function insertSession(db: Database, session: SessionRecord): void {
  db.run("INSERT INTO sessions (id, created_at, last_seen_at, seeded_at) VALUES (?, ?, ?, ?)", [
    session.id,
    session.createdAt,
    session.lastSeenAt,
    session.seededAt,
  ]);
}

export function touchSession(db: Database, id: string, lastSeenAt: number): void {
  db.run("UPDATE sessions SET last_seen_at = ? WHERE id = ?", [lastSeenAt, id]);
}

export function setSessionSeededAt(db: Database, id: string, seededAt: number): void {
  db.run("UPDATE sessions SET seeded_at = ? WHERE id = ?", [seededAt, id]);
}

/** Deletes a session; its sandbox data goes with it (ON DELETE CASCADE). */
export function deleteSession(db: Database, id: string): void {
  db.run("DELETE FROM sessions WHERE id = ?", [id]);
}

/** Deletes sessions last seen before `cutoff`. Returns how many were removed. */
export function deleteSessionsSeenBefore(db: Database, cutoff: number): number {
  return db.run("DELETE FROM sessions WHERE last_seen_at < ?", [cutoff]).changes;
}

/** Keeps the `keep` most recently seen sessions and deletes the rest. */
export function deleteLeastRecentlySeen(db: Database, keep: number): number {
  return db.run(
    `DELETE FROM sessions WHERE id NOT IN (
       SELECT id FROM sessions ORDER BY last_seen_at DESC, id LIMIT ?
     )`,
    [Math.max(0, keep)],
  ).changes;
}

export function countSessions(db: Database): number {
  const row = db.get("SELECT COUNT(*) AS count FROM sessions");
  return row ? integer(row, "count") : 0;
}
