// src/store/useAuthStore.ts
import { create } from "zustand";
import * as SecureStore from "expo-secure-store";
import { setApiAuthToken, api } from "src/lib/apiClient";

const ACCESS_TOKEN_KEY = "climmate_access_token";
const REFRESH_TOKEN_KEY = "climmate_refresh_token";

type AuthState = {
  isHydrating: boolean;
  accessToken: string | null;
  refreshToken: string | null;

  hydrate: () => Promise<void>;

  // ✅ 兼容你原来的 setToken(token)
  // ✅ 新增支持 setToken(access, refresh)
  setToken: (accessToken: string, refreshToken?: string | null) => Promise<void>;

  logout: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  bootstrap: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set) => ({
  isHydrating: true,
  accessToken: null,
  refreshToken: null,

  hydrate: async () => {
    try {
      const [access, refresh] = await Promise.all([
        SecureStore.getItemAsync(ACCESS_TOKEN_KEY),
        SecureStore.getItemAsync(REFRESH_TOKEN_KEY),
      ]);

      setApiAuthToken(access ?? null);
      set({
        accessToken: access ?? null,
        refreshToken: refresh ?? null,
        isHydrating: false,
      });
    } catch {
      setApiAuthToken(null);
      set({ accessToken: null, refreshToken: null, isHydrating: false });
    }
  },

  setToken: async (accessToken: string, refreshToken?: string | null) => {
    await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken);
    if (typeof refreshToken === "string") {
      await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
    }
    setApiAuthToken(accessToken);
    set({
      accessToken,
      refreshToken: typeof refreshToken === "string" ? refreshToken : null,
    });
  },

  logout: async () => {
    await Promise.all([
      SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
      SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
    ]);
    setApiAuthToken(null);
    set({ accessToken: null, refreshToken: null });
  },

  deleteAccount: async () => {
    await api.del("/users/me");
    await Promise.all([
      SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
      SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
    ]);
    setApiAuthToken(null);
    set({ accessToken: null, refreshToken: null });
  },

  bootstrap: async () => {
    const [access, refresh] = await Promise.all([
      SecureStore.getItemAsync(ACCESS_TOKEN_KEY),
      SecureStore.getItemAsync(REFRESH_TOKEN_KEY),
    ]);

    if (access) {
      setApiAuthToken(access);
      set({ accessToken: access, refreshToken: refresh ?? null });
    }
  },
}));
