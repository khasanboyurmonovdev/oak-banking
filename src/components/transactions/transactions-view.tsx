"use client";

import { useCallback, useRef } from "react";

import { formatMoney } from "@/domain/money";
import type { SortField } from "@/domain/transaction-query";
import { EmptyState, ErrorState } from "@/components/data-state";
import { MoveMoneyButton } from "@/components/move-money/move-money-provider";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useApi } from "@/hooks/use-api";
import { cn } from "@/lib/utils";
import type { AccountWithBalance } from "@/server/services/accounts";
import type { TransactionPage } from "@/server/services/transactions";

import { FilterChips } from "./filter-chips";
import { Pagination } from "./pagination";
import { TransactionCards } from "./transaction-cards";
import { TransactionDrawer } from "./transaction-drawer";
import { TransactionFilters } from "./transaction-filters";
import { TransactionTable } from "./transaction-table";
import { clearedQuery, hasActiveFilters, PAGE_SIZE, useTransactionsUrl } from "./use-transactions-url";

const count = new Intl.NumberFormat("en-US");

function ListSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading transactions" className="grid gap-px p-4">
      {Array.from({ length: 8 }, (_, index) => (
        <div key={index} className="flex items-center gap-4 py-2.5">
          <Skeleton className="hidden h-4 w-24 md:block" />
          <div className="grid flex-1 gap-1.5">
            <Skeleton className="h-4 w-2/5" />
            <Skeleton className="h-3 w-3/5" />
          </div>
          <Skeleton className="h-4 w-20" />
        </div>
      ))}
    </div>
  );
}

export function TransactionsSkeleton() {
  return (
    <div className="grid gap-5">
      <PageHeader title="Transactions" description="Activity across all accounts" />
      <Skeleton className="h-9 rounded-md" />
      <div className="rounded-xl border border-border bg-surface">
        <ListSkeleton />
      </div>
    </div>
  );
}

export function TransactionsView() {
  const url = useTransactionsUrl();
  const { query, page, txId, setQuery } = url;
  const list = useApi<TransactionPage>(url.apiPath, { keepPrevious: true });
  const accounts = useApi<AccountWithBalance[]>("/api/accounts");
  const resultsRef = useRef<HTMLHeadingElement>(null);

  const accountList = accounts.data;
  const accountName = useCallback(
    (id: string) => accountList?.find((account) => account.id === id)?.name ?? "Account",
    [accountList],
  );
  const accountOptions = (accountList ?? []).map((account) => ({ value: account.id, label: account.name }));
  const filtered = hasActiveFilters(query);
  const data = list.data;

  const changePage = (next: number) => {
    url.setPage(next);
    resultsRef.current?.focus({ preventScroll: true });
    resultsRef.current?.scrollIntoView({ block: "start" });
  };

  const sortBy = (field: SortField) => {
    const dir = query.sort.field === field && query.sort.dir === "desc" ? "asc" : "desc";
    setQuery({ ...query, sort: { field, dir } });
  };

  let content: React.ReactNode;
  if (!data && list.error) {
    content = <ErrorState title="Couldn't load transactions" message={list.error.message} onRetry={list.reload} />;
  } else if (!data) {
    content = <ListSkeleton />;
  } else if (data.total === 0) {
    content = filtered ? (
      <EmptyState
        title="No transactions match these filters"
        description="Try a different search, or widen the date range."
        action={
          <Button variant="outline" size="lg" onClick={() => setQuery(clearedQuery(query))}>
            Clear filters
          </Button>
        }
      />
    ) : (
      <EmptyState title="No transactions yet" description="Activity on your accounts will appear here." />
    );
  } else if (data.items.length === 0) {
    content = (
      <EmptyState
        title={`There is no page ${page}`}
        description={`These results fit on ${Math.ceil(data.total / PAGE_SIZE)} page(s).`}
        action={
          <Button variant="outline" size="lg" onClick={() => changePage(1)}>
            Go to first page
          </Button>
        }
      />
    );
  } else {
    const listProps = { items: data.items, accountName, txHref: url.txHref, activeTxId: txId };
    content = (
      <>
        <div className="hidden md:block">
          <TransactionTable {...listProps} query={query} onSort={sortBy} />
        </div>
        <div className="md:hidden">
          <TransactionCards {...listProps} groupByDate={query.sort.field === "date"} />
        </div>
        <div className="border-t border-border">
          <Pagination page={page} pageSize={PAGE_SIZE} total={data.total} onPageChange={changePage} />
        </div>
      </>
    );
  }

  const totals = data?.totals;
  const excluded = totals
    ? [
        totals.transferCount > 0 ? `${count.format(totals.transferCount)} internal transfer${totals.transferCount === 1 ? "" : "s"}` : null,
        totals.failedCount > 0 ? `${count.format(totals.failedCount)} failed` : null,
      ].filter(Boolean)
    : [];

  return (
    <div className="grid gap-5">
      <PageHeader title="Transactions" description="Activity across all accounts" actions={<MoveMoneyButton />} />

      <TransactionFilters
        query={query}
        accountOptions={accountOptions}
        resultCount={data?.total}
        onChange={setQuery}
      />
      <FilterChips query={query} accountName={accountName} onChange={setQuery} />

      <section aria-labelledby="results-title" className="grid gap-3">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
          <h2
            id="results-title"
            ref={resultsRef}
            tabIndex={-1}
            aria-live="polite"
            className="scroll-mt-20 text-[13px] font-medium text-foreground outline-none"
          >
            {data ? `${count.format(data.total)} ${data.total === 1 ? "transaction" : "transactions"}` : "Loading transactions"}
          </h2>
          {totals && data && data.total > 0 ? (
            <p className="text-[13px] text-muted-foreground">
              In <span className="num font-medium text-foreground">{formatMoney(totals.inCents, { signed: true })}</span>
              <span aria-hidden="true"> · </span>
              <span className="sr-only">, </span>
              Out{" "}
              <span className="num font-medium text-foreground">{formatMoney(-totals.outCents, { signed: true })}</span>
              {excluded.length > 0 ? <span className="block sm:inline"> · excludes {excluded.join(" and ")}</span> : null}
            </p>
          ) : null}
        </div>

        <div
          aria-busy={list.isLoading}
          className={cn(
            "rounded-xl border border-border bg-surface transition-opacity",
            list.isLoading && data && "opacity-60",
          )}
        >
          {content}
        </div>
      </section>

      <TransactionDrawer txId={txId} accountName={accountName} onClose={url.closeTx} onNoteSaved={list.reload} />
    </div>
  );
}
