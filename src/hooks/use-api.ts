"use client";

import { useCallback, useEffect, useState } from "react";

import { ApiClientError, apiGet } from "@/lib/api-client";

type Result<T> = { key: string; data?: T; error?: ApiClientError };

export type ApiState<T> = {
  data: T | undefined;
  error: ApiClientError | undefined;
  /** True while the current path has not answered yet (stale data may still be shown). */
  isLoading: boolean;
  reload: () => void;
};

/**
 * GETs `path` (null = skip) and re-fetches when it changes. With
 * `keepPrevious`, the last successful data stays visible while the next
 * path loads, so range or filter changes don't flash a skeleton.
 */
export function useApi<T>(path: string | null, { keepPrevious = false } = {}): ApiState<T> {
  const [nonce, setNonce] = useState(0);
  const [result, setResult] = useState<Result<T> | null>(null);
  const [previous, setPrevious] = useState<T | undefined>(undefined);
  const key = path === null ? null : `${nonce}:${path}`;

  useEffect(() => {
    if (path === null || key === null) return;
    const controller = new AbortController();
    apiGet<T>(path, controller.signal).then(
      (data) => {
        setResult({ key, data });
        setPrevious(data);
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
  return {
    data: current?.data ?? (keepPrevious && !current?.error ? previous : undefined),
    error: current?.error,
    isLoading: key !== null && current === undefined,
    reload,
  };
}
