// src/features/community/competitions/hooks.ts
import { useCallback, useEffect, useState } from "react";
import { compApi } from "./api";
import type { CompDetail, Standings } from "./types";

export function useComp(compId: string | undefined) {
  const [comp, setComp] = useState<CompDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(() => {
    if (!compId) return Promise.resolve();
    return compApi
      .getComp(compId)
      .then((c) => setComp(c))
      .catch(() => setComp(null))
      .finally(() => setLoading(false));
  }, [compId]);

  useEffect(() => {
    let alive = true;
    if (!compId) return;
    setLoading(true);
    compApi
      .getComp(compId)
      .then((c) => alive && setComp(c))
      .catch(() => alive && setComp(null))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [compId]);

  return { comp, loading, refetch };
}

/** Live standings with optional polling while the comp window is open. */
export function useStandings(compId: string | undefined, pollMs?: number) {
  const [standings, setStandings] = useState<Standings | null>(null);

  const refetch = useCallback(() => {
    if (!compId) return Promise.resolve();
    return compApi
      .getStandings(compId)
      .then((s) => setStandings(s))
      .catch(() => {});
  }, [compId]);

  useEffect(() => {
    let alive = true;
    if (!compId) return;
    compApi.getStandings(compId).then((s) => alive && setStandings(s)).catch(() => {});
    if (!pollMs) return () => { alive = false; };
    const t = setInterval(() => {
      compApi.getStandings(compId).then((s) => alive && setStandings(s)).catch(() => {});
    }, pollMs);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [compId, pollMs]);

  return { standings, refetch };
}
