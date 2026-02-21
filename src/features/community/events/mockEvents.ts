// src/features/community/events/mockEvents.ts

export type EventType =
  | "competition"
  | "meetup"
  | "training"
  | "route_setting"
  | "youth"
  | "community";

export type EventVenue = "indoor" | "outdoor";

// ✅ NEW
export type EventDiscipline = "boulder" | "toprope" | "mixed";

export type GymInfo = {
  id: string;
  name: string;
  city: string;
  verified?: boolean;
  distanceMiles?: number;
  followed?: boolean;
  accent?: string;
};

export type EventItem = {
  id: string;
  title: string;
  dateText: string; // "Jan 25 • 6:30 PM"
  type: EventType;
  venue: EventVenue;

  // ✅ NEW: boulder/toprope
  discipline: EventDiscipline;

  gym: GymInfo;

  joined?: boolean;
};

export const EVENTS_MOCK: EventItem[] = [
  {
    id: "e1",
    title: "Winter Boulder League Finals",
    dateText: "Jan 25 • 6:30 PM",
    type: "competition",
    venue: "indoor",
    discipline: "boulder",
    gym: {
      id: "g1",
      name: "Metro Boulder Park",
      city: "Denver",
      verified: true,
      distanceMiles: 2.3,
      followed: true,
      accent: "#111827",
    },
    joined: true,
  },
  {
    id: "e2",
    title: "Community Meetup Night",
    dateText: "Jan 27 • 7:00 PM",
    type: "meetup",
    venue: "indoor",
    discipline: "mixed",
    gym: {
      id: "g2",
      name: "Summit Climb Center",
      city: "Boulder",
      verified: true,
      distanceMiles: 8.7,
      followed: true,
      accent: "#0EA5E9",
    },
    joined: true,
  },
  {
    id: "e3",
    title: "Technique Clinic: Footwork",
    dateText: "Feb 02 • 10:00 AM",
    type: "training",
    venue: "indoor",
    discipline: "toprope",
    gym: {
      id: "g3",
      name: "Granite Lab",
      city: "Aurora",
      verified: false,
      distanceMiles: 5.1,
      followed: false,
      accent: "#059669",
    },
  },
  {
    id: "e4",
    title: "Outdoor Crag Cleanup",
    dateText: "Feb 08 • 9:00 AM",
    type: "community",
    venue: "outdoor",
    discipline: "mixed",
    gym: {
      id: "g1",
      name: "Metro Boulder Park",
      city: "Denver",
      verified: true,
      distanceMiles: 2.3,
      followed: true,
      accent: "#111827",
    },
  },
  {
    id: "e5",
    title: "Routesetting Preview",
    dateText: "Jan 30 • 5:30 PM",
    type: "route_setting",
    venue: "indoor",
    discipline: "mixed",
    gym: {
      id: "g2",
      name: "Summit Climb Center",
      city: "Boulder",
      verified: true,
      distanceMiles: 8.7,
      followed: true,
      accent: "#0EA5E9",
    },
  },
  {
    id: "e6",
    title: "Youth Comp Practice",
    dateText: "Feb 03 • 4:00 PM",
    type: "youth",
    venue: "indoor",
    discipline: "boulder",
    gym: {
      id: "g4",
      name: "Peak Kids Gym",
      city: "Littleton",
      verified: true,
      distanceMiles: 12.2,
      followed: false,
      accent: "#D97706",
    },
  },
];
