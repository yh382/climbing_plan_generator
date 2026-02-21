// src/features/coachChat/types.ts
export type CoachStep = 1 | 2 | 3 | 4 | 5;

export type ChatRole = "user" | "assistant";

export type ChatMessage = {
  id: string;
  role: ChatRole;
  text: string;
  ts: number;
};

export type DraftPlan = {
  title: string;
  subtitle: string;
  weekCount: number;
  sessionsPerWeek: number;
  bullets: string[];
};

export type CoachState = {
  step: CoachStep;
  messages: ChatMessage[];
  draftPlan: DraftPlan | null;
  isBusy: boolean;
};
