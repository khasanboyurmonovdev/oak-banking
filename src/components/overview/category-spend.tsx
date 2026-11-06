import Link from "next/link";

import { RANGE_LABELS, topCategorySpend, type RangeKey } from "@/domain/analytics";
import { categoryLabel } from "@/domain/categories";
import { formatMoney } from "@/domain/money";
import { EmptyState } from "@/components/data-state";
import type { Overview } from "@/server/services/overview";

const TOP_CATEGORIES = 6;
const percent = new Intl.NumberFormat("en-US", { style: "percent", maximumFractionDigits: 0 });

/** Ranked bars of completed spend by category for the selected range (top 6 + Other). */
export function CategorySpend({ overview, range }: { overview: Overview; range: RangeKey }) {
  const rows = topCategorySpend(overview.categorySpend, TOP_CATEGORIES);
  const max = rows.reduce((largest, row) => Math.max(largest, row.cents), 0);

  return (
    <section aria-labelledby="category-spend-title" className="rounded-xl border border-border bg-surface p-5 md:p-6">
      <h2 id="category-spend-title" className="text-base font-semibold text-foreground">
        Spending by category
      </h2>
      <p className="mt-0.5 text-[13px] text-muted-foreground">
        Last {RANGE_LABELS[range]} · {formatMoney(overview.period.outCents)} total
      </p>

      {rows.length === 0 ? (
        <EmptyState title="No spending in this period" description="Try a longer time range." />
      ) : (
        <ol className="mt-5 grid gap-4">
          {rows.map((row) => {
            const label = row.category === "other" ? "Other" : categoryLabel(row.category);
            const width = max > 0 ? Math.max(1, (row.cents / max) * 100) : 0;
            return (
              <li key={row.category}>
                <div className="flex items-baseline justify-between gap-3 text-[13px]">
                  {row.category === "other" ? (
                    <span className="truncate text-foreground">{label}</span>
                  ) : (
                    <Link
                      href={`/transactions?direction=out&category=${row.category}&range=${range}&status=completed`}
                      className="truncate rounded-sm text-foreground underline-offset-4 hover:underline"
                    >
                      {label}
                      <span className="sr-only">, view transactions</span>
                    </Link>
                  )}
                  <span className="shrink-0 text-muted-foreground">
                    <span className="num font-medium text-foreground">{formatMoney(row.cents)}</span>
                    <span className="num ml-2 inline-block w-9 text-right">{percent.format(row.share)}</span>
                  </span>
                </div>
                <div aria-hidden="true" className="mt-1.5 h-1.5 rounded-full bg-surface-secondary">
                  <div className="h-full rounded-full bg-chart-out" style={{ width: `${width}%` }} />
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
