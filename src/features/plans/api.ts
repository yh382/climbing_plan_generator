import { api } from "../../lib/apiClient";
import type { PlanSummaryOut, PlanDetailOut, PlanProgressOut, PlanCreateIn } from "./types";

export const plansApi = {
  /** Get the user's currently active plan */
  getActivePlan: () =>
    api.get<PlanDetailOut | null>("/plans/active"),

  /** List all plans owned by the current user */
  getMyPlans: () =>
    api.get<PlanSummaryOut[]>("/plans/me"),

  /** Get a single plan by ID */
  getPlan: (planId: string) =>
    api.get<PlanDetailOut>(`/plans/${planId}`),

  /** Create a new plan (auto-activates) */
  createPlan: (data: PlanCreateIn) =>
    api.post<PlanDetailOut>("/plans", data),

  /** Change plan status */
  updatePlanStatus: (planId: string, status: "active" | "paused" | "completed") =>
    api.patch(`/plans/${planId}/status`, { status }),

  /** List public plans (paginated) */
  getPublicPlans: (skip = 0, limit = 20) =>
    api.get<PlanSummaryOut[]>(`/plans/public?skip=${skip}&limit=${limit}`),

  /** Hard delete a plan */
  deletePlan: (planId: string) =>
    api.del(`/plans/${planId}`),

  /** Get progress entries for a plan */
  getPlanProgress: (planId: string, from?: string, to?: string) => {
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    const qs = params.toString();
    return api.get<PlanProgressOut[]>(`/plans/${planId}/progress${qs ? `?${qs}` : ""}`);
  },

  /** Update a single progress entry */
  updateProgress: (planId: string, progressId: string, data: { status: string; actual_session_id?: string; notes?: string }) =>
    api.patch<PlanProgressOut>(`/plans/${planId}/progress/${progressId}`, data),

  /** Clone a public plan into current user's plans */
  clonePlan: (planId: string) =>
    api.post(`/plans/${planId}/clone`),

  /** Mark a plan session as completed (creates PlanProgress + checks auto-archive) */
  completePlanSession: (planId: string, data: { planned_session_id: string; planned_session_type: string }) =>
    api.post<{ ok: boolean; planCompleted: boolean; progress: any }>(`/plans/${planId}/complete-session`, data),
};
