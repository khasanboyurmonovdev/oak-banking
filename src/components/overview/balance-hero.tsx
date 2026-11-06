import { formatMoney } from "@/domain/money";
import { formatYearMonth } from "@/lib/format";
import type { Overview } from "@/server/services/overview";

/** "Aug–Oct 2026", or "Nov 2025–Jan 2026" across a year boundary. */
function formatBasis(months: readonly string[]): string {
  const first = months[0];
  const last = months[months.length - 1];
  if (!first || !last) return "";
  if (first.slice(0, 4) === last.slice(0, 4)) {
    return `${formatYearMonth(first).split(" ")[0]}–${formatYearMonth(last)}`;
  }
  return `${formatYearMonth(first)}–${formatYearMonth(last)}`;
}

function runwayValue(months: number | null): string {
  if (months === null) return "Not burning";
  if (months >= 100) return "99+ months";
  return `${months.toFixed(1)} months`;
}

/**
 * The page's signature element (docs/DECISIONS.md D9): Available cash as the
 * headline, reconciled from Ledger − Holds, with incoming funds and runway
 * alongside. Everything else on the page is visually subordinate to it.
 */
export function BalanceHero({ overview }: { overview: Overview }) {
  const { consolidated, runway, accounts } = overview;
  const basis = formatBasis(runway.basisMonths);
  const burning = runway.averageMonthlyNetCents < 0;

  return (
    <section aria-labelledby="available-cash" className="rounded-2xl bg-brand p-6 text-white md:p-8">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,22rem)] lg:gap-10">
        <div className="min-w-0">
          <h2 id="available-cash" className="text-[13px] font-medium text-mint">
            Available cash
          </h2>
          <p className="num mt-2 text-4xl font-semibold tracking-tight break-words md:text-5xl">
            {formatMoney(consolidated.availableCents)}
          </p>
          <p className="mt-2 text-[13px] text-white/75">
            Across {accounts.length} accounts · USD · ready to spend or move today
          </p>

          <p className="sr-only">
            Ledger balance {formatMoney(consolidated.ledgerCents)}, minus holds for pending payments{" "}
            {formatMoney(consolidated.holdsCents)}, equals available cash {formatMoney(consolidated.availableCents)}.
          </p>
          {/* Mobile: a vertical statement with operators in a gutter. sm+: one line. */}
          <dl
            aria-hidden="true"
            className="mt-6 grid gap-2 border-t border-white/15 pt-5 sm:flex sm:flex-wrap sm:items-end sm:gap-x-4 sm:gap-y-3"
          >
            {[
              { op: "", label: "Ledger balance", cents: consolidated.ledgerCents },
              { op: "−", label: "Holds (pending out)", cents: consolidated.holdsCents },
              { op: "=", label: "Available", cents: consolidated.availableCents },
            ].map((item) => (
              <div key={item.label} className="contents">
                {item.op ? <span className="hidden pb-0.5 text-base text-mint sm:inline">{item.op}</span> : null}
                <div className="flex items-baseline justify-between gap-3 sm:block">
                  <dt className="text-xs text-white/70">
                    <span className="inline-block w-4 text-mint sm:hidden">{item.op}</span>
                    {item.label}
                  </dt>
                  <dd className="num mt-0.5 text-base font-medium">{formatMoney(item.cents)}</dd>
                </div>
              </div>
            ))}
          </dl>
        </div>

        <dl className="grid content-start gap-5 border-t border-white/15 pt-6 sm:grid-cols-2 lg:grid-cols-1 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-10">
          <div>
            <dt className="text-[13px] font-medium text-mint">Pending in</dt>
            <dd className="num mt-1 text-xl font-semibold">{formatMoney(consolidated.pendingInCents, { signed: true })}</dd>
            <dd className="mt-1 text-xs text-white/70">Incoming, not available until it settles</dd>
          </div>
          <div>
            <dt className="text-[13px] font-medium text-mint">Runway</dt>
            <dd className="num mt-1 text-xl font-semibold">{runwayValue(runway.months)}</dd>
            <dd className="mt-1 text-xs text-white/70">
              {burning
                ? `Available cash ÷ avg monthly net burn of ${formatMoney(-runway.averageMonthlyNetCents)}, ${basis} (${runway.basisMonths.length} months)`
                : `Net positive on average over ${basis} (${runway.basisMonths.length} months)`}
            </dd>
          </div>
        </dl>
      </div>
    </section>
  );
}
