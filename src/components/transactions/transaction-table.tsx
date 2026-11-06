"use client";

import { ArrowDown, ArrowLeftRight, ArrowUp, ArrowUpDown } from "lucide-react";
import Link from "next/link";

import { categoryLabel } from "@/domain/categories";
import type { SortField, TransactionQuery } from "@/domain/transaction-query";
import { isTransferLeg, type Transaction } from "@/domain/types";
import { SignedAmount } from "@/components/amount";
import { StatusBadge } from "@/components/status-badge";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

export type ListProps = {
  items: readonly Transaction[];
  accountName: (id: string) => string;
  txHref: (id: string) => string;
  activeTxId: string | null;
};

/** Category text, with transfers marked by icon and label (they're excluded from totals). */
export function CategoryLabel({ tx }: { tx: Transaction }) {
  if (!isTransferLeg(tx)) return <>{categoryLabel(tx.category)}</>;
  return (
    <span className="inline-flex items-center gap-1">
      <ArrowLeftRight aria-hidden="true" className="size-3.5 text-subtle-foreground" />
      Transfer
    </span>
  );
}

function SortHeader({
  field,
  label,
  query,
  onSort,
  className,
}: {
  field: SortField;
  label: string;
  query: TransactionQuery;
  onSort: (field: SortField) => void;
  className?: string;
}) {
  const active = query.sort.field === field;
  const Icon = !active ? ArrowUpDown : query.sort.dir === "asc" ? ArrowUp : ArrowDown;
  return (
    <th
      scope="col"
      aria-sort={active ? (query.sort.dir === "asc" ? "ascending" : "descending") : "none"}
      className={cn("sticky top-0 z-10 border-b border-border bg-surface px-2 py-0 font-medium", className)}
    >
      <button
        type="button"
        onClick={() => onSort(field)}
        className={cn(
          "inline-flex h-10 items-center gap-1 rounded-sm px-2 hover:text-foreground",
          active && "text-foreground",
        )}
      >
        {label}
        <Icon aria-hidden="true" className={cn("size-3.5", !active && "text-subtle-foreground")} />
      </button>
    </th>
  );
}

const headClass = "sticky top-0 z-10 border-b border-border bg-surface px-4 py-0 h-10 font-medium";

/** Desktop and tablet (≥768px). The counterparty link stretches over the whole row. */
export function TransactionTable({
  items,
  accountName,
  txHref,
  activeTxId,
  query,
  onSort,
}: ListProps & { query: TransactionQuery; onSort: (field: SortField) => void }) {
  return (
    <table className="w-full table-fixed border-separate border-spacing-0 text-left">
      <caption className="sr-only">Transactions. Select a counterparty to open its details.</caption>
      <thead className="text-xs text-muted-foreground">
        <tr>
          <SortHeader field="date" label="Date" query={query} onSort={onSort} className="w-32 rounded-tl-xl" />
          <th scope="col" className={cn(headClass, "w-auto")}>
            Counterparty
          </th>
          <th scope="col" className={cn(headClass, "hidden w-36 lg:table-cell")}>
            Account
          </th>
          <th scope="col" className={cn(headClass, "hidden w-52 xl:table-cell")}>
            Category
          </th>
          <th scope="col" className={cn(headClass, "w-36")}>
            Status
          </th>
          <SortHeader field="amount" label="Amount" query={query} onSort={onSort} className="w-40 rounded-tr-xl text-right" />
        </tr>
      </thead>
      <tbody>
        {items.map((tx) => (
          <tr
            key={tx.id}
            data-active={tx.id === activeTxId || undefined}
            className="relative transition-colors outline-ring hover:bg-surface-secondary has-[a:focus-visible]:outline-2 has-[a:focus-visible]:-outline-offset-2 data-active:bg-brand-soft/60 [&>td]:border-b [&>td]:border-border last:[&>td]:border-b-0"
          >
            <td className="num px-4 py-3 align-top whitespace-nowrap text-muted-foreground">{formatDate(tx.occurredAt)}</td>
            <td className="px-4 py-3 align-top">
              <Link
                href={txHref(tx.id)}
                replace
                scroll={false}
                data-tx-link={tx.id}
                className="block truncate font-medium text-foreground outline-none after:absolute after:inset-0"
              >
                {tx.counterparty}
              </Link>
              <p className="truncate text-xs text-muted-foreground">
                {tx.description}
                <span className="xl:hidden">
                  {" · "}
                  <CategoryLabel tx={tx} />
                </span>
              </p>
            </td>
            <td className="hidden truncate px-4 py-3 align-top text-muted-foreground lg:table-cell">
              {accountName(tx.accountId)}
            </td>
            <td className="hidden truncate px-4 py-3 align-top text-muted-foreground xl:table-cell">
              <CategoryLabel tx={tx} />
            </td>
            <td className="px-4 py-3 align-top">
              <StatusBadge status={tx.status} />
            </td>
            <td className="px-4 py-3 text-right align-top">
              <SignedAmount cents={tx.amountCents} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
