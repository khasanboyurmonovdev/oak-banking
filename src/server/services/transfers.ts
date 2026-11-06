import { createHash, randomUUID } from "node:crypto";
import {
  accountBalance,
  buildTransferLegs,
  validateTransfer,
  type AccountBalance,
  type TransferError,
  type TransferLeg,
  type TransferRequest,
} from "@/domain";
import { now } from "../clock";
import type { Database } from "../db";
import { findIdempotencyRecord, insertIdempotencyRecord } from "../repositories/idempotency";
import { insertTransactions } from "../repositories/transactions";
import { loadSandbox } from "./sandbox";

export type TransferResult = {
  transferId: string;
  legs: [outflow: TransferLeg, inflow: TransferLeg];
  /** Balances of both accounts right after the transfer. */
  balances: { from: AccountBalance; to: AccountBalance };
};

export type TransferOutcome =
  | { kind: "created"; result: TransferResult }
  | { kind: "replayed"; result: TransferResult }
  | { kind: "conflict" }
  | { kind: "rejected"; error: TransferError };

function requestHash(request: TransferRequest): string {
  const canonical = JSON.stringify([
    request.fromAccountId,
    request.toAccountId,
    request.amountCents,
    request.description?.trim() || null,
  ]);
  return createHash("sha256").update(canonical).digest("hex");
}

/**
 * Validates and books an internal transfer. The idempotency lookup, both legs
 * and the idempotency record are written in one BEGIN IMMEDIATE transaction,
 * so a failure anywhere leaves nothing behind. Only successful transfers are
 * recorded against the key: a rejected request may be retried with the same key.
 */
export function createTransfer(
  db: Database,
  sessionId: string,
  idempotencyKey: string,
  request: TransferRequest,
): TransferOutcome {
  const hash = requestHash(request);
  return db.transaction((): TransferOutcome => {
    const existing = findIdempotencyRecord(db, sessionId, idempotencyKey);
    if (existing) {
      if (existing.requestHash !== hash) return { kind: "conflict" };
      return { kind: "replayed", result: JSON.parse(existing.responseBody) as TransferResult };
    }

    const { accounts, transactions } = loadSandbox(db, sessionId);
    const validation = validateTransfer(request, accounts, transactions);
    if (!validation.ok) return { kind: "rejected", error: validation.error };

    const transferId = `trf_${randomUUID()}`;
    const ids = [transferId, `${transferId}_out`, `${transferId}_in`];
    const legs = buildTransferLegs(validation.transfer, { now: now(), newId: () => ids.shift() ?? randomUUID() });
    insertTransactions(db, sessionId, legs);

    const after = [...transactions, ...legs];
    const result: TransferResult = {
      transferId,
      legs,
      balances: {
        from: accountBalance(validation.transfer.from, after),
        to: accountBalance(validation.transfer.to, after),
      },
    };
    insertIdempotencyRecord(db, sessionId, {
      key: idempotencyKey,
      requestHash: hash,
      responseBody: JSON.stringify(result),
      createdAt: now().getTime(),
    });
    return { kind: "created", result };
  });
}
