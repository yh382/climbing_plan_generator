import { create } from "zustand";
import { api } from "@/lib/apiClient";

export type ClimbItem = {
  id: string;
  date: string;
  location_type: "indoor" | "outdoor";
  discipline: "boulder" | "rope";
  grade_system: string;
  grade_value: string;
  grade_score: number;
  attempts: number;
  sends: number;
  gym_id?: string | null;
  area?: string | null;
  route_name?: string | null;
  tags?: string[];
  notes?: string | null;
};

type Filters = { type?: "boulder" | "rope" | "all"; scope?: "indoor" | "outdoor" | "all" };

type State = {
  items: ClimbItem[];
  nextCursor?: string | null;
  loading: boolean;
  filters: Filters;
  error?: string;
};
type Actions = {
  fetchList: (f?: Filters) => Promise<void>;
  loadMore: () => Promise<void>;
};

export const useClimbsStore = create<State & Actions>((set, get) => ({
  items: [],
  loading: false,
  filters: { type: "all", scope: "all" },
  async fetchList(f) {
    set({ loading: true, error: undefined });
    const filters = { ...get().filters, ...(f ?? {}) };
    const qs = new URLSearchParams({ limit: "20" });
    if (filters.type && filters.type !== "all") qs.append("type", filters.type);
    if (filters.scope && filters.scope !== "all") qs.append("scope", filters.scope);
    try {
      const data = await api.get<{ items: ClimbItem[]; next_cursor?: string | null }>(`/climbs?${qs.toString()}`);
      set({ items: data.items, nextCursor: data.next_cursor ?? null, filters, loading: false });
    } catch (e: any) {
      set({ error: e.message, loading: false });
    }
  },
  async loadMore() {
    const { nextCursor, filters, items } = get();
    if (!nextCursor) return;
    const qs = new URLSearchParams({ limit: "20", cursor: nextCursor });
    if (filters.type && filters.type !== "all") qs.append("type", filters.type);
    if (filters.scope && filters.scope !== "all") qs.append("scope", filters.scope);
    const data = await api.get<{ items: ClimbItem[]; next_cursor?: string | null }>(`/climbs?${qs.toString()}`);
    set({ items: [...items, ...data.items], nextCursor: data.next_cursor ?? null });
  },
}));
