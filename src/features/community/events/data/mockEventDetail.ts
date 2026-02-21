// src/features/community/events/data/mockEventDetail.ts
import type { EventDetailModel } from "./types";

// 你可以把 coverImage 换成真实活动图
export const EVENT_DETAIL_MOCK: EventDetailModel = {
  id: "evt_001",
  title: "30-Day Consistency Meetup",
  organizerName: "ClimMate Community",
  coverImage: undefined,
  tags: ["indoor", "boulder"],

  startDateISO: "2025-12-31T00:00:00.000Z",
  endDateISO: "2026-01-30T00:00:00.000Z",

  // 单次活动示例：把 endDateISO 去掉，并填 startTimeISO/endTimeISO 即可
  startTimeISO: "2025-12-31T18:30:00.000Z",
  endTimeISO: "2025-12-31T20:00:00.000Z",

  locationName: "B-Pump Tokyo Akihabara",
  locationDetail: "2F, Check-in at front desk",

  // 可选：无奖励就不填，并且 display.showRewards = false
  rewardsLine: "Gold badge · 50 XP · Featured in Gallery",

  description:
    "Log at least one climbing session per day for 30 days. Consistency matters more than grade. Bring a friend, share beta, and stay stoked.",

  display: {
    showDate: true,
    showTime: true,
    showLocation: true,
    showRewards: true,
  },

  // ===== 动态卡片：活动方可随意配置 =====
  cards: [
    {
      id: "card_registrations",
      title: "Registrations",
      showRank: false,
      items: [
        { id: "u1", primary: "Ava", secondary: "@ava", trailing: "Joined" },
        { id: "u2", primary: "Kai", secondary: "@kai", trailing: "Joined" },
        { id: "u3", primary: "Mina", secondary: "@mina", trailing: "Waitlist" },
      ],
    },
    {
      id: "card_podium",
      title: "Podium (Final)",
      showRank: true,
      items: [
        { id: "p1", primary: "Ava", secondary: "980 pts" },
        { id: "p2", primary: "Noah", secondary: "920 pts" },
        { id: "p3", primary: "Lily", secondary: "900 pts" },
      ],
    },
    {
      id: "card_shoes",
      title: "Featured Shoes",
      showRank: false,
      items: [
        { id: "s1", primary: "La Sportiva · Solution Comp", secondary: "Try-on sizes 36–45" },
        { id: "s2", primary: "Scarpa · Drago", secondary: "Soft for indoor volumes" },
        { id: "s3", primary: "Five Ten · Hiangle", secondary: "Stiffer edging option" },
      ],
    },
  ],
};
