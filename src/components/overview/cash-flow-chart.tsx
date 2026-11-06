"use client";

import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import type { BucketUnit, CashFlowBucket } from "@/domain/analytics";
import { formatMoney } from "@/domain/money";
import { bucketLabel, formatMonth, formatShortDate } from "@/lib/format";

import { BALANCE_PANE_HEIGHT, FLOWS_PANE_HEIGHT } from "./cash-flow-chart-skeleton";

const Y_AXIS_WIDTH = 64;
const AXIS_TICK = { fill: "var(--text-secondary)", fontSize: 12 };

function tickLabel(start: string, unit: BucketUnit): string {
  if (unit === "month") return formatMonth(start).split(" ")[0] ?? start;
  return formatShortDate(start);
}

const compact = (cents: number) => formatMoney(Math.round(cents), { compact: true });

function TooltipBody({ bucket, unit }: { bucket: CashFlowBucket; unit: BucketUnit }) {
  const rows = [
    { label: "Money in", value: formatMoney(bucket.inCents), swatch: "bg-chart-in" },
    { label: "Money out", value: formatMoney(bucket.outCents), swatch: "bg-chart-out" },
    { label: "Net", value: formatMoney(bucket.netCents, { signed: true }) },
    { label: "Closing balance", value: formatMoney(bucket.closingLedgerCents) },
  ];
  return (
    <div className="min-w-52 rounded-lg border border-border bg-surface p-3 text-[13px] shadow-md">
      <p className="mb-2 font-medium text-foreground">{bucketLabel(bucket.start, unit)}</p>
      <dl className="grid gap-1">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between gap-4">
            <dt className="flex items-center gap-2 text-muted-foreground">
              {row.swatch ? <span aria-hidden="true" className={`size-2 rounded-[2px] ${row.swatch}`} /> : null}
              {row.label}
            </dt>
            <dd className="num font-medium text-foreground">{row.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/**
 * Two aligned panes sharing one time axis and one synced tooltip: closing
 * balance on top, money in/out below. Balance (millions) and flows
 * (thousands) never share a y-scale, which a dual-axis chart would force.
 * Decorative to assistive tech: the parent figure carries a text summary.
 */
export function CashFlowChart({ buckets, unit }: { buckets: readonly CashFlowBucket[]; unit: BucketUnit }) {
  const data = [...buckets];
  const find = (label: unknown) => buckets.find((bucket) => bucket.start === label);
  const xAxis = {
    dataKey: "start",
    tickLine: false,
    axisLine: false,
    tick: AXIS_TICK,
    tickFormatter: (value: string) => tickLabel(value, unit),
    minTickGap: 16,
    interval: "preserveStartEnd" as const,
  };
  const yAxis = {
    width: Y_AXIS_WIDTH,
    tickLine: false,
    axisLine: false,
    tick: AXIS_TICK,
    tickFormatter: compact,
    tickCount: 4,
  };

  return (
    <div aria-hidden="true" className="select-none">
      <p className="mb-1 text-xs font-medium text-muted-foreground">Closing balance</p>
      <ResponsiveContainer width="100%" height={BALANCE_PANE_HEIGHT}>
        <LineChart data={data} syncId="cash-flow" margin={{ top: 4, right: 8, bottom: 0, left: 0 }} accessibilityLayer={false}>
          <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
          <XAxis {...xAxis} hide />
          <YAxis {...yAxis} domain={["auto", "auto"]} />
          <Tooltip content={() => null} cursor={{ stroke: "var(--border-strong)" }} isAnimationActive={false} />
          <Line
            dataKey="closingLedgerCents"
            stroke="var(--chart-balance)"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, stroke: "var(--surface)", strokeWidth: 2 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>

      <p className="mt-3 mb-1 text-xs font-medium text-muted-foreground">Money in and out</p>
      <ResponsiveContainer width="100%" height={FLOWS_PANE_HEIGHT}>
        <BarChart
          data={data}
          syncId="cash-flow"
          barGap={2}
          barCategoryGap="20%"
          margin={{ top: 4, right: 8, bottom: 0, left: 0 }}
          accessibilityLayer={false}
        >
          <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
          <XAxis {...xAxis} />
          <YAxis {...yAxis} />
          <Tooltip
            cursor={{ fill: "var(--surface-secondary)" }}
            isAnimationActive={false}
            content={({ active, label }) => {
              const bucket = active ? find(label) : undefined;
              return bucket ? <TooltipBody bucket={bucket} unit={unit} /> : null;
            }}
          />
          <Bar dataKey="inCents" fill="var(--chart-in)" radius={[4, 4, 0, 0]} maxBarSize={20} isAnimationActive={false} />
          <Bar dataKey="outCents" fill="var(--chart-out)" radius={[4, 4, 0, 0]} maxBarSize={20} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
