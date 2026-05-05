// src/features/journal/sync/inactivityCheck.ts
// B2: Foreground inactivity / midnight-rollover safety net for active sessions.
//
// RN can't run background timers reliably (battery rules), so the 60-min
// auto-pause and the cross-day auto-end both fire from the JS side only when
// the app comes to foreground. The backend's midnight cron catches the case
// where the user never reopens the app within 24h.
//
// Wire this up from:
//   - app/_layout.tsx AppState 'active' listener
//   - journal tab useFocusEffect (cheap; same store call)

import useLogsStore from "../../../store/useLogsStore";

const SIXTY_MINUTES_MS = 60 * 60 * 1000;

function isSameLocalDate(aMs: number, bMs: number): boolean {
  const a = new Date(aMs);
  const b = new Date(bMs);
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/**
 * Run the inactivity + midnight checks against the current active session.
 * Cross-day → endSession (preferred over pause; user clearly stopped).
 * 60min idle while active → pauseSession.
 * No-op when no active session, or when neither condition fires.
 */
export async function checkInactivityOnFocus(): Promise<void> {
  const state = useLogsStore.getState();
  const { activeSession, pauseSession, endSession } = state;
  if (!activeSession) return;

  const now = Date.now();

  // Midnight check — wins over pause: if the session crossed a calendar day
  // boundary, the user almost certainly isn't training anymore.
  if (!isSameLocalDate(activeSession.startTime, now)) {
    await endSession();
    return;
  }

  // Inactivity check — only meaningful while active (paused sessions stay
  // paused until the user logs again, which auto-resumes via enqueueRoute*).
  if (
    !activeSession.pausedAt &&
    now - activeSession.lastActivityAt > SIXTY_MINUTES_MS
  ) {
    await pauseSession();
  }
}
