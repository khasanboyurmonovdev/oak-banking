import { getDb } from "@/server/db";
import { requireSession } from "@/server/http/request";
import { handle, ok } from "@/server/http/response";
import { listAccountsWithBalances } from "@/server/services/accounts";

export function GET(request: Request) {
  return handle(() => {
    const sessionId = requireSession(request);
    return ok(listAccountsWithBalances(getDb(), sessionId));
  });
}
