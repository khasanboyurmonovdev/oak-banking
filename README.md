# Oak Banking

Oak Banking is a business-banking dashboard for a fictional company, built as a technical case study. It covers an account overview with cash-flow and spending charts, transaction search and filtering with a detail view, per-account balances and activity, and simulated transfers between the company's own accounts, in a responsive, accessible interface with an original visual identity.

Demo URL: http://31.97.188.5:8081

## Demo disclosure

- **All banking is simulated.** There is no real money, no real bank or account data, and no integration with any banking or payment provider. Every balance, transaction and action is demo data.
- **Per-visitor sandbox.** Your first visit sets a signed session cookie and seeds a private copy of the demo company's data. Other visitors can't see or change it.
- **Data resets.** A sandbox is deleted after 72 hours without use (or earlier if many visitors arrive), and Settings → Reset demo data restores the seed at any time.
- **Plain HTTP.** The demo is served over HTTP on an IP address, without TLS. Don't enter anything you'd want to keep private.

## What's inside

- **Overview:** balance hero showing Ledger − Holds = Available, plus pending-in and a runway metric; cash-flow chart (7 days / 30 days / 13 weeks / 12 months) with money in/out and closing balance, plus a "view as table" toggle; spending by category.
- **Transactions:** search, filters (direction, date, account, category, status), sorting by date and amount, URL-driven so any view is shareable, deep-linkable detail drawer, editable persisted notes.
- **Accounts:** per-account balances, holds, pending-in and recent activity.
- **Move money:** validated transfer between own accounts with a review step.
- **Settings:** reset demo data and demo disclosure.

## Stack

