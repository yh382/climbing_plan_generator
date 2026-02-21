import { create } from "zustand";
import { api } from "@/lib/apiClient";

export type ClimbItem = {
  id: string;
  date: string; // backend: date -> string like "2026-01-10"
  location_type: "indoor" | "outdoor";
  discipline: "boulder" | "rope";
  grade_system: string;
  grade_value: string;
  grade_score: number;
  attempts: number;
  sends: number;

  gym_id?: string | null;
  area_id?: string | null;
  route_id?: string | null;
  gym_name?: string | null;
  place_id?: string | null; // 如果你后端也返回的话（可选）

  // 兼容你旧 UI / 旧数据（即便后端不一定返回）
  area?: string | null;
  route_name?: string | null;

  tags?: string[];
  notes?: string | null;
};

// 兼容旧字段：type/scope；新增 acknowledging 后端字段：from_date/to_date
type Filters = {
  type?: "boulder" | "rope" | "all";
  scope?: "indoor" | "outdoor" | "all";
  from_date?: string; // "YYYY-MM-DD"
  to_date?: string; // "YYYY-MM-DD"
  limit?: number;
};

type State = {
  items: ClimbItem[];
  nextCursor?: string | null; // 兼容旧 cursor 逻辑：实际存 offset 的 string
  loading: boolean;
  filters: Filters;
  error?: string;
};

type Actions = {
  fetchList: (f?: Filters) => Promise<void>;
  loadMore: () => Promise<void>;
};

function buildQuery(filters: Filters, offset: number) {
  const limit = String(filters.limit ?? 50);
  const qs = new URLSearchParams({ limit, offset: String(offset) });

  // 新：日期范围（后端支持 from_date/to_date）
  if (filters.from_date) qs.append("from_date", filters.from_date);
  if (filters.to_date) qs.append("to_date", filters.to_date);

  // 旧：type/scope -> 映射到后端 discipline/location_type
  if (filters.type && filters.type !== "all") qs.append("discipline", filters.type);
  if (filters.scope && filters.scope !== "all") qs.append("location_type", filters.scope);

  return { qs, limit: Number(limit) };
}

export const useClimbsStore = create<State & Actions>((set, get) => ({
  items: [],
  nextCursor: null,
  loading: false,
  filters: { type: "all", scope: "all", limit: 50 },

  async fetchList(f) {
    set({ loading: true, error: undefined });

    const mergedFilters: Filters = { ...get().filters, ...(f ?? {}) };
    const { qs, limit } = buildQuery(mergedFilters, 0);

    try {
      // 后端 /climbs GET 返回的是 List[ClimbOut]（数组），不是 {items,next_cursor}
      const data = await api.get<ClimbItem[]>(`/climbs?${qs.toString()}`);

      // 用“是否满 limit”来判断还有没有更多；nextCursor 存 offset string
      const nextCursor = data.length >= limit ? String(limit) : null;

      set({
        items: data,
        nextCursor,
        filters: mergedFilters,
        loading: false,
      });
    } catch (e: any) {
      set({ error: e.message, loading: false });
    }
  },

  async loadMore() {
    const { nextCursor, filters, items } = get();
    if (!nextCursor) return;

    const offset = Number(nextCursor);
    if (!Number.isFinite(offset)) return;

    const { qs, limit } = buildQuery(filters, offset);

    const data = await api.get<ClimbItem[]>(`/climbs?${qs.toString()}`);

    const newOffset = offset + data.length;
    const newNextCursor = data.length >= limit ? String(newOffset) : null;

    set({
      items: [...items, ...data],
      nextCursor: newNextCursor,
    });
  },
}));
