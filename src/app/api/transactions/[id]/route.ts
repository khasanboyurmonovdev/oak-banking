import { getDb } from "@/server/db";
import { readMutation, requireSession } from "@/server/http/request";
import { ApiError, handle, ok } from "@/server/http/response";
import { noteBodySchema, resourceIdSchema } from "@/server/http/schemas";
import { getTransaction, setTransactionNote } from "@/server/services/transactions";

const notFound = () => new ApiError(404, "not_found", "Transaction not found.");

export function GET(request: Request, context: RouteContext<"/api/transactions/[id]">) {
  return handle(async () => {
    const sessionId = requireSession(request);
    const { id } = await context.params;
    const transaction = resourceIdSchema.safeParse(id).success ? getTransaction(getDb(), sessionId, id) : undefined;
    if (!transaction) throw notFound();
    return ok(transaction);
  });
}

/** Body: `{ note }`. Trimmed, at most 500 characters; an empty note clears it. */
export function PATCH(request: Request, context: RouteContext<"/api/transactions/[id]">) {
  return handle(async () => {
    const { sessionId, body } = await readMutation(request, noteBodySchema);
    const { id } = await context.params;
    if (!resourceIdSchema.safeParse(id).success) throw notFound();
    const transaction = setTransactionNote(getDb(), sessionId, id, body.note);
    if (!transaction) throw notFound();
    return ok(transaction);
  });
}
