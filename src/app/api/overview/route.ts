import { getDb } from "@/server/db";
import { parseSearchParams, requireSession } from "@/server/http/request";
import { handle, ok } from "@/server/http/response";
import { overviewQuerySchema } from "@/server/http/schemas";
import { getOverview } from "@/server/services/overview";

export function GET(request: Request) {
  return handle(() => {
    const { range } = parseSearchParams(overviewQuerySchema, request);
    const sessionId = requireSession(request);
    return ok(getOverview(getDb(), sessionId, range));
  });
}