- [Next.js](https://nextjs.org) (App Router) with React and TypeScript (strict)
- Tailwind CSS with [shadcn/ui](https://ui.shadcn.com) (Radix primitives), Lucide icons, Geist Sans and Geist Mono
- Route Handlers → services → repositories → SQLite (`node:sqlite`, built into Node 24, so no native module to compile)
- Zod for input validation, Vitest for tests
- Recharts for charts

Money is stored as integer cents; balances, totals and chart series are derived by pure selectors in `src/domain/`. The API is documented in [docs/api.md](docs/api.md).

## Product and engineering decisions

- **Money model:** integer cents; balances derived from each account's opening balance and its transaction ledger, never stored, so summaries, charts and account cards cannot disagree. Internal transfers are excluded from income, spending and cash-flow totals, and the UI says so.
- **Real backend, not a mock:** Route Handlers → services → repositories → SQLite, Zod validation on the server, and the transfer form reuses the same schema on the client.
- **Transfers:** one database transaction (both sides post or neither), idempotency keys (a double-click or retry replays the same result), validation of positive amount, max 2 decimals, different active accounts, sufficient available funds.
- **Per-visitor sandbox:** every reviewer gets a private copy of the data.
- **Quality:** 271 automated tests (domain calculations, filtering, services, API handlers, transfer form validation); lint, typecheck and production build pass. Lighthouse scored Accessibility 100 and SEO 100 on Overview and Accounts (mobile and desktop).
- **Scope:** Cards, Analytics, Payments, CSV export and a command palette were deliberately cut to finish the core flows to a high standard within the time limit.

## Local setup

Requires Node.js 24 or newer.

```bash
npm ci
cp .env.example .env.local   # optional in development; defaults are used otherwise
npm run dev                  # http://localhost:3000
```

| Command             | Purpose                                                           |
| ------------------- | ----------------------------------------------------------------- |
| `npm run dev`       | Dev server (Turbopack)                                            |
| `npm run lint`      | ESLint                                                            |
| `npm run typecheck` | Generate Next.js route types, then `tsc`                          |
| `npm run test`      | Vitest: domain, services and route handlers on in-memory SQLite   |
| `npm run build`     | Production build                                                  |
| `npm run start`     | Serve the production build                                        |

Environment variables (see `.env.example`):

| Variable            | Default         | Notes                                                        |
| ------------------- | --------------- | ------------------------------------------------------------ |
| `DATABASE_PATH`     | `./data/oak.db` | SQLite file; its directory is created on first use           |
| `SESSION_SECRET`    | dev-only value  | Required in production, at least 32 characters               |
| `SESSION_TTL_HOURS` | `72`            | Sliding sandbox lifetime                                     |
| `MAX_SESSIONS`      | `500`           | Sandboxes kept at once; least recently seen are evicted      |

`npm run start` exits at startup if `SESSION_SECRET` is missing or too short.

## Deployment

The demo runs on a shared Hostinger VPS without Docker:

```
browser ──HTTP :8081──▶ Nginx ──▶ 127.0.0.1:5050  next start (PM2 "oak-banking", Node 24)
```

- **Nginx** (`deploy/nginx/oak-banking.conf`) listens on 8081 and proxies to the app. It overwrites `Host`, `X-Forwarded-Host`, `X-Forwarded-Proto` and `X-Forwarded-For` on every request, so client-supplied values never reach the app, and rejects bodies over 16 KB.
- **PM2** (`ecosystem.config.cjs`) runs one fork-mode instance with `/opt/node-24/bin/node`, from `/var/www/oak-banking`, bound to `127.0.0.1:5050`. It restarts above 400 MB of memory; `restart_delay`, `min_uptime` and `max_restarts` stop a crash loop (for example a missing `SESSION_SECRET`) from restarting forever.
- **Secrets** live in `/etc/oak-banking.env` (root-owned, mode 600), loaded with `node --env-file`. They are never in the repository.

**Proxy trust.** The app trusts the `X-Forwarded-*` headers for the same-origin check on mutations, rate-limit keys and the cookie's `Secure` flag. That is safe only because it listens on loopback, so Nginx is its sole caller. Don't expose port 5050.

First deploy:

```bash
# /etc/oak-banking.env
NODE_ENV=production
DATABASE_PATH=/var/www/oak-banking/data/oak.db
SESSION_SECRET=<48 random bytes, base64url>

cd /var/www/oak-banking
npm ci && npm run build
pm2 start ecosystem.config.cjs && pm2 save
sudo cp deploy/nginx/oak-banking.conf /etc/nginx/sites-available/
sudo ln -s /etc/nginx/sites-available/oak-banking.conf /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
curl -fsS http://127.0.0.1:5050/api/health && curl -fsS http://31.97.188.5:8081/api/health
```

Updates: `npm ci && npm run build && pm2 reload oak-banking`.

## AI-assisted workflow

The project is built with Claude Code as the implementing agent, working from written specs: the case-study requirements, a decisions log (`docs/DECISIONS.md`) and project rules in `CLAUDE.md` (architecture layering, money invariants, design and accessibility rules). Work proceeds in small phases; each phase is a scoped prompt.

- **Claude Code implements** each phase and reports what it changed, the decisions it made and the command output.
- **I review** every change before committing it: reading the diff, checking it against the specs, and asking for fixes where it falls short.
- **Verification is by real commands**, not claims: lint, typecheck, Vitest (domain selectors, services, and route handlers against in-memory SQLite) and a production build every phase, plus smoke checks against the running app.

In practice:

- **Claude Code** wrote the implementation: domain layer, backend and API, every page, tests and deployment config.
- **I** reviewed and tested every phase before committing it, and sent fixes back where the result fell short of the spec.
- **A Claude web Project** (holding the specs and docs) was used for planning: breaking the work into phases, writing the phase prompts, and reviewing Claude Code's reports before the next phase.

## Known limitations

- **Simulated data only.** One fictional company, three accounts, seeded history. No real banking, payments or account numbers, and transfers only move money between the company's own demo accounts.
- **Not built:** no Cards, Analytics or Payments pages, no CSV export or command palette, and no authentication (the signed-in user is fictional). Charts live on the Overview.
- **Mobile performance:** on the Overview, the figures appear after the page's JavaScript loads and fetches `/api/overview`. Lighthouse mobile Performance is about 50–60 under its slow-phone throttling (desktop is higher but varies, roughly 75–90 across runs). The planned fix is server-rendering the initial Overview data.
- **HTTP only.** Served on an IP address without TLS, so there's no HSTS and the session cookie isn't `Secure`.
- **In-memory rate limit.** The mutation rate limiter lives in process memory: it resets on restart and isn't shared between processes.
- **Single instance.** One PM2 process with a local SQLite file; it isn't set up to scale horizontally.
