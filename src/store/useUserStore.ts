// src/store/useUserStore.ts
import { create } from "zustand";
import { api } from "@/lib/apiClient";

export type UserLite = {
  id: string;
  username: string;
  email?: string;
  email_verified: boolean;
  avatar_url?: string | null;
  bio?: string | null;   
  units?: "metric" | "imperial";
  locale?: string;
};

function normalizeUser(raw: any): UserLite {
  const u = raw?.user ?? raw ?? {};
  // 兼容多位置的 bio（任一存在即可）
  const profileLike = raw?.profile ?? raw?.profiles ?? {};
  const bio =
    u.bio ??                     // users 表直接有 bio
    raw?.bio ??                  // 顶层
    profileLike?.bio ??          // /profiles/me 顶层 bio
    profileLike?.preferences?.bio ?? null; // 偏好里有 bio

  return {
    id: u.id ?? u.user_id ?? u.uid ?? "",
    username: u.username ?? u.name ?? u.handle ?? "User",
    email: u.email ?? undefined,
    email_verified: u.email_verified ?? u.is_email_verified ?? false,
    avatar_url: u.avatar_url ?? u.avatar ?? null,
    bio,                         // ← 写入
    units: u.units ?? u.pref_units ?? "metric",
    locale: u.locale ?? u.lang ?? undefined,
  };
}

type State = {
  user?: UserLite;
  loading: boolean;
  error?: string;
};

type Actions = {
  fetchMe: () => Promise<void>;
  updateMe: (patch: Partial<UserLite>) => Promise<void>;
};

export const useUserStore = create<State & Actions>((set, get) => ({
  loading: false,
  async fetchMe() {
    set({ loading: true, error: undefined });
    try {
      const raw = await api.get<any>("/users/me");
      const user = normalizeUser(raw);
      // 可在真机调试时看一下实际拿到的字段
      if (__DEV__) console.log("[/users/me]", { raw, user });
      set({ user, loading: false });
    } catch (e: any) {
      if (__DEV__) console.warn("fetchMe error:", e?.message);
      set({ error: e.message, loading: false });
    }
  },
  async updateMe(patch) {
    const prev = get().user;
    if (prev) set({ user: { ...prev, ...patch } }); // 乐观
    const raw = await api.put<any>("/users/me", patch);
    const user = normalizeUser(raw);
    set({ user });
  },
}));
