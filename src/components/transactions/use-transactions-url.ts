"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";

import {
  DEFAULT_TRANSACTION_QUERY,
  parseTransactionQuery,
  toSearchParams,
  type TransactionQuery,
} from "@/domain/transaction-query";

export const PAGE_SIZE = 25;

/** The query with only its sort kept: what "Clear all" leaves behind. */
export function clearedQuery(query: TransactionQuery): TransactionQuery {
  return { ...DEFAULT_TRANSACTION_QUERY, sort: query.sort };
}

export function hasActiveFilters(query: TransactionQuery): boolean {
  return toSearchParams(clearedQuery(query)).toString() !== toSearchParams(query).toString();
}

/**
 * All Transactions view state lives in the URL: the filters (domain format,
 * see parseTransactionQuery), `page` and the open transaction `tx`. Every
 * change replaces the history entry (filters also reset to page 1), so Back
 * leaves the page instead of stepping through each keystroke or drawer.
 */
export function useTransactionsUrl() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const query = useMemo(() => parseTransactionQuery(new URLSearchParams(searchParams)), [searchParams]);
  const rawPage = Number(searchParams.get("page"));
  const page = Number.isSafeInteger(rawPage) && rawPage >= 1 ? rawPage : 1;
  const txId = searchParams.get("tx") || null;

  const href = (next: TransactionQuery, nextPage: number, nextTx: string | null) => {
    const params = toSearchParams(next);
    if (nextPage > 1) params.set("page", String(nextPage));
    if (nextTx) params.set("tx", nextTx);
    const search = params.toString();
    return search ? `${pathname}?${search}` : pathname;
  };

  const apiParams = toSearchParams(query);
  apiParams.set("page", String(page));
  apiParams.set("pageSize", String(PAGE_SIZE));

  return {
    query,
    page,
    txId,
    apiPath: `/api/transactions?${apiParams.toString()}`,
    setQuery: (next: TransactionQuery) => router.replace(href(next, 1, txId), { scroll: false }),
    setPage: (next: number) => router.replace(href(query, next, txId), { scroll: false }),
    txHref: (id: string) => href(query, page, id),
    closeTx: () => router.replace(href(query, page, null), { scroll: false }),
  };
}
