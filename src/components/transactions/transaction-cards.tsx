"use client";

import Link from "next/link";

import type { Transaction } from "@/domain/types";
import { SignedAmount } from "@/components/amount";
import { StatusBadge } from "@/components/status-badge";
import { formatDate, formatLongDate } from "@/lib/format";

import { CategoryLabel, type ListProps } from "./transaction-table";

function Card({ tx, accountName, txHref, activeTxId, showDate }: Omit<ListProps, "items"> & { tx: Transaction; showDate: boolean }) {
  return (
    <li>
      <Link
        href={txHref(tx.id)}
        replace
        scroll={false}
        data-tx-link={tx.id}
        data-active={tx.id === activeTxId || undefined}
        className="block px-4 py-3 transition-colors hover:bg-surface-secondary focus-visible:-outline-offset-2 data-active:bg-brand-soft/60"
      >
        <div className="flex items-baseline justify-between gap-3">
          <p className="min-w-0 truncate font-medium text-foreground">{tx.counterparty}</p>
          <SignedAmount cents={tx.amountCents} className="shrink-0" />
        </div>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {tx.description} · <CategoryLabel tx={tx} />
        </p>
        <div className="mt-1.5 flex items-center justify-between gap-3 text-xs text-muted-foreground">
          <span className="min-w-0 truncate">
            {accountName(tx.accountId)}
            {showDate ? ` · ${formatDate(tx.occurredAt)}` : null}
          </span>
          <StatusBadge status={tx.status} />
        </div>
      </Link>
    </li>
  );
}

/**
 * Mobile (<768px). Grouped under date headings when sorted by date; a flat
 * list with dates on each card when sorted by amount (grouping would break
 * the amount order).
 */
export function TransactionCards({ items, groupByDate, ...rest }: ListProps & { groupByDate: boolean }) {
  if (!groupByDate) {
    return (
      <ul className="divide-y divide-border">
        {items.map((tx) => (
          <Card key={tx.id} tx={tx} showDate {...rest} />
        ))}
      </ul>
    );
  }

  const groups: { day: string; items: Transaction[] }[] = [];
  for (const tx of items) {
    const day = tx.occurredAt.slice(0, 10);
    const last = groups[groups.length - 1];
    if (last?.day === day) last.items.push(tx);
    else groups.push({ day, items: [tx] });
  }

  return (
    <div>
      {groups.map((group) => (
        <section key={group.day} aria-labelledby={`day-${group.day}`}>
          <h3
            id={`day-${group.day}`}
            className="border-b border-border bg-surface-secondary px-4 py-1.5 text-xs font-medium text-muted-foreground"
          >
            {formatLongDate(`${group.day}T00:00:00.000Z`)}
          </h3>
          <ul className="divide-y divide-border">
            {group.items.map((tx) => (
              <Card key={tx.id} tx={tx} showDate={false} {...rest} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
