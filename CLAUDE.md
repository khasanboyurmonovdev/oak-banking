# Oak Banking: CLAUDE.md

## Project
Oak Banking is a fictional business-banking dashboard, built as a technical case study for a Senior Full-Stack Engineer role at Post Oak Group. It is evaluated on: modern UI/UX, account overview, transaction management (search, filter, details), data visualization, working interactive features, technical implementation quality, and effective AI-assisted development.

Deliverables: a deployed app (Hostinger VPS, `http://<VPS_IP>:<port>`), this GitHub repo, and a README explaining the stack and the AI workflow.

All banking is simulated. Never imply real money movement, and never integrate real banking or payment APIs. Every simulated action is labelled as demo behaviour where relevant.

## Source of truth (highest priority first)
1. `docs/CASE_STUDY_REQUIREMENTS.md` (assignment requirements and acceptance criteria)
2. `docs/DECISIONS.md` (decisions that override the other docs)
3. This file
4. `docs/PRODUCT_SPEC.md`, `docs/DESIGN_SYSTEM.md`, `docs/TECHNICAL_ARCHITECTURE.md`, `docs/IMPLEMENTATION_PLAN.md`, `docs/QUALITY_CHECKLIST.md`

Read the docs relevant to the current phase. Don't re-read all of them every time. If two sources conflict, follow the higher one and mention the conflict in your report.

## Stack
Next.js (App Router), React, TypeScript (strict), Tailwind CSS, shadcn/ui, Lucide, Recharts, Zod, Vitest, SQLite behind a repository layer. Package manager: npm. Fonts: Geist Sans (UI) and Geist Mono (references/IDs). The SQLite driver is chosen in the backend phase and must install on both Windows (dev) and Linux/Docker (prod).

## Commands
- `npm install`: install dependencies
- `npm run dev`: dev server (Turbopack) on http://localhost:3000
- `npm run lint`: ESLint
- `npm run typecheck`: `next typegen && tsc --noEmit` (typegen is required: `LayoutProps`/`PageProps` are generated globals)
- `npm run build`: production build
- `npm run start`: serve the production build
- `npx shadcn@latest add <component>`: add a shadcn/ui component (radix base, style `radix-nova`)

Local network note: this machine's Avast web shield intercepts HTTPS, and the user-level npm `cafile` does not trust it. If npm fails with `UNABLE_TO_VERIFY_LEAF_SIGNATURE`, prefix commands with `npm_config_cafile="$NODE_EXTRA_CA_CERTS"` (Bash) rather than changing global config.

## Architecture rules
- `src/domain/` is pure TypeScript: models, money utilities, seed generator, selectors, validation rules. It must not import React, Next.js or database code.
- Layering: UI components → client hooks/API client → route handlers → services → repositories → SQLite. Route handlers validate input with Zod and contain no business logic.
- Financial logic never lives in JSX. Components render and handle interaction.
- Derived values (balances, totals, chart series, filtered lists) are computed with pure selectors, never stored.
- Filter state lives in the URL (search params). The open transaction lives in `?tx=<id>`.
- Prefer small, focused components. Extract only when it improves clarity or reuse. No speculative abstractions.
- No `any`. No unused code or dead components. No new dependency without a one-line justification in your report.

## Money and balance invariants
- All amounts are integer cents. Convert only at the display edge with `Intl.NumberFormat`. Currency is USD.
- Accounts store only an opening balance. Ledger balance = opening + sum of signed COMPLETED transactions.
- Pending outflows are holds: Available = Ledger − pending outflows. Pending inflows are shown separately and are not available until settled.
- Failed transactions are excluded from balances and analytics.
- Internal transfers are two linked transactions (shared `transferId`, type `transfer`). They are EXCLUDED from income, expense, category and cash-flow analytics.
- Seed data is deterministic (seeded PRNG) with dates relative to "today", so 7d/30d/90d/12m ranges always have data.
- Transfers are atomic, validated server-side, and protected from duplicate submission by an idempotency key.

## Design rules
- Follow `docs/DESIGN_SYSTEM.md` (deep forest green, warm off-white, restrained mint, fine borders, minimal shadows, consistent radii). The identity is original. Never copy Mercury, Slash or other brands.
- Money uses tabular numerals. Amounts are right-aligned in tables. Colour is never the only status signal (add a label or icon).
- Desktop ≥1024px: full sidebar. Tablet 768–1023px: icon rail with tooltips. Mobile <768px: bottom tab bar, and transaction tables become card lists.
- No decorative controls: every visible button, tab, menu and link must work. Don't render nav items for pages that don't exist yet.
- Every data view needs loading, empty and error states. Use toasts for action feedback, never `alert()`.
- Accessibility: semantic HTML, skip-to-content link, visible focus rings, labelled controls, `aria-current` on active nav, text alternatives for charts, accessible dialogs and drawers.

## Workflow rules
- Work phase by phase. Do only the phase you were asked to do.
- Inspect before changing. Never overwrite existing work or replace working config without a clear reason.
- Verify with real commands (lint, typecheck, tests, build, dev server). Report actual results. Never claim something works unless you ran it. If you cannot verify something visually, say so.
- Git: small conventional commits at the end of logical steps. Never push. Never commit secrets, `.env*` (except `.env.example`), or `*.db` files. `docs/PROJECT_BRIEF.md` is git-ignored.
- Ask a question only when a decision materially changes scope or architecture. Otherwise decide, and note the decision in your report.
- Windows dev machine: keep npm scripts cross-platform (no `rm -rf`, no bash-only syntax), and mind path separators.
- VPS: do not touch it until the deployment phase. Then inspect before changing, never disrupt other services, and never store credentials in the repo.
- Update the Commands and Status sections of this file when they change.

## Status
- [x] Phase 1A: scaffold, tooling, tokens, app shell
- [ ] Phase 1B: domain layer (types, seed data, selectors, tests)
- [ ] Phase 2: backend (SQLite, API, sessions) + skeleton deploy to VPS
- [ ] Phase 3: Overview
- [ ] Phase 4: Transactions
- [ ] Phase 5: Transfers/payments, Cards, Accounts
- [ ] Phase 6: Analytics
- [ ] Phase 7: Polish, verification, README, final deploy, submission