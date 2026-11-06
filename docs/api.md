# Oak Banking API

JSON Route Handlers under `/api`. All data is simulated and scoped to the caller's demo session. No real money moves.

## Session model

- The proxy (`src/proxy.ts`) issues an `oak_sid` cookie on the first request: 32 random bytes (base64url), HMAC-SHA256-signed with `SESSION_SECRET`, verified with a timing-safe compare. The cookie is `HttpOnly`, `SameSite=Lax`, `Path=/`, and `Secure` only over HTTPS. A missing or tampered cookie is replaced with a new one.
- The proxy never touches the database. On first use, the service layer creates the session's sandbox and seeds it (deterministic seed as of the creation time). This is idempotent.
- Sliding TTL: `SESSION_TTL_HOURS` (default 72) after last use. An expired sandbox is replaced by a fresh one. Creating a session purges expired sessions and evicts the least recently seen sessions beyond `MAX_SESSIONS` (default 500).
- Every table carries `session_id` with `ON DELETE CASCADE`, so one visitor can never read or change another visitor's data.

## Envelope

Success: `{ "data": … }`. Failure: `{ "error": { "code", "message", "fieldErrors"? } }`. Responses send `Cache-Control: no-store`. Amounts are integer cents (signed on transactions: inflows positive). Timestamps are ISO 8601 UTC.

| Status | Codes | When |
| --- | --- | --- |
| 400 | `validation_error`, `invalid_json` | Bad query, body or header (`fieldErrors` keyed by field) |
| 401 | `session_required` | No valid session cookie (only when the proxy was bypassed) |
| 403 | `forbidden_origin` | Mutation whose `Origin` header doesn't match the host |
| 404 | `not_found` | Unknown account or transaction id |
| 409 | `idempotency_conflict` | `Idempotency-Key` already used with a different body |
| 413 | `payload_too_large` | Body over 8 KB |
| 415 | `unsupported_media_type` | Mutation not sent as `application/json` |
| 422 | `same_account`, `invalid_amount`, `unknown_account`, `inactive_account`, `insufficient_funds` | Transfer breaks a business rule |
| 429 | `rate_limited` | Too many mutations (`Retry-After` header set) |
| 500 | `internal_error` | Unexpected error (logged on the server; no stack trace in the response) |

## Endpoints

### `GET /api/overview?range=7d|30d|90d|12m`
Default range: `30d`. Returns `asOf`, `range`, `accounts[]` (each with `balance: { ledgerCents, holdsCents, availableCents, pendingInCents }`), `consolidated`, `period` (`inCents`, `outCents`, `netCents`, `pendingInCents`, `pendingOutCents`, `count`), `cashFlow[]` (zero-filled buckets: `start`, `inCents`, `outCents`, `netCents`, `closingLedgerCents`), `categorySpend[]` (`category`, `cents`, `share`) and `runway` (`months` or null when not burning, `averageMonthlyNetCents`, `basisMonths` as `YYYY-MM`). Income, expense, category and cash-flow figures exclude internal transfers and failed items.

### `GET /api/accounts`, `GET /api/accounts/{id}`
One account, or all of them, with derived balances.

### `GET /api/transactions`
Filters use the same URL format as the Transactions page (`parseTransactionQuery`): `q`, `direction=in|out`, `status=completed,pending,failed`, `category=…`, `account=…`, `from`/`to` (`YYYY-MM-DD`, inclusive), `sort=date|amount-asc|desc` (default `date-desc`). Unknown filter values are ignored. Pagination: `page` (≥ 1, default 1) and `pageSize` (1–100, default 25). Out-of-range values return 400. Returns `{ items, total, page, pageSize }`.

### `GET /api/transactions/{id}`, `PATCH /api/transactions/{id}`
PATCH body: `{ "note": string }`. The note is trimmed and capped at 500 characters. An empty note clears it. Returns the updated transaction.

### `POST /api/transfers`
Header: `Idempotency-Key: <UUID>` (required). Body: `{ fromAccountId, toAccountId, amount, description? }`, where `amount` is a decimal string such as `"1,000.00"`, parsed to cents without floating point, and `description` is at most 140 characters. The server validates against available balances, then writes both legs and the idempotency record in one `BEGIN IMMEDIATE` transaction. Returns 201 with `{ transferId, legs: [outflow, inflow], balances: { from, to } }`. The same key with the same body replays the original response (201, `Idempotent-Replayed: true`). Only successful transfers consume a key, so a rejected request can be retried with the same key.

### `POST /api/demo/reset`
Body: `{}`. Wipes and reseeds the caller's sandbox only. Returns `{ accounts, transactions }` counts.

### `GET /api/health`
No session needed. Runs `SELECT 1` and returns `{ "data": { "status": "ok" } }`. Used by the container healthcheck.

## Protections on mutations

These are checked in order: same origin (when `Origin` is present), rate limit, session, JSON content type, 8 KB body cap, then JSON and Zod validation. The rate limit is an in-memory token bucket (burst of 20, then 1 every 2 s), keyed by session, with the client IP as a fallback. It is per process: it resets on restart and isn't shared across replicas, which is fine for this single-container demo.

Security headers (set for every route in `next.config.ts`): CSP, `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy` and `Permissions-Policy`. There's no HSTS because the demo is served over HTTP.
