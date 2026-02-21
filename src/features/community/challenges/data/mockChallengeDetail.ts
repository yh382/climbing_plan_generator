export type ChallengeCategory = "boulder" | "toprope" | "indoor" | "outdoor";

export type ChallengeDetail = {
  id: string;
  title: string;
  description: string;

  // ✅ 用于展示（可选）
  dateRange?: string;

  // ✅ 用于真实 days-left 计算（关键）
  startDateISO?: string; // "2026-02-01"
  endDateISO?: string;   // "2026-02-28"

  joined: boolean;
  status: "active" | "upcoming" | "past";
  participants: number;

  color: string;
  categories: ChallengeCategory[];

  coverUri?: string;
  thumbnailUri?: string;
  organizerName?: string;
  prizes?: string[];
};

export type RankingUser = {
  userId: string;
  name: string;
  points: number;
  gender: "male" | "female" | "other";
  isFollowing: boolean;
};

export type GalleryItem = {
  id: string;
  uri: string;
  type: "image" | "video";
};

export const MOCK_CHALLENGES_DETAIL: ChallengeDetail[] = [
  {
    id: "mock-1",
    title: "30-Day Consistency Challenge",
    description:
      "Log at least one climbing session per day for 30 days. Consistency matters more than grade.\n\nRules:\n• Any climbing session counts\n• Streaks earn bonus points\n• Upload proof to Gallery if needed",
    dateRange: "2026/01/01 - 2026/01/31",
    startDateISO: "2026-01-01",
    endDateISO: "2026-01-31",
    joined: false,
    status: "active",
    participants: 328,
    color: "#1F2937",
    categories: ["indoor", "boulder"],
    organizerName: "ClimMate Community",
    prizes: ["Gold badge", "50 XP", "Featured in Gallery"],
  },
  {
    id: "mock-2",
    title: "Outdoor Weekend Warrior",
    description:
      "Complete 4 outdoor sessions during the challenge period.\n\nTips:\n• Plan ahead\n• Invite friends\n• Track sessions in Journal",
    dateRange: "2026/02/01 - 2026/02/28",
    startDateISO: "2026-02-01",
    endDateISO: "2026-02-28",
    joined: true,
    status: "upcoming",
    participants: 142,
    color: "#0F766E",
    categories: ["outdoor", "toprope"],
    organizerName: "ClimMate Community",
    prizes: ["Silver badge", "25 XP"],
  },
];

export const MOCK_LEADERBOARD: RankingUser[] = [
  { userId: "u1", name: "Ava", points: 980, gender: "female", isFollowing: true },
  { userId: "u2", name: "Noah", points: 910, gender: "male", isFollowing: false },
  { userId: "u3", name: "Mia", points: 860, gender: "female", isFollowing: true },
  { userId: "u4", name: "Leo", points: 830, gender: "male", isFollowing: true },
  { userId: "u5", name: "Kai", points: 790, gender: "other", isFollowing: false },
];

export const MOCK_GALLERY: GalleryItem[] = Array.from({ length: 18 }).map((_, i) => ({
  id: `g${i}`,
  uri: `https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=600&q=60&sig=${i}`,
  type: i % 4 === 0 ? "video" : "image",
}));
