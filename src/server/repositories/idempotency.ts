import { integer, text, type Database } from "../db";

export type IdempotencyRecord = {
  key: string;
  requestHash: string;
  /** The original successful response body, as JSON. */
  responseBody: string;
  createdAt: number;
};

export function findIdempotencyRecord(db: Database, sessionId: string, key: string): IdempotencyRecord | undefined {
  const row = db.get(
    "SELECT key, request_hash, response_body, created_at FROM idempotency_keys WHERE session_id = ? AND key = ?",
    [sessionId, key],
  );
  if (!row) return undefined;
  return {
    key: text(row, "key"),
    requestHash: text(row, "request_hash"),
    responseBody: text(row, "response_body"),
    createdAt: integer(row, "created_at"),
  };
}

export function insertIdempotencyRecord(db: Database, sessionId: string, record: IdempotencyRecord): void {
  db.run(
    "INSERT INTO idempotency_keys (session_id, key, request_hash, response_body, created_at) VALUES (?, ?, ?, ?, ?)",
    [sessionId, record.key, record.requestHash, record.responseBody, record.createdAt],
  );
}

export function deleteIdempotencyRecords(db: Database, sessionId: string): void {
  db.run("DELETE FROM idempotency_keys WHERE session_id = ?", [sessionId]);
}
