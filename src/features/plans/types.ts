import type { PlanV3 } from "../../types/plan";

// --- Backend response types (camelCase, matching serialize_plan_*) ---

export interface PlanSummaryOut {
  id: string;
  title: string;
  source: "official" | "custom" | "ai";
  visibility: "public" | "private";
  status: "active" | "paused" | "completed";
  trainingType: string;
  durationWeeks: number | null;
  authorName: string | null;
  coverImageUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PlanDetailOut extends PlanSummaryOut {
  planJson: PlanV3;
}

export interface PlanProgressOut {
  id: string;
  planId: string;
  date: string;
  plannedSessionId: string;
  plannedSessionType: "climb" | "train";
  actualSessionId: string | null;
  status: "pending" | "completed" | "skipped" | "partial";
  notes: string | null;
}

// --- Request types ---

export interface PlanCreateIn {
  title: string;
  plan_json: Record<string, unknown>;
  source?: "official" | "custom" | "ai";
  visibility?: "public" | "private";
  training_type?: string;
  duration_weeks?: number;
  author_name?: string;
  cover_image_url?: string;
}
