import { getDb } from "@/server/db";
import { readMutation } from "@/server/http/request";
import { handle, ok } from "@/server/http/response";
import { emptyBodySchema } from "@/server/http/schemas";
import { resetSandbox } from "@/server/services/sandbox";

/** Wipes and reseeds the caller's own demo sandbox. Other visitors are unaffected. */
export function POST(request: Request) {
  return handle(async () => {
    const { sessionId } = await readMutation(request, emptyBodySchema);
    return ok(resetSandbox(getDb(), sessionId));
  });
}
