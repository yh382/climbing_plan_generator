// src/features/plans/hooks.ts
import { useState, useEffect, useCallback, useRef } from "react";
import { plansApi } from "./api";
import type { PlanSummaryOut, PlanDetailOut, PlanProgressOut } from "./types";

/** My plans list */
export function useMyPlans() {
  const [plans, setPlans] = useState<PlanSummaryOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await plansApi.getMyPlans();
      setPlans(data);
    } catch {
      setError("Failed to load plans");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { plans, loading, error, refresh };
}

/** Public plans list with pagination */
export function usePublicPlans(limit = 20) {
  const [plans, setPlans] = useState<PlanSummaryOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const skipRef = useRef(0);
  const hasMoreRef = useRef(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    skipRef.current = 0;
    hasMoreRef.current = true;
    try {
      const data = await plansApi.getPublicPlans(0, limit);
      setPlans(data);
      skipRef.current = data.length;
      if (data.length < limit) hasMoreRef.current = false;
    } catch {
      setError("Failed to load plans");
    } finally {
      setLoading(false);
    }
  }, [limit]);

  const loadMore = useCallback(async () => {
    if (loading || !hasMoreRef.current) return;
    try {
      const data = await plansApi.getPublicPlans(skipRef.current, limit);
      if (data.length < limit) hasMoreRef.current = false;
      setPlans((prev) => [...prev, ...data]);
      skipRef.current += data.length;
    } catch {
      // silently fail on loadMore
    }
  }, [loading, limit]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { plans, loading, error, refresh, loadMore };
}

/** Single plan detail */
export function usePlanDetail(planId: string | null) {
  const [plan, setPlan] = useState<PlanDetailOut | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!planId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await plansApi.getPlan(planId);
      setPlan(data);
    } catch {
      setError("Failed to load plan");
    } finally {
      setLoading(false);
    }
  }, [planId]);

  useEffect(() => {
    if (planId) refresh();
    else setPlan(null);
  }, [planId, refresh]);

  return { plan, loading, error, refresh };
}

/** Active plan (user's currently active plan) */
export function useActivePlan() {
  const [plan, setPlan] = useState<PlanDetailOut | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await plansApi.getActivePlan();
      setPlan(data);
    } catch {
      setPlan(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { plan, loading, refresh };
}

/** Plan progress entries */
export function usePlanProgress(planId: string | null) {
  const [progress, setProgress] = useState<PlanProgressOut[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!planId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await plansApi.getPlanProgress(planId);
      setProgress(data);
    } catch {
      setError("Failed to load progress");
    } finally {
      setLoading(false);
    }
  }, [planId]);

  useEffect(() => {
    if (planId) refresh();
    else setProgress([]);
  }, [planId, refresh]);

  return { progress, loading, error, refresh };
}
