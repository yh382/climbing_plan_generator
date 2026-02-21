// src/features/community/challenges/mockChallenges.ts

export type ChallengeCategory = "boulder" | "toprope" | "indoor" | "outdoor";

export type ChallengeItem = {
  id: string;
  title: string;
  description: string;
  dateRange: string; // e.g. "Jan 01 – Jan 31"
  joined?: boolean;
  status?: "active" | "upcoming" | "past";
  participants?: number;
  image?: string; // optional, not required for UI now
  color?: string; // accent color for icon circle
  categories: ChallengeCategory[];
};

export const CHALLENGES_MOCK: ChallengeItem[] = [
  {
    id: "c1",
    title: "January Vertical Limit",
    description: "Climb 1,000m vertical this month.",
    dateRange: "Jan 01 – Jan 31",
    joined: true,
    status: "active",
    participants: 3420,
    color: "#059669",
    categories: ["indoor", "outdoor", "toprope"],
  },
  {
    id: "c2",
    title: "Power Boulder Week",
    description: "Send 10 boulders above your usual grade.",
    dateRange: "Jan 20 – Jan 27",
    joined: true,
    status: "active",
    participants: 980,
    color: "#111827",
    categories: ["boulder", "indoor"],
  },
  {
    id: "c3",
    title: "Weekend Outdoor Streak",
    description: "Climb outdoors two weekends in a row.",
    dateRange: "Feb 01 – Feb 28",
    joined: false,
    status: "upcoming",
    participants: 0,
    color: "#4F46E5",
    categories: ["outdoor"],
  },
  {
    id: "c4",
    title: "Top Rope Technique",
    description: "Log 6 top rope sessions and focus on footwork.",
    dateRange: "Jan 15 – Feb 15",
    joined: false,
    status: "active",
    participants: 1560,
    color: "#D97706",
    categories: ["toprope", "indoor"],
  },
  {
    id: "c5",
    title: "New Year Starter",
    description: "Log 20 sessions in January.",
    dateRange: "Jan 01 – Jan 31",
    joined: true,
    status: "past",
    participants: 5600,
    color: "#0EA5E9",
    categories: ["indoor"],
  },
];
