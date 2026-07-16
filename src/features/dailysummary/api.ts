// src/features/dailysummary/api.ts
import { api } from "../../lib/apiClient";

/** GET /users/{userId}/daily/{date} — public daily summary (sessions + logs
 *  + per-day aggregates). Consumed by useDailyData and the media-select
 *  session picker. */
export function getUserDaily<T = unknown>(
  userId: string,
  date: string,
): Promise<T> {
  return api.get<T>(`/users/${userId}/daily/${date}`);
}
