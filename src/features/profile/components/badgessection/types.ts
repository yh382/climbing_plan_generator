// src/features/profile/components/badgessection/types.ts

export type BadgeStatus = "unlocked" | "locked";
export type BadgeSectionKey = "challenge" | "milestone" | "influence";

export type Badge = {
  id: string;
  title: string;
  section: BadgeSectionKey;

  status: BadgeStatus;

  // 0~1，用于未解锁进度条
  progress?: number;

  // 未来点进详情页用（先跑通 UI）
  requirement?: string;
};
