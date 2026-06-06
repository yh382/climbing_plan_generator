// src/features/workouts/sessionBootstrap.ts
//
// TR5 + TR4-FU.
//
// When the user starts a template-driven training session, FE needs a
// corresponding ClimbSession on BE so finalize_session can derive
// session_type from `template_id` (TR0/TR4 wiring). The legacy outbox in
// features/journal/sync/sessionsOutbox.ts handles climb-log sessions
// (auto-created on first send/attempt). Training sessions don't go
// through that path because they don't log climbs — so we POST /sessions
// directly here.
//
// Design choices:
//   - Fire-and-forget: never block the FE UX on the network. The active
//     workout store keeps running locally regardless.
//   - Optimistic: caller receives a Promise<string | null>; null means
//     "BE didn't accept this session, FE flow continues without a
//     template_id linkage on the eventual finalize". Acceptable in the
//     no-users phase per ROADMAP §2 决策 — TR7 BodyAreaBalance falls
//     back to its placeholder when template_id isn't there.
//   - No outbox queue. If we're offline at start, we just lose the
//     linkage for that session. Future hardening: piggyback on the
//     existing sessions outbox.

import { api } from "@/lib/apiClient";

interface SessionCreateRes {
  id: string;
}

/**
 * POST /sessions to create a training-flagged ClimbSession.
 * Returns the BE session id on success, null on any error.
 */
export async function bootstrapTemplateSession(
  templateId: string,
): Promise<string | null> {
  try {
    const res = await api.post<SessionCreateRes>("/sessions", {
      // TR0: template_id surfaces in SessionCreateIn; finalize_session
      // reads it to derive session_type='train' or 'mixed'.
      template_id: templateId,
      // No location_type / gym_id — pure template execution can happen
      // anywhere. BE schema defaults location_type='gym' which is fine
      // as a placeholder.
    });
    return res?.id ?? null;
  } catch (e) {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.warn("[sessionBootstrap] POST /sessions failed", e);
    }
    return null;
  }
}

/**
 * POST /sessions/{id}/end so BE runs finalize_session (derives
 * session_type, writes summary). Idempotent on BE — safe to retry.
 */
export async function endTemplateSession(sessionId: string): Promise<void> {
  try {
    await api.post(`/sessions/${sessionId}/end`, {});
  } catch (e) {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.warn("[sessionBootstrap] POST /sessions/{id}/end failed", e);
    }
  }
}
