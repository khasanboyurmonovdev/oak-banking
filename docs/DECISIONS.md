# Decisions (override earlier docs where they conflict)

## D1. Real backend (overrides "no backend")
This is a full-stack evaluation, so the app has a thin real backend: Next.js Route Handlers → services → repositories → SQLite. Zod validates input server-side. Transfers run in a DB transaction with idempotency keys. No external banking APIs.

## D2. Per-visitor demo state
Public reviewers will interact with the demo, so state is isolated per visitor: a session cookie identifies a sandbox, and seed data is created lazily per session. A visible "Reset demo data" action lives in Settings. Sessions expire after a TTL cleanup.

## D3. Balance model and money
See "Money and balance invariants" in CLAUDE.md (authoritative). Balances are derived, not stored. The `Account` type in TECHNICAL_ARCHITECTURE.md is a suggestion only; do not store ledger/available/pending on it.

## D4. Seed data
A fictional company with three accounts: Operating, Payroll, Reserve. About 12 months of history, 350–450 transactions, deterministic, relative to today. It includes recurring vendors, semi-monthly payroll funded by transfers from Operating, customer payments and processor payouts, card spend, ACH and wires, some pending and a few failed items. No real bank or account numbers.

## D5. Stack choices
npm, Geist fonts, Vitest. Zustand is not needed, since server state flows through the API and view state through the URL. Do not add it unless a concrete need appears.

## D6. Scope changes
- No Notifications page. A bell popover fed by real events comes later.
- No Help page. Settings is minimal (Reset demo data, about/demo disclosure).
- Nav items appear only when their page exists.

## D7. Additions (priority order)
1. URL-driven filters and a deep-linkable transaction drawer
2. Editable, persisted transaction note
3. CSV export of the current filtered view
4. "Send payment" to a saved recipient: creates a pending outflow that settles after a short simulated delay
5. Runway metric: available cash ÷ average monthly net burn
6. Command palette (Cmd/Ctrl+K), only if time remains

## D8. Deployment
Docker on the Hostinger VPS, served at `http://<VPS_IP>:<port>`. Inspect the VPS before changing anything and don't disrupt other services. A skeleton deploy happens right after the backend phase to surface infrastructure problems early.

## D9. Overview signature element
The balance hero is a dark forest-green panel that shows the reconciliation: Ledger − Holds = Available, with Pending in alongside. Secondary metrics stay visually subordinate.