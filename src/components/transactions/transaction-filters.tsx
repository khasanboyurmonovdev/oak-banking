"use client";

import { ChevronDown, Search, SlidersHorizontal } from "lucide-react";
import { useEffect, useId, useState } from "react";

import { RANGE_KEYS, RANGE_LABELS, type RangeKey } from "@/domain/analytics";
import { CATEGORIES, isCategoryId } from "@/domain/categories";
import type { DirectionFilter, SortDirection, SortField, TransactionQuery } from "@/domain/transaction-query";
import { TRANSACTION_STATUSES } from "@/domain/types";
import { SegmentedControl } from "@/components/segmented-control";
import { STATUS_LABELS } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export type Option = { value: string; label: string };

const SEARCH_DEBOUNCE_MS = 250;

const DIRECTION_OPTIONS: readonly { value: DirectionFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "in", label: "Money in" },
  { value: "out", label: "Money out" },
];

const SORT_OPTIONS: readonly { value: string; label: string; sort: { field: SortField; dir: SortDirection } }[] = [
  { value: "date-desc", label: "Newest first", sort: { field: "date", dir: "desc" } },
  { value: "date-asc", label: "Oldest first", sort: { field: "date", dir: "asc" } },
  { value: "amount-desc", label: "Largest amount", sort: { field: "amount", dir: "desc" } },
  { value: "amount-asc", label: "Smallest amount", sort: { field: "amount", dir: "asc" } },
];

const CATEGORY_OPTIONS: Option[] = CATEGORIES.map((category) => ({ value: category.id, label: category.label }));
const STATUS_OPTIONS: Option[] = TRANSACTION_STATUSES.map((status) => ({ value: status, label: STATUS_LABELS[status] }));

const selectClass =
  "h-9 w-full rounded-md border border-input bg-surface px-2.5 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

const normalizeSearch = (value: string) => value.trim().replace(/\s+/g, " ");

const toStatuses = (values: readonly string[]) => TRANSACTION_STATUSES.filter((status) => values.includes(status));

/** Debounced: the URL (and the fetch) update ~250 ms after typing stops. */
function SearchField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [draft, setDraft] = useState(value);
  const [synced, setSynced] = useState(value);
  // The URL changed from elsewhere (chip removed, Clear all): adopt it.
  if (value !== synced) {
    setSynced(value);
    if (normalizeSearch(draft) !== value) setDraft(value);
  }

  useEffect(() => {
    if (normalizeSearch(draft) === value) return;
    const timer = window.setTimeout(() => onChange(draft), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [draft, value, onChange]);

  return (
    <div className="relative min-w-0 flex-1">
      <label htmlFor="transaction-search" className="sr-only">
        Search transactions
      </label>
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-subtle-foreground"
      />
      <Input
        id="transaction-search"
        type="search"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        placeholder="Search counterparty, description or reference"
        autoComplete="off"
        maxLength={200}
        className="h-9 bg-surface pl-8"
      />
    </div>
  );
}

function CheckboxGroup({
  legend,
  options,
  selected,
  onChange,
  hideLegend = false,
}: {
  legend: string;
  options: readonly Option[];
  selected: readonly string[];
  onChange: (values: string[]) => void;
  hideLegend?: boolean;
}) {
  const id = useId();
  return (
    <fieldset>
      <legend className={cn("mb-2 text-[13px] font-medium text-foreground", hideLegend && "sr-only")}>{legend}</legend>
      <div className="grid gap-0.5">
        {options.map((option) => {
          const checked = selected.includes(option.value);
          const inputId = `${id}-${option.value}`;
          return (
            <div key={option.value} className="flex items-center gap-2.5 rounded-sm px-1 py-1.5 hover:bg-surface-secondary">
              <Checkbox
                id={inputId}
                checked={checked}
                onCheckedChange={(next) =>
                  onChange(
                    next === true
                      ? [...selected, option.value]
                      : selected.filter((value) => value !== option.value),
                  )
                }
              />
              <label htmlFor={inputId} className="flex-1 cursor-pointer text-sm text-foreground">
                {option.label}
              </label>
            </div>
          );
        })}
      </div>
    </fieldset>
  );
}

function MultiSelectPopover({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: readonly Option[];
  selected: readonly string[];
  onChange: (values: string[]) => void;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="lg" className={cn("bg-surface", selected.length > 0 && "border-brand/40")}>
          {label}
          {selected.length > 0 ? (
            <span className="num rounded-full bg-brand-soft px-1.5 text-xs text-brand-hover">
              {selected.length}
              <span className="sr-only"> selected</span>
            </span>
          ) : null}
          <ChevronDown aria-hidden="true" className="text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="max-h-80 w-64 overflow-y-auto">
        <CheckboxGroup legend={label} options={options} selected={selected} onChange={onChange} hideLegend />
      </PopoverContent>
    </Popover>
  );
}

type DateChoice = RangeKey | "" | "custom";

function DateFilter({ query, onChange }: { query: TransactionQuery; onChange: (query: TransactionQuery) => void }) {
  const id = useId();
  const [customOpen, setCustomOpen] = useState(false);
  const choice: DateChoice = query.range ?? (query.from || query.to || customOpen ? "custom" : "");

  const choose = (value: DateChoice) => {
    setCustomOpen(value === "custom");
    if (value === "custom") return;
    onChange({ ...query, range: value === "" ? undefined : value, from: undefined, to: undefined });
  };

  return (
    <div className="flex flex-wrap items-end gap-2">
      <div>
        <label htmlFor={`${id}-range`} className="sr-only">
          Date range
        </label>
        <select
          id={`${id}-range`}
          value={choice}
          onChange={(event) => {
            const value = event.target.value;
            choose(value === "custom" ? "custom" : (RANGE_KEYS.find((key) => key === value) ?? ""));
          }}
          className={cn(selectClass, "w-auto min-w-36")}
        >
          <option value="">Any date</option>
          {RANGE_KEYS.map((key) => (
            <option key={key} value={key}>
              Last {RANGE_LABELS[key]}
            </option>
          ))}
          <option value="custom">Custom dates…</option>
        </select>
      </div>
      {choice === "custom" ? (
        <>
          <div>
            <label htmlFor={`${id}-from`} className="mb-1 block text-xs text-muted-foreground">
              From
            </label>
            <input
              id={`${id}-from`}
              type="date"
              value={query.from ?? ""}
              max={query.to}
              onChange={(event) => onChange({ ...query, range: undefined, from: event.target.value || undefined })}
              className={cn(selectClass, "w-auto")}
            />
          </div>
          <div>
            <label htmlFor={`${id}-to`} className="mb-1 block text-xs text-muted-foreground">
              To
            </label>
            <input
              id={`${id}-to`}
              type="date"
              value={query.to ?? ""}
              min={query.from}
              onChange={(event) => onChange({ ...query, range: undefined, to: event.target.value || undefined })}
              className={cn(selectClass, "w-auto")}
            />
          </div>
        </>
      ) : null}
    </div>
  );
}

function SortSelect({ query, onChange }: { query: TransactionQuery; onChange: (query: TransactionQuery) => void }) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-[13px] font-medium text-foreground">
        Sort by
      </label>
      <select
        id={id}
        value={`${query.sort.field}-${query.sort.dir}`}
        onChange={(event) => {
          const option = SORT_OPTIONS.find((candidate) => candidate.value === event.target.value);
          if (option) onChange({ ...query, sort: option.sort });
        }}
        className={selectClass}
      >
        {SORT_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function activeFilterCount(query: TransactionQuery): number {
  return (
    (query.direction !== "all" ? 1 : 0) +
    (query.range || query.from || query.to ? 1 : 0) +
    query.accountIds.length +
    query.categories.length +
    query.statuses.length
  );
}

/**
 * Desktop/tablet: one toolbar row. Mobile: search plus a bottom sheet with
 * every filter and the sort. Both write straight to the URL.
 */
export function TransactionFilters({
  query,
  accountOptions,
  resultCount,
  onChange,
}: {
  query: TransactionQuery;
  accountOptions: readonly Option[];
  resultCount: number | undefined;
  onChange: (query: TransactionQuery) => void;
}) {
  const setSearch = (search: string) => onChange({ ...query, search });
  const filterCount = activeFilterCount(query);

  return (
    <div className="grid gap-3">
      <div className="flex gap-2">
        <SearchField value={query.search} onChange={setSearch} />
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="lg" className="bg-surface md:hidden">
              <SlidersHorizontal aria-hidden="true" />
              Filters
              {filterCount > 0 ? (
                <span className="num rounded-full bg-brand-soft px-1.5 text-xs text-brand-hover">
                  {filterCount}
                  <span className="sr-only"> active</span>
                </span>
              ) : null}
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="max-h-[85dvh] gap-0 rounded-t-2xl">
            <SheetHeader className="border-b border-border">
              <SheetTitle>Filters</SheetTitle>
              <SheetDescription>Results update as you choose.</SheetDescription>
            </SheetHeader>
            <div className="grid gap-6 overflow-y-auto p-4">
              <SegmentedControl
                label="Direction"
                options={DIRECTION_OPTIONS}
                value={query.direction}
                onChange={(direction) => onChange({ ...query, direction })}
              />
              <div>
                <p className="mb-2 text-[13px] font-medium text-foreground">Date</p>
                <DateFilter query={query} onChange={onChange} />
              </div>
              <SortSelect query={query} onChange={onChange} />
              <CheckboxGroup
                legend="Account"
                options={accountOptions}
                selected={query.accountIds}
                onChange={(accountIds) => onChange({ ...query, accountIds })}
              />
              <CheckboxGroup
                legend="Status"
                options={STATUS_OPTIONS}
                selected={query.statuses}
                onChange={(values) => onChange({ ...query, statuses: toStatuses(values) })}
              />
              <CheckboxGroup
                legend="Category"
                options={CATEGORY_OPTIONS}
                selected={query.categories}
                onChange={(values) => onChange({ ...query, categories: values.filter(isCategoryId) })}
              />
            </div>
            <SheetFooter className="border-t border-border pb-[calc(1rem+env(safe-area-inset-bottom))]">
              <SheetClose asChild>
                <Button size="lg" className="h-10">
                  {resultCount === undefined
                    ? "Show results"
                    : `Show ${resultCount} ${resultCount === 1 ? "result" : "results"}`}
                </Button>
              </SheetClose>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </div>

      <div className="hidden flex-wrap items-center gap-2 md:flex">
        <SegmentedControl
          label="Direction"
          options={DIRECTION_OPTIONS}
          value={query.direction}
          onChange={(direction) => onChange({ ...query, direction })}
          className="w-64"
        />
        <DateFilter query={query} onChange={onChange} />
        <MultiSelectPopover
          label="Account"
          options={accountOptions}
          selected={query.accountIds}
          onChange={(accountIds) => onChange({ ...query, accountIds })}
        />
        <MultiSelectPopover
          label="Category"
          options={CATEGORY_OPTIONS}
          selected={query.categories}
          onChange={(values) => onChange({ ...query, categories: values.filter(isCategoryId) })}
        />
        <MultiSelectPopover
          label="Status"
          options={STATUS_OPTIONS}
          selected={query.statuses}
          onChange={(values) => onChange({ ...query, statuses: toStatuses(values) })}
        />
      </div>
    </div>
  );
}
