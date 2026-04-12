// src/features/profile/components/badgessection/types.ts

export type BadgeStatus = "unlocked" | "locked";
export type BadgeSectionKey =
  | "challenge"
  | "milestone"
  | "influence"
  | "monthly"
  | "skill"
  | "lifetime"
  | "special";

export type BadgeTier = "bronze" | "silver" | "gold" | "diamond" | null;

export type Badge = {
  id: string;
  title: string;
  section: BadgeSectionKey;
  tier?: BadgeTier;

  status: BadgeStatus;

  // 0~1，用于未解锁进度条
  progress?: number;

  // Human-readable unlock requirement (e.g., "Send a V9 boulder")
  description?: string | null;

  // Raw metric values for progress display (e.g., 3 / 10)
  currentValue?: number;
  threshold?: number;

  // Custom badge icon URL from backend
  iconUrl?: string | null;

  // When the badge was awarded
  awardedAt?: string | null;

  // Source tracking (e.g., which challenge awarded this badge)
  sourceType?: string | null;
  sourceId?: string | null;

  // Rarity: percentage of users who earned this badge (0-100)
  rarity?: number;
};
