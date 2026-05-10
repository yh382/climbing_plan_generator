// src/features/home/hooks/useCoachDailyPrompt.ts
// Window BC γ3 — fetch the daily Coach prompt for the home card.
//
// No FE-side AsyncStorage cache: the BE already caches by (user_id, UTC
// date) in `coach_daily_prompts` (UNIQUE constraint), so an in-memory
// `useState` is enough to avoid refetching on every render. We key the
// effect on today's YYYY-MM-DD so the prompt re-fetches across midnight
// without an explicit invalidator.

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/apiClient";

export interface CoachDailyPromptPayload {
  prompt: string | null;
  today_plan_summary: string | null;
  generated_at: string | null;
}

interface State {
  data: CoachDailyPromptPayload | null;
  loading: boolean;
  error: string | null;
}

function todayKey(): string {
  // YYYY-MM-DD in UTC — matches BE `datetime.now(timezone.utc).date()`.
  const now = new Date();
  return now.toISOString().slice(0, 10);
}

export function useCoachDailyPrompt(): State {
  const [state, setState] = useState<State>({
    data: null,
    loading: true,
    error: null,
  });

  const dayKey = useMemo(() => todayKey(), []);

  useEffect(() => {
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: null }));
    (async () => {
      try {
        const data = await api.get<CoachDailyPromptPayload>(
          "/coach/daily-prompt",
        );
        if (!cancelled) {
          setState({ data, loading: false, error: null });
        }
      } catch (e: any) {
        if (__DEV__) console.warn("[useCoachDailyPrompt] fetch failed:", e?.message);
        if (!cancelled) {
          setState({
            data: null,
            loading: false,
            error: e?.message ?? "Failed to load",
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // Re-runs across UTC midnight automatically via dayKey memo.
  }, [dayKey]);

  return state;
}
