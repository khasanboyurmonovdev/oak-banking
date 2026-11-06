import { Skeleton } from "@/components/ui/skeleton";

/** Pane heights, shared with the chart so its arrival causes no layout shift. */
export const BALANCE_PANE_HEIGHT = 112;
export const FLOWS_PANE_HEIGHT = 200;

/** Same box as CashFlowChart (pane titles included) while recharts loads. */
export function CashFlowChartSkeleton() {
  return (
    <div aria-hidden="true" className="select-none">
      <p className="mb-1 text-xs font-medium text-muted-foreground">Closing balance</p>
      <Skeleton className="rounded-lg" style={{ height: BALANCE_PANE_HEIGHT }} />
      <p className="mt-3 mb-1 text-xs font-medium text-muted-foreground">Money in and out</p>
      <Skeleton className="rounded-lg" style={{ height: FLOWS_PANE_HEIGHT }} />
    </div>
  );
}
