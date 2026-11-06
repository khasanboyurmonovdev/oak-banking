import type { TransferError } from "@/domain";
import { getDb } from "@/server/db";
import { parseInput, readMutation } from "@/server/http/request";
import { ApiError, handle, ok, type FieldErrors } from "@/server/http/response";
import { idempotencyKeySchema, transferBodySchema } from "@/server/http/schemas";
import { createTransfer } from "@/server/services/transfers";

const REJECTIONS: Record<TransferError, { message: string; fieldErrors?: FieldErrors }> = {
  same_account: {
    message: "Choose two different accounts.",
    fieldErrors: { toAccountId: ["Choose a different account from the source."] },
  },
  invalid_amount: { message: "Enter a valid amount.", fieldErrors: { amount: ["Enter a valid amount."] } },
  unknown_account: { message: "One of the accounts does not exist." },
  inactive_account: { message: "Transfers need two active accounts." },
  insufficient_funds: {
    message: "The source account does not have enough available funds.",
    fieldErrors: { amount: ["Exceeds the available balance."] },
  },
};

/**
 * Simulated internal transfer between the visitor's own demo accounts.
 * Requires an `Idempotency-Key` (UUID) header: the same key and body replay
 * the original response; the same key with a different body is a 409.
 */
export function POST(request: Request) {
  return handle(async () => {
    const { sessionId, body } = await readMutation(request, transferBodySchema);
    const key = parseInput(idempotencyKeySchema, request.headers.get("idempotency-key"), "Idempotency-Key must be a UUID.");

    const outcome = createTransfer(getDb(), sessionId, key, {
      fromAccountId: body.fromAccountId,
      toAccountId: body.toAccountId,
      amountCents: body.amount,
      ...(body.description ? { description: body.description } : {}),
    });
    switch (outcome.kind) {
      case "created":
        return ok(outcome.result, { status: 201 });
      case "replayed":
        return ok(outcome.result, { status: 201, headers: { "Idempotent-Replayed": "true" } });
      case "conflict":
        throw new ApiError(409, "idempotency_conflict", "This Idempotency-Key was already used with a different request.");
      case "rejected": {
        const { message, fieldErrors } = REJECTIONS[outcome.error];
        throw new ApiError(422, outcome.error, message, fieldErrors);
      }
    }
  });
}
