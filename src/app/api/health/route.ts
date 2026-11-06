import { getDb } from "@/server/db";
import { handle, ok } from "@/server/http/response";

/**
 * Liveness and database check for the container healthcheck. Needs no
 * session. Route handlers are not cached by default, so this runs per request.
 */
export function GET() {
  return handle(() => {
    getDb().get("SELECT 1");
    return ok({ status: "ok" });
  });
}
