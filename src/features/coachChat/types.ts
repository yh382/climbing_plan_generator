// src/features/coachChat/types.ts
export type CoachPhase = "collect" | "draft" | "match" | "schedule";

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

export type CoachConversation = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  phase: CoachPhase;
  messages: ChatMessage[];
  draftPlan: DraftPlan | null;
};

export type CoachState = {
  phase: CoachPhase;
  messages: ChatMessage[];
  draftPlan: DraftPlan | null;
  isBusy: boolean;
  conversations: CoachConversation[];
  currentConversationId: string | null;
  overlayOpen: boolean;
};
