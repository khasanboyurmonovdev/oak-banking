/**
 * The API's single response envelope: `{ data }` on success and
 * `{ error: { code, message, fieldErrors? } }` on failure.
 */

export type FieldErrors = Record<string, string[]>;

export type ApiErrorBody = { error: { code: string; message: string; fieldErrors?: FieldErrors } };

/** An expected failure, rendered as an error envelope with its status. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly fieldErrors?: FieldErrors,
    readonly headers?: HeadersInit,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

const NO_STORE = { "Cache-Control": "no-store" };

export function ok<T>(data: T, init: { status?: number; headers?: HeadersInit } = {}): Response {
  const headers = new Headers(init.headers);
  for (const [key, value] of Object.entries(NO_STORE)) headers.set(key, value);
  return Response.json({ data }, { status: init.status ?? 200, headers });
}

function errorResponse(error: ApiError): Response {
  const body: ApiErrorBody = {
    error: {
      code: error.code,
      message: error.message,
      ...(error.fieldErrors ? { fieldErrors: error.fieldErrors } : {}),
    },
  };
  const headers = new Headers(error.headers);
  for (const [key, value] of Object.entries(NO_STORE)) headers.set(key, value);
  return Response.json(body, { status: error.status, headers });
}

/**
 * Runs a handler body and converts thrown errors into envelopes. Unexpected
 * errors are logged server-side and answered with a generic 500, never a stack.
 */
export async function handle(run: () => Response | Promise<Response>): Promise<Response> {
  try {
    return await run();
  } catch (error) {
    if (error instanceof ApiError) return errorResponse(error);
    console.error("[oak] Unhandled API error", error);
    return errorResponse(new ApiError(500, "internal_error", "Something went wrong. Please try again."));
  }
}
