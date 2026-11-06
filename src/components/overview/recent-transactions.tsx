import Link from "next/link";

import { categoryLabel } from "@/domain/categories";
import type { Transaction } from "@/domain/types";
import { SignedAmount } from "@/components/amount";
import { EmptyState } from "@/components/data-state";
import { StatusBadge } from "@/components/status-badge";
import { formatDate } from "@/lib/format";

/** The latest transactions; each row opens its detail drawer on the Transactions page. */
export function RecentTransactions({ transactions }: { transactions: readonly Transaction[] }) {
  return (
    <section aria-labelledby="recent-title" className="rounded-xl border border-border bg-surface">
      <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-3 md:px-6">
        <div>
          <h2 id="recent-title" className="text-base font-semibold text-foreground">
            Recent transactions
          </h2>
          <p className="mt-0.5 text-[13px] text-muted-foreground">All accounts, newest first</p>
        </div>
        <Link
          href="/transactions"
          className="rounded-sm text-[13px] font-medium text-brand underline-offset-4 hover:underline"
        >
          View all<span className="sr-only"> transactions</span>
        </Link>
      </div>

      {transactions.length === 0 ? (
        <EmptyState title="No transactions yet" className="border-t border-border" />
      ) : (
        <ul className="divide-y divide-border border-t border-border">
          {transactions.map((tx) => (
            <li key={tx.id}>
              <Link
                href={`/transactions?tx=${tx.id}`}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 px-5 py-3 transition-colors hover:bg-surface-secondary focus-visible:-outline-offset-2 md:grid-cols-[minmax(0,1fr)_6.5rem_7rem_auto] md:px-6"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-foreground">{tx.counterparty}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {tx.description} · {categoryLabel(tx.category)}
                    <span className="md:hidden"> · {formatDate(tx.occurredAt)}</span>
                  </p>
                </div>
                <span className="num hidden text-[13px] text-muted-foreground md:block">{formatDate(tx.occurredAt)}</span>
                <span className="hidden md:block">
                  <StatusBadge status={tx.status} />
                </span>
                <div className="flex flex-col items-end gap-1">
                  <SignedAmount cents={tx.amountCents} />
                  {tx.status !== "completed" ? <StatusBadge status={tx.status} className="md:hidden" /> : null}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
