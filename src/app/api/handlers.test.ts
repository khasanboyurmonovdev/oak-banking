// Route handlers called directly with Request objects, against the in-memory
// database configured in vitest.config.mts.
import { describe, expect, it, vi } from "vitest";
import type { Transaction } from "@/domain";
import type { ApiErrorBody } from "@/server/http/response";
import type { Overview } from "@/server/services/overview";
import type { TransactionPage } from "@/server/services/transactions";
import type { TransferResult } from "@/server/services/transfers";
import { sessionCookie } from "@/server/test-utils";
import { POST as resetDemo } from "./demo/reset/route";
import { GET as health } from "./health/route";
import { GET as getOverview } from "./overview/route";
import { GET as listTransactions } from "./transactions/route";
import { GET as getTransaction, PATCH as patchTransaction } from "./transactions/[id]/route";
import { POST as postTransfer } from "./transfers/route";

const BASE = "http://localhost:3000";

function get(path: string, cookie?: string) {
  return new Request(`${BASE}${path}`, { headers: cookie ? { cookie } : {} });
}

function send(method: string, path: string, body: unknown, cookie: string, headers: Record<string, string> = {}) {
  return new Request(`${BASE}${path}`, {
    method,
    headers: { cookie, "content-type": "application/json", host: "localhost:3000", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

const params = <T extends Record<string, string>>(value: T) => ({ params: Promise.resolve(value) });

const json = async <T>(response: Response) => (await response.json()) as T;
type Data<T> = { data: T };

describe("session handling", () => {
  it("rejects a missing or tampered cookie with 401", async () => {
    expect((await getOverview(get("/api/overview"))).status).toBe(401);
    const { header } = sessionCookie();
    const tampered = header.slice(0, -2) + (header.endsWith("AA") ? "BB" : "AA");
    const response = await getOverview(get("/api/overview", tampered));
    expect(response.status).toBe(401);
    expect(await json<ApiErrorBody>(response)).toEqual({
      error: { code: "session_required", message: "A valid demo session cookie is required." },
    });
  });
});

describe("GET /api/overview", () => {
  it("returns the derived overview for a valid range", async () => {
    const response = await getOverview(get("/api/overview?range=90d", sessionCookie().header));
    expect(response.status).toBe(200);
    const { data } = await json<Data<Overview>>(response);
    expect(data.range).toBe("90d");
    expect(data.accounts).toHaveLength(3);
    expect(data.cashFlow).toHaveLength(13);
    expect(Number.isSafeInteger(data.consolidated.availableCents)).toBe(true);
    expect(data.runway.basisMonths).toHaveLength(3);
  });

  it("rejects an unknown range with 400 and field errors", async () => {
    const response = await getOverview(get("/api/overview?range=1y", sessionCookie().header));
    expect(response.status).toBe(400);
    const { error } = await json<ApiErrorBody>(response);
    expect(error.code).toBe("validation_error");
    expect(error.fieldErrors?.range).toBeDefined();
  });
});

describe("GET /api/transactions", () => {
  it("filters with the domain URL format and paginates", async () => {
    const { header } = sessionCookie();
    const response = await listTransactions(get("/api/transactions?status=pending&pageSize=5&page=1", header));
    const { data } = await json<Data<TransactionPage>>(response);
    expect(data.total).toBeGreaterThanOrEqual(6);
    expect(data.items).toHaveLength(5);
    expect(data.items.every((tx) => tx.status === "pending")).toBe(true);
    expect((await listTransactions(get("/api/transactions?pageSize=500", header))).status).toBe(400);
  });

  it("totals the whole filtered set, excluding transfers, and agrees with the overview", async () => {
    const { header } = sessionCookie();
    const all = (await json<Data<TransactionPage>>(await listTransactions(get("/api/transactions?pageSize=1", header))))
      .data;
    expect(all.items).toHaveLength(1);
    expect(all.totals.transferCount).toBeGreaterThan(0);

    const completed30d = (
      await json<Data<TransactionPage>>(
        await listTransactions(get("/api/transactions?range=30d&status=completed&pageSize=1", header)),
      )
    ).data;
    const overview = (await json<Data<Overview>>(await getOverview(get("/api/overview?range=30d", header)))).data;
    expect(completed30d.totals.inCents).toBe(overview.period.inCents);
    expect(completed30d.totals.outCents).toBe(overview.period.outCents);

    const transfersOnly = (
      await json<Data<TransactionPage>>(await listTransactions(get("/api/transactions?category=internal_transfer", header)))
    ).data;
    expect(transfersOnly.totals).toMatchObject({ inCents: 0, outCents: 0, transferCount: transfersOnly.total });
  });
});

describe("PATCH /api/transactions/[id]", () => {
  it("sets, then clears a note", async () => {
    const { header } = sessionCookie();
    const set = await patchTransaction(send("PATCH", "/api/transactions/txn_0001", { note: "  Checked " }, header), params({ id: "txn_0001" }));
    expect(set.status).toBe(200);
    expect((await json<Data<Transaction>>(set)).data.note).toBe("Checked");

    await patchTransaction(send("PATCH", "/api/transactions/txn_0001", { note: "" }, header), params({ id: "txn_0001" }));
    const after = await json<Data<Transaction>>(await getTransaction(get("/api/transactions/txn_0001", header), params({ id: "txn_0001" })));
    expect(after.data.note).toBeUndefined();
  });

  it("validates the note and 404s unknown ids", async () => {
    const { header } = sessionCookie();
    const tooLong = await patchTransaction(
      send("PATCH", "/api/transactions/txn_0001", { note: "x".repeat(501) }, header),
      params({ id: "txn_0001" }),
    );
    expect(tooLong.status).toBe(400);
    expect((await json<ApiErrorBody>(tooLong)).error.fieldErrors?.note).toEqual(["Notes can be at most 500 characters."]);
    const missing = await patchTransaction(send("PATCH", "/api/transactions/nope", { note: "x" }, header), params({ id: "nope" }));
    expect(missing.status).toBe(404);
  });
});

describe("POST /api/transfers", () => {
  const body = { fromAccountId: "acc_operating", toAccountId: "acc_reserve", amount: "1,000.00" };
  const key = "a8098c1a-f86e-41b1-a3d3-6c1f3c0e5e2b";

  it("creates once, then replays for the same key", async () => {
    const { header } = sessionCookie();
    const first = await postTransfer(send("POST", "/api/transfers", body, header, { "idempotency-key": key }));
    expect(first.status).toBe(201);
    const created = (await json<Data<TransferResult>>(first)).data;
    expect(created.legs[0].amountCents).toBe(-100_000);

    const replay = await postTransfer(send("POST", "/api/transfers", body, header, { "idempotency-key": key }));
    expect(replay.status).toBe(201);
    expect(replay.headers.get("idempotent-replayed")).toBe("true");
    expect((await json<Data<TransferResult>>(replay)).data).toEqual(created);

    const conflict = await postTransfer(
      send("POST", "/api/transfers", { ...body, amount: "2.00" }, header, { "idempotency-key": key }),
    );
    expect(conflict.status).toBe(409);
  });

  it("returns 400 for bad input, 422 for business-rule failures", async () => {
    const { header } = sessionCookie();
    const noKey = await postTransfer(send("POST", "/api/transfers", body, header));
    expect(noKey.status).toBe(400);

    const badAmount = await postTransfer(
      send("POST", "/api/transfers", { ...body, amount: "12.345" }, header, { "idempotency-key": key }),
    );
    expect(badAmount.status).toBe(400);
    expect((await json<ApiErrorBody>(badAmount)).error.fieldErrors?.amount).toEqual(["Use at most two decimal places."]);

    const tooMuch = await postTransfer(
      send("POST", "/api/transfers", { ...body, amount: "99,000,000" }, header, { "idempotency-key": key }),
    );
    expect(tooMuch.status).toBe(422);
    expect((await json<ApiErrorBody>(tooMuch)).error.code).toBe("insufficient_funds");
  });

  it("enforces content type, body size and same origin", async () => {
    const { header } = sessionCookie();
    const headers = { "idempotency-key": key };
    const text = await postTransfer(send("POST", "/api/transfers", body, header, { ...headers, "content-type": "text/plain" }));
    expect(text.status).toBe(415);
    const big = await postTransfer(send("POST", "/api/transfers", { ...body, description: "x".repeat(9_000) }, header, headers));
    expect(big.status).toBe(413);
    const crossSite = await postTransfer(
      send("POST", "/api/transfers", body, header, { ...headers, origin: "https://evil.example" }),
    );
    expect(crossSite.status).toBe(403);
    const sameSite = await postTransfer(send("POST", "/api/transfers", body, header, { ...headers, origin: BASE }));
    expect(sameSite.status).toBe(201);
    const malformed = await postTransfer(send("POST", "/api/transfers", "{", header, headers));
    expect(malformed.status).toBe(400);
  });

  it("accepts the public origin behind Nginx and rejects others", async () => {
    // Headers as deploy/nginx/oak-banking.conf sets them for http://31.97.188.5:8081.
    const proxied = {
      "idempotency-key": key,
      host: "31.97.188.5:8081",
      "x-forwarded-host": "31.97.188.5:8081",
      "x-forwarded-proto": "http",
      "x-forwarded-for": "203.0.113.7",
    };
    const viaNginx = (origin: string) =>
      postTransfer(send("POST", "/api/transfers", body, sessionCookie().header, { ...proxied, origin }));
    expect((await viaNginx("http://31.97.188.5:8081")).status).toBe(201);
    expect((await viaNginx("http://31.97.188.5:5050")).status).toBe(403);
    expect((await viaNginx("http://evil.example")).status).toBe(403);
    expect((await viaNginx("null")).status).toBe(403);
  });

  it("rate-limits mutations per session with 429 and Retry-After", async () => {
    // Freeze the limiter's clock so slow reseeds can't refill a token mid-test.
    vi.useFakeTimers({ toFake: ["performance"] });
    const { header } = sessionCookie();
    const statuses: number[] = [];
    for (let i = 0; i < 22; i++) {
      const response = await resetDemo(send("POST", "/api/demo/reset", {}, header));
      statuses.push(response.status);
      if (response.status === 429) expect(Number(response.headers.get("retry-after"))).toBeGreaterThan(0);
    }
    expect(statuses.slice(0, 20).every((status) => status === 200)).toBe(true);
    expect(statuses.slice(20)).toEqual([429, 429]);
    // Another session has its own bucket.
    expect((await resetDemo(send("POST", "/api/demo/reset", {}, sessionCookie().header))).status).toBe(200);
    vi.useRealTimers();
  });
});

describe("GET /api/health", () => {
  it("answers without a session", async () => {
    const response = await health();
    expect(response.status).toBe(200);
    expect(await json<Data<{ status: string }>>(response)).toEqual({ data: { status: "ok" } });
  });
});
