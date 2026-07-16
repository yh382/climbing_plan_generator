// src/services/badgeAward.ts
// Cross-store composition point for the badge award notification path:
// stores must not import each other, so response → unlock-toast wiring lives
// here (called by useCommunityStore.createPost, the logs outbox flush, and
// plan-builder).
import { useBadgeUnlockStore } from "../store/useBadgeUnlockStore";
import { invalidateBadgeCache } from "../features/community/hooks";

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
