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

/**
 * Extract awarded_badges from an API response and trigger toast if any.
 * Safe to call on any response — no-ops if field is missing or empty.
 */
export function handleAwardedBadges(response: any) {
  const badges = response?.awarded_badges;
  if (Array.isArray(badges) && badges.length > 0) {
    useBadgeUnlockStore.getState().show(badges);
  }
}
