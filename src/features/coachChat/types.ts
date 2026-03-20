// src/features/coachChat/types.ts
export type CoachPhase = "collect" | "draft" | "complete" | "match" | "schedule";

export type CoachMode = "none" | "plan" | "actions" | "analysis";

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

export type SessionExercise = {
  name: { zh: string; en: string };
  blockType: string;
};

export type SessionDetail = {
  type: "climb" | "train";
  exercises: SessionExercise[];
};

export type WeekFocus = {
  week: number;
  focus: { zh: string; en: string };
};

export type PlanSummary = {
  planId: string;
  title: string;
  weeks: number;
  sessionsPerWeek: number;
  climbSessions: number;
  trainSessions: number;
  totalExercises: number;
  sessions?: SessionDetail[];
  weekFocuses?: WeekFocus[];
};

export type ActionRecommendation = {
  actionId: string;
  name: { zh: string; en: string };
  blockType: string;
  level: string;
  durationMin: number | null;
  equipment: string[];
  reason: string;
};

export type RecommendedActions = {
  focus: string;
  actions: ActionRecommendation[];
};

export type CoachConversation = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  phase: CoachPhase;
  mode: CoachMode;
  messages: ChatMessage[];
  draftPlan: DraftPlan | null;
};

export type CoachState = {
  phase: CoachPhase;
  mode: CoachMode;
  messages: ChatMessage[];
  draftPlan: DraftPlan | null;
  generatedPlanId: string | null;
  planSummary: PlanSummary | null;
  recommendedActions: RecommendedActions | null;
  taskBarVisible: boolean;
  isBusy: boolean;
  streamingMsgId: string | null;
  conversations: CoachConversation[];
  currentConversationId: string | null;
  overlayOpen: boolean;
};
