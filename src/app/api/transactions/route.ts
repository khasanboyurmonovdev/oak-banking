import { parseTransactionQuery } from "@/domain";
import { getDb } from "@/server/db";
import { parseSearchParams, requireSession } from "@/server/http/request";
import { handle, ok } from "@/server/http/response";
import { paginationSchema } from "@/server/http/schemas";
import { listTransactionPage } from "@/server/services/transactions";

/** Filters use the same URL format as the Transactions page (see parseTransactionQuery). */
export function GET(request: Request) {
  return handle(() => {
    const { page, pageSize } = parseSearchParams(paginationSchema, request);
    const query = parseTransactionQuery(new URL(request.url).searchParams);
    const sessionId = requireSession(request);
    return ok(listTransactionPage(getDb(), sessionId, query, page, pageSize));
  });
}
