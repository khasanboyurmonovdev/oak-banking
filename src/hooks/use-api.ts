"use client";

import { createContext, createElement, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { ApiClientError, apiGet } from "@/lib/api-client";

type Result<T> = { key: string; data?: T; error?: ApiClientError };

export type ApiState<T> = {
  data: T | undefined;
  error: ApiClientError | undefined;
  /** True while the current path has not answered yet (stale data may still be shown). */
  isLoading: boolean;
  reload: () => void;
};

type Refresh = { version: number; refreshAll: () => void };

const RefreshContext = createContext<Refresh>({ version: 0, refreshAll: () => {} });

/**
 * Lets a mutation (a transfer, a demo reset) re-fetch every mounted `useApi`
 * query at once, so balances, charts and lists all reflect it.
 */
export function ApiRefreshProvider({ children }: { children: React.ReactNode }) {
  const [version, setVersion] = useState(0);
  const refreshAll = useCallback(() => setVersion((value) => value + 1), []);
  const value = useMemo(() => ({ version, refreshAll }), [version, refreshAll]);
  return createElement(RefreshContext, { value }, children);
}

export function useRefreshAll(): () => void {
  return useContext(RefreshContext).refreshAll;
}

/**
 * GETs `path` (null = skip) and re-fetches when it changes, on `reload()` and
 * on `refreshAll()`. Re-fetching the same path keeps its data visible. With
 * `keepPrevious`, the last successful data also stays visible while a
 * different path loads, so range or filter changes don't flash a skeleton.
 */
export function useApi<T>(path: string | null, { keepPrevious = false } = {}): ApiState<T> {
  const { version } = useContext(RefreshContext);
  const [nonce, setNonce] = useState(0);
  const [result, setResult] = useState<Result<T> | null>(null);
  const [previous, setPrevious] = useState<{ path: string; data: T } | undefined>(undefined);
  const key = path === null ? null : `${version}:${nonce}:${path}`;

  useEffect(() => {
    if (path === null || key === null) return;
    const controller = new AbortController();
    apiGet<T>(path, controller.signal).then(
      (data) => {
        setResult({ key, data });
        setPrevious({ path, data });
      },
      (error: unknown) => {
        if (controller.signal.aborted) return;
        setResult({
          key,
          error:
            error instanceof ApiClientError
              ? error
              : new ApiClientError(0, "unknown_error", "Something went wrong. Please try again."),
        });
      },
    );
    return () => controller.abort();
  }, [path, key]);

  const reload = useCallback(() => setNonce((value) => value + 1), []);
  const current = result?.key === key ? result : undefined;
  const fallback = previous && !current?.error && (keepPrevious || previous.path === path) ? previous.data : undefined;
  return {
    data: current?.data ?? fallback,
    error: current?.error,
    isLoading: key !== null && current === undefined,
    reload,
  };
}
