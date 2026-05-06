// src/features/dailysummary/foldActiveSession.ts
// B2-FU: shared helper for folding the active session's elapsed minutes
// into a date's aggregated KPI. Used by:
//   - useDailyData (daily-summary big ring)
//   - ExpandableCalendar (today's day-cell mini ring)
//
// Pure function: trivially testable, no async. Today's "now" is captured at
// call time via Date.now() so callers must include a tick dep to refresh.

export interface ActiveSessionLite {
  startTime: number;                // epoch ms
  pausedAt: number | null;          // null = running
  activeDurationMinutes: number;    // frozen value used while paused
}

/**
 * @param activeSession  Logs store's activeSession (or null when no session).
 * @param date           Date string ("YYYY-MM-DD") of the cell being rendered.
 * @param today          Today's date string in the user's local timezone.
 * @returns liveMin = minutes to add on top of completed-session totals;
 *          isToday  = whether the date matches today (caller may use to
 *          gate live overlays).
 */
export function foldActiveSessionMinutes(
  activeSession: ActiveSessionLite | null,
  date: string,
  today: string,
): { liveMin: number; isToday: boolean } {
  const isToday = date === today;
  if (!isToday || !activeSession) return { liveMin: 0, isToday };
  const liveMin = activeSession.pausedAt
    ? activeSession.activeDurationMinutes
    : Math.max(0, Math.floor((Date.now() - activeSession.startTime) / 60000));
  return { liveMin, isToday };
}
