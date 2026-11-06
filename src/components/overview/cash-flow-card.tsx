"use client";

import { RANGE_KEYS, RANGE_LABELS, resolveRange, type RangeKey } from "@/domain/analytics";
import { formatMoney } from "@/domain/money";
import { EmptyState } from "@/components/data-state";
import { SegmentedControl } from "@/components/segmented-control";
import type { Overview } from "@/server/services/overview";
import { cn } from "@/lib/utils";

import { bucketLabel, CashFlowChart } from "./cash-flow-chart";

const RANGE_OPTIONS = RANGE_KEYS.map((key) => ({ value: key, label: RANGE_LABELS[key] }));

function summaryText(overview: Overview): string {
  const { period, cashFlow, range } = overview;
  const unit = resolveRange(range, new Date(overview.asOf)).unit;
  const first = cashFlow[0];
  const last = cashFlow[cashFlow.length - 1];
  const peakIn = cashFlow.reduce((best, bucket) => (bucket.inCents > best.inCents ? bucket : best), cashFlow[0]);
  const parts = [
    `Cash flow for the last ${RANGE_LABELS[range]}, excluding internal transfers:`,
    `money in ${formatMoney(period.inCents)}, money out ${formatMoney(period.outCents)}, net ${formatMoney(period.netCents, { signed: true })}.`,
  ];
  if (first && last) {
    parts.push(
      `Closing balance went from ${formatMoney(first.closingLedgerCents)} at the end of ${bucketLabel(first.start, unit)} to ${formatMoney(last.closingLedgerCents)} at the end of ${bucketLabel(last.start, unit)}.`,
    );
  }
  if (peakIn && peakIn.inCents > 0) {
    parts.push(`The most money came in during ${bucketLabel(peakIn.start, unit)}: ${formatMoney(peakIn.inCents)}.`);
  }
  return parts.join(" ");
}

function Stat({ label, value, swatch }: { label: string; value: string; swatch?: string }) {
  return (
    <div className="min-w-0">
      <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {swatch ? <span aria-hidden="true" className={cn("size-2 rounded-[2px]", swatch)} /> : null}
        {label}
      </dt>
      <dd className="num mt-0.5 text-lg font-semibold text-foreground">{value}</dd>
    </div>
  );
}

export function CashFlowCard({
  overview,
  range,
  onRangeChange,
  isUpdating,
}: {
  overview: Overview;
  range: RangeKey;
  onRangeChange: (range: RangeKey) => void;
  isUpdating: boolean;
}) {
  const { period, cashFlow } = overview;
  const unit = resolveRange(overview.range, new Date(overview.asOf)).unit;
  const hasActivity = cashFlow.some((bucket) => bucket.inCents > 0 || bucket.outCents > 0);

  return (
    <section aria-labelledby="cash-flow-title" className="rounded-xl border border-border bg-surface p-5 md:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 id="cash-flow-title" className="text-base font-semibold text-foreground">
            Cash flow
          </h2>
          <p className="mt-0.5 text-[13px] text-muted-foreground">Completed activity, excluding internal transfers</p>
        </div>
        <SegmentedControl label="Time range" options={RANGE_OPTIONS} value={range} onChange={onRangeChange} />
      </div>

      <div aria-busy={isUpdating} className={cn("transition-opacity", isUpdating && "opacity-60")}>
        <dl className="mt-5 flex flex-wrap gap-x-8 gap-y-3 border-b border-border pb-5">
          <Stat label="Money in" value={formatMoney(period.inCents)} swatch="bg-chart-in" />
          <Stat label="Money out" value={formatMoney(period.outCents)} swatch="bg-chart-out" />
          <Stat label="Net" value={formatMoney(period.netCents, { signed: true })} />
        </dl>

        {hasActivity ? (
          <figure className="mt-5">
            <figcaption className="sr-only">{summaryText(overview)}</figcaption>
            <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground" aria-hidden="true">
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-[2px] bg-chart-in" />
                Money in
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-[2px] bg-chart-out" />
                Money out
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-0.5 w-3 rounded-full bg-foreground" />
                Closing balance (incl. transfers)
              </span>
            </div>
            <CashFlowChart buckets={cashFlow} unit={unit} />
            <details className="mt-4 text-[13px]">
              <summary className="w-fit cursor-pointer rounded-sm text-muted-foreground hover:text-foreground">
                View as table
              </summary>
              <div className="mt-3 max-h-72 overflow-auto rounded-lg border border-border">
                <table className="w-full text-left">
                  <caption className="sr-only">Cash flow by period, last {RANGE_LABELS[overview.range]}</caption>
                  <thead className="sticky top-0 bg-surface-secondary text-xs text-muted-foreground">
                    <tr>
                      <th scope="col" className="px-3 py-2 font-medium">Period</th>
                      <th scope="col" className="px-3 py-2 text-right font-medium">In</th>
                      <th scope="col" className="px-3 py-2 text-right font-medium">Out</th>
                      <th scope="col" className="hidden px-3 py-2 text-right font-medium sm:table-cell">Closing</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cashFlow.map((bucket) => (
                      <tr key={bucket.start} className="border-t border-border">
                        <th scope="row" className="px-3 py-1.5 font-normal whitespace-nowrap">
                          {bucketLabel(bucket.start, unit)}
                        </th>
                        <td className="num px-3 py-1.5 text-right">{formatMoney(bucket.inCents)}</td>
                        <td className="num px-3 py-1.5 text-right">{formatMoney(bucket.outCents)}</td>
                        <td className="num hidden px-3 py-1.5 text-right sm:table-cell">
                          {formatMoney(bucket.closingLedgerCents)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          </figure>
        ) : (
          <EmptyState
            title={`No completed money in or out in the last ${RANGE_LABELS[overview.range]}`}
            description="Try a longer time range. Internal transfers and pending items are not counted here."
          />
        )}
      </div>
    </section>
  );
}
