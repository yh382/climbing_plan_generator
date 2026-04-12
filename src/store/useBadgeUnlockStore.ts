import { create } from "zustand";
import { invalidateBadgeCache } from "../features/community/hooks";

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
  if (__DEV__) {
    console.log(
      "[badges] handleAwardedBadges:",
      "awarded_badges field:",
      badges === undefined ? "MISSING" : `array(${badges?.length ?? "??"})`,
      badges?.length > 0 ? badges.map((b: any) => b.name) : "",
    );
  }
  if (Array.isArray(badges) && badges.length > 0) {
    useBadgeUnlockStore.getState().show(badges);
    // Invalidate badge progress cache so the badges page shows
    // the new badge immediately when the user navigates to it.
    invalidateBadgeCache();
  }
}
