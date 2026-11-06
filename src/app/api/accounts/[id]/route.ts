import { getDb } from "@/server/db";
import { requireSession } from "@/server/http/request";
import { ApiError, handle, ok } from "@/server/http/response";
import { resourceIdSchema } from "@/server/http/schemas";
import { getAccountWithBalance } from "@/server/services/accounts";

export function GET(request: Request, context: RouteContext<"/api/accounts/[id]">) {
  return handle(async () => {
    const sessionId = requireSession(request);
    const { id } = await context.params;
    const account = resourceIdSchema.safeParse(id).success
      ? getAccountWithBalance(getDb(), sessionId, id)
      : undefined;
    if (!account) throw new ApiError(404, "not_found", "Account not found.");
    return ok(account);
  });
}
