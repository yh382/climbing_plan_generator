// src/features/community/competitions/api.ts
import { api } from "../../../lib/apiClient";
import type { CompBrief, CompDetail, Standings } from "./types";

export const compApi = {
  /** Discovery — non-draft comps for a gym. */
  listForGym: (gymId: string) =>
    api.get<{ items: CompBrief[] }>(`/competitions?gym_id=${gymId}`),

  /** Discovery — all visible comps (global 活动 feed). */
  listAll: () => api.get<{ items: CompBrief[] }>(`/competitions`),

  /** Comp detail + problems + my enrollment + my scorecards. */
  getComp: (compId: string) => api.get<CompDetail>(`/competitions/${compId}`),

  /** Self-enroll into a division. */
  enroll: (compId: string, divisionId: string, waiverAccepted: boolean) =>
    api.post<{ ok: boolean; division_id: string }>(
      `/competitions/${compId}/enroll`,
      { division_id: divisionId, waiver_accepted: waiverAccepted },
    ),

  /** Self-score own scorecard for one problem (Top ⊇ Zone enforced server-side). */
  selfScore: (
    compId: string,
    body: { comp_problem_id: string; top: boolean; zone: boolean; attempts?: number; flashed?: boolean; client_id?: string },
  ) => api.put<{ ok: boolean; top: boolean; zone: boolean }>(`/competitions/${compId}/scorecards/me`, body),

  /** Cached live standings. */
  getStandings: (compId: string) =>
    api.get<Standings>(`/competitions/${compId}/standings`),
};
