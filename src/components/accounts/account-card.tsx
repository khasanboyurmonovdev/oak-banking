"use client";

import { ArrowLeftRight, CircleCheck, CircleMinus, ReceiptText } from "lucide-react";
import Link from "next/link";

import { formatMoney } from "@/domain/money";
import { SignedAmount } from "@/components/amount";
import { EmptyState, ErrorState } from "@/components/data-state";
import { prefetchMoveMoney, useMoveMoney } from "@/components/move-money/move-money-provider";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useApi } from "@/hooks/use-api";
import { ACCOUNT_TYPE_LABELS, formatShortDate } from "@/lib/format";
import type { AccountWithBalance } from "@/server/services/accounts";
import type { TransactionPage } from "@/server/services/transactions";

const RECENT_COUNT = 5;

function RecentActivity({ account }: { account: AccountWithBalance }) {
  const recent = useApi<TransactionPage>(
    `/api/transactions?account=${encodeURIComponent(account.id)}&pageSize=${RECENT_COUNT}`,
  );

  if (recent.error && !recent.data) {
    return <ErrorState title="Couldn't load recent activity" message={recent.error.message} onRetry={recent.reload} />;
  }
  if (!recent.data) {
    return (
      <div aria-busy="true" aria-label="Loading recent activity" className="grid gap-3 px-5 py-4">
        {Array.from({ length: RECENT_COUNT }, (_, index) => (
          <Skeleton key={index} className="h-8" />
        ))}
      </div>
    );
  }
  if (recent.data.items.length === 0) {
    return <EmptyState title="No activity yet" description="Transactions on this account will appear here." />;
  }
  return (
    <ul className="divide-y divide-border">
      {recent.data.items.map((tx) => (
        <li key={tx.id}>
          <Link
            href={`/transactions?tx=${encodeURIComponent(tx.id)}`}
            className="flex items-center gap-3 px-5 py-2.5 transition-colors hover:bg-surface-secondary focus-visible:-outline-offset-2"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium text-foreground">{tx.counterparty}</p>
              <p className="num text-xs text-muted-foreground">{formatShortDate(tx.occurredAt)}</p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <SignedAmount cents={tx.amountCents} className="text-[13px]" />
              {tx.status !== "completed" ? <StatusBadge status={tx.status} /> : null}
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function BalanceRow({
  label,
  cents,
  strong = false,
  muted = false,
}: {
  label: string;
  cents: number;
  strong?: boolean;
  muted?: boolean;
}) {
  const tone = muted ? "text-muted-foreground" : "text-foreground";
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={strong ? `num font-semibold ${tone}` : `num ${tone}`}>{formatMoney(cents)}</dd>
    </div>
  );
}

/** One account: balances (Ledger − Holds = Available), actions and its latest transactions. */
export function AccountCard({ account }: { account: AccountWithBalance }) {
  const openMoveMoney = useMoveMoney();
  const active = account.status === "active";
  const StatusIcon = active ? CircleCheck : CircleMinus;
  const titleId = `account-${account.id}-title`;
  const { ledgerCents, holdsCents, availableCents, pendingInCents } = account.balance;

  return (
    <section aria-labelledby={titleId} className="flex min-w-0 flex-col rounded-xl border border-border bg-surface">
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 id={titleId} className="truncate text-base font-semibold text-foreground">
              {account.name}
            </h2>
            <p className="mt-0.5 text-[13px] text-muted-foreground">
              {ACCOUNT_TYPE_LABELS[account.kind]} ·{" "}
              <span className="font-mono">{account.maskedNumber}</span>
              <span className="sr-only"> (fictional account number)</span>
            </p>
          </div>
          <span
            className={
              active
                ? "inline-flex h-5 shrink-0 items-center gap-1 rounded-full bg-success-background px-2 text-xs font-medium text-success"
                : "inline-flex h-5 shrink-0 items-center gap-1 rounded-full bg-surface-secondary px-2 text-xs font-medium text-muted-foreground"
            }
          >
            <StatusIcon aria-hidden="true" className="size-3" />
            {active ? "Active" : "Inactive"}
          </span>
        </div>

        <p className="mt-5 text-[13px] text-muted-foreground">Available</p>
        <p className="num mt-0.5 text-[28px] leading-tight font-semibold tracking-tight text-foreground">
          {formatMoney(availableCents)}
        </p>

        <dl className="mt-3 border-t border-border pt-2 text-[13px]">
          <BalanceRow label="Ledger balance" cents={ledgerCents} />
          <BalanceRow label="Pending holds" cents={holdsCents > 0 ? -holdsCents : 0} />
          <BalanceRow label="Available" cents={availableCents} strong />
          {/* Always rendered so the buttons and Recent activity line up across cards. */}
          <BalanceRow label="Pending in (not yet available)" cents={pendingInCents} muted={pendingInCents === 0} />
        </dl>

        <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
          <Button
            variant="outline"
            size="lg"
            className="bg-surface"
            disabled={!active}
            onPointerEnter={prefetchMoveMoney}
            onFocus={prefetchMoveMoney}
            onClick={() => openMoveMoney({ fromAccountId: account.id })}
          >
            <ArrowLeftRight aria-hidden="true" />
            Move money from here
          </Button>
          <Button variant="outline" size="lg" className="bg-surface" asChild>
            <Link href={`/transactions?account=${encodeURIComponent(account.id)}`}>
              <ReceiptText aria-hidden="true" />
              View transactions
            </Link>
          </Button>
        </div>
      </div>

      <div className="mt-auto border-t border-border">
        <h3 className="px-5 pt-4 pb-2 text-[13px] font-medium text-foreground">Recent activity</h3>
        <RecentActivity account={account} />
      </div>
    </section>
  );
}
