"use client";

import { useCallback, useEffect, useState } from "react";
import type { DashboardPR, PRsResponse } from "./types";

export interface UsePRsState {
  prs: DashboardPR[] | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function usePRs(endpoint: string = "/api/livedev/prs"): UsePRsState {
  const [prs, setPRs] = useState<DashboardPR[] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState<number>(0);

  const refresh = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    const ctrl = new AbortController();
    setLoading(true);
    setError(null);

    fetch(endpoint, { credentials: "same-origin", signal: ctrl.signal })
      .then(async (res) => {
        const text = await res.text();
        if (!res.ok) {
          let msg = `HTTP ${res.status}`;
          try {
            const j = JSON.parse(text);
            if (typeof j?.error === "string") msg = j.error;
          } catch {}
          throw new Error(msg);
        }
        const parsed = JSON.parse(text) as PRsResponse;
        if (!parsed || !Array.isArray(parsed.prs)) {
          throw new Error("invalid_response");
        }
        setPRs(parsed.prs);
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => setLoading(false));

    return () => ctrl.abort();
  }, [endpoint, nonce]);

  return { prs, loading, error, refresh };
}
