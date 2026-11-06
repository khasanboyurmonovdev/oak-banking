"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { RANGE_KEYS, type RangeKey } from "@/domain/analytics";
import { SEED_COMPANY } from "@/domain/seed";
import { ErrorState } from "@/components/data-state";
import { MoveMoneyButton } from "@/components/move-money/move-money-provider";
import { PageHeader } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { useApi } from "@/hooks/use-api";
import { formatDate } from "@/lib/format";
import type { Overview } from "@/server/services/overview";
import type { TransactionPage } from "@/server/services/transactions";

import { AccountsList } from "./accounts-list";
import { BalanceHero } from "./balance-hero";
import { CashFlowCard } from "./cash-flow-card";
import { CategorySpend } from "./category-spend";
import { RecentTransactions } from "./recent-transactions";

const DEFAULT_RANGE: RangeKey = "30d";
const RECENT_COUNT = 8;

function Card({ className, children }: { className?: string; children?: React.ReactNode }) {
  return <div className={`rounded-xl border border-border bg-surface ${className ?? ""}`}>{children}</div>;
}

export function OverviewSkeleton() {
  return (
    <div className="grid gap-6" aria-busy="true" aria-label="Loading overview">
      <PageHeader title="Overview" description={SEED_COMPANY.name} />
      <Skeleton className="h-64 rounded-2xl" />
      <div className="grid gap-6 xl:grid-cols-3">
        <Skeleton className="h-[30rem] rounded-xl xl:col-span-2" />
        <Skeleton className="h-[30rem] rounded-xl" />
      </div>
    </div>
  );
}

/** The range lives in the URL (`?range=`); the default (30 days) is omitted. */
export function OverviewView() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const range = RANGE_KEYS.find((key) => key === searchParams.get("range")) ?? DEFAULT_RANGE;

  const overview = useApi<Overview>(`/api/overview?range=${range}`, { keepPrevious: true });
  const recent = useApi<TransactionPage>(`/api/transactions?pageSize=${RECENT_COUNT}`);

  const setRange = (next: RangeKey) => {
    const params = new URLSearchParams(searchParams);
    if (next === DEFAULT_RANGE) params.delete("range");
    else params.set("range", next);
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  const data = overview.data;
  if (!data) {
    if (overview.error) {
      return (
        <div className="grid gap-6">
          <PageHeader title="Overview" description={SEED_COMPANY.name} />
          <Card>
            <ErrorState title="Couldn't load your overview" message={overview.error.message} onRetry={overview.reload} />
          </Card>
        </div>
      );
    }
    return <OverviewSkeleton />;
  }

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Overview"
        description={`${SEED_COMPANY.name} · As of ${formatDate(data.asOf)}`}
        actions={<MoveMoneyButton />}
      />
      <BalanceHero overview={data} />

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="min-w-0 xl:col-span-2">
          <CashFlowCard overview={data} range={range} onRangeChange={setRange} isUpdating={overview.isLoading} />
        </div>
        <CategorySpend overview={data} range={data.range} />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <AccountsList accounts={data.accounts} />
        <div className="min-w-0 xl:col-span-2">
          {recent.data ? (
            <RecentTransactions transactions={recent.data.items} />
          ) : recent.error ? (
            <Card>
              <ErrorState title="Couldn't load recent transactions" message={recent.error.message} onRetry={recent.reload} />
            </Card>
          ) : (
            <Skeleton className="h-[26rem] rounded-xl" />
          )}
        </div>
      </div>
    </div>
  );
}
