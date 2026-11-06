"use client";

import { XIcon } from "lucide-react";

import { RANGE_LABELS } from "@/domain/analytics";
import { categoryLabel } from "@/domain/categories";
import type { TransactionQuery } from "@/domain/transaction-query";
import { STATUS_LABELS } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format";

import { clearedQuery } from "./use-transactions-url";

type Chip = { key: string; label: string; next: TransactionQuery };

const isoDay = (day: string) => formatDate(`${day}T00:00:00.000Z`);

function chipsFor(query: TransactionQuery, accountName: (id: string) => string): Chip[] {
  const chips: Chip[] = [];
  if (query.search) chips.push({ key: "q", label: `“${query.search}”`, next: { ...query, search: "" } });
  if (query.direction !== "all") {
    chips.push({
      key: "direction",
      label: query.direction === "in" ? "Money in" : "Money out",
      next: { ...query, direction: "all" },
    });
  }
  if (query.range) {
    chips.push({ key: "range", label: `Last ${RANGE_LABELS[query.range]}`, next: { ...query, range: undefined } });
  }
  if (query.from || query.to) {
    const label =
      query.from && query.to
        ? `${isoDay(query.from)} – ${isoDay(query.to)}`
        : query.from
          ? `From ${isoDay(query.from)}`
          : `Until ${isoDay(query.to ?? "")}`;
    chips.push({ key: "dates", label, next: { ...query, from: undefined, to: undefined } });
  }
  for (const id of query.accountIds) {
    chips.push({
      key: `account:${id}`,
      label: accountName(id),
      next: { ...query, accountIds: query.accountIds.filter((value) => value !== id) },
    });
  }
  for (const category of query.categories) {
    chips.push({
      key: `category:${category}`,
      label: categoryLabel(category),
      next: { ...query, categories: query.categories.filter((value) => value !== category) },
    });
  }
  for (const status of query.statuses) {
    chips.push({
      key: `status:${status}`,
      label: STATUS_LABELS[status],
      next: { ...query, statuses: query.statuses.filter((value) => value !== status) },
    });
  }
  return chips;
}

export function FilterChips({
  query,
  accountName,
  onChange,
}: {
  query: TransactionQuery;
  accountName: (id: string) => string;
  onChange: (query: TransactionQuery) => void;
}) {
  const chips = chipsFor(query, accountName);
  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Active filters">
      {chips.map((chip) => (
        <button
          key={chip.key}
          type="button"
          onClick={() => onChange(chip.next)}
          className="inline-flex h-7 max-w-full items-center gap-1.5 rounded-full border border-border bg-surface pr-2 pl-3 text-[13px] text-foreground transition-colors hover:border-border-strong hover:bg-surface-secondary"
        >
          <span className="truncate">{chip.label}</span>
          <XIcon aria-hidden="true" className="size-3.5 shrink-0 text-muted-foreground" />
          <span className="sr-only">, remove filter</span>
        </button>
      ))}
      <Button variant="ghost" size="sm" onClick={() => onChange(clearedQuery(query))} className="text-brand">
        Clear all
      </Button>
    </div>
  );
}
