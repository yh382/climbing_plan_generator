import { create } from "zustand";
import { api } from "@/lib/apiClient";

export type CareerSummary = {
  count_total: number;
  count_30d: number;
  best_grade_label?: string | null;
  time_series?: { date: string; attempts: number; sends: number; send_rate?: number }[];
  grade_histogram?: { grade_label: string; count: number; grade_score: number }[];
};

type Filters = {
  range?: "30d" | "year" | "all";
  type?: "boulder" | "rope" | "all";
  scope?: "indoor" | "outdoor" | "all";
};

type State = { summary?: CareerSummary; loading: boolean; filters: Filters; error?: string };
type Actions = { fetchSummary: (f?: Filters) => Promise<void> };

export const useCareerStore = create<State & Actions>((set) => ({
  loading: false,
  filters: { range: "30d", type: "all", scope: "all" },
  async fetchSummary(f) {
    set({ loading: true, error: undefined });
    const params = new URLSearchParams();
    const filters: Filters = { range: "30d", type: "all", scope: "all", ...(f ?? {}) };
    Object.entries(filters).forEach(([k, v]) => v && params.append(k, String(v)));
    try {
      const data = await api.get<CareerSummary>(`/career/summary?${params.toString()}`);
      set({ summary: data, loading: false, filters });
    } catch (e: any) {
      set({ error: e.message, loading: false });
    }
  },
}));
