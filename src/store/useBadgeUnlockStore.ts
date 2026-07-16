import { create } from "zustand";

export type AwardedBadge = {
  code: string;
  name: string;
  description?: string | null;
  tier?: string | null;
  icon_url?: string | null;
};

interface BadgeUnlockState {
  pending: AwardedBadge[];
  show: (badges: AwardedBadge[]) => void;
  dismiss: () => void;
}

export const useBadgeUnlockStore = create<BadgeUnlockState>((set) => ({
  pending: [],
  show: (badges) =>
    set((state) => ({
      pending: [...state.pending, ...badges],
    })),
  dismiss: () => set({ pending: [] }),
}));

// handleAwardedBadges (response → toast + cache invalidation) lives in
// src/services/badgeAward.ts — it composes this store with the community
// badge cache, and stores must not import each other.
