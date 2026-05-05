// src/features/journal/sync/enqueueRouteSendLog.ts
// INDOOR_A: shared logic for outdoor + gym route detail "Send" → ClimbLog.
// B2: every catalog log now also drives session lifecycle:
//   - no active session  → auto-start an outdoor/gym session
//   - active and paused  → silent resume
//   - any case           → bump lastActivityAt (touchActivity)
// Sends propagate to the backend via the logs outbox; session lifecycle
// calls go directly to api.* through useLogsStore actions.

import type { LocalDayLogItem, LogMedia } from "../loglist/types";
import type { OutdoorSendDraft } from "../../outdoor/sendSheet/OutdoorSendSheet";
import { readDayList, writeDayList } from "../loglist/storage";
import { enqueueLogEvent, flushLogsOutbox } from "./logsOutbox";
import { readAllServerIds, setServerId } from "./serverIdMap";
import { useAuthStore } from "../../../store/useAuthStore";
import useLogsStore, { type LogType } from "../../../store/useLogsStore";

export type RouteKind = "outdoor" | "gym";

interface RouteSessionContext {
  /** Display name for the auto-started session (outdoor: wall/sector, gym: gym name). */
  sessionGymName?: string | null;
  /** outdoor → "outdoor"; gym → "gym". */
  sessionLocationType?: "outdoor" | "gym";
  /** Backend gym UUID (gym routes only). */
  sessionGymId?: string | null;
}

export interface RouteSendInput extends RouteSessionContext {
  routeKind: RouteKind;
  routeId: string;
  routeName: string;
  /** Backend `style` enum. outdoor: sport/trad/boulder/multi-pitch/DWS. gym: boulder/rope. */
  routeStyle: string;
  draft: OutdoorSendDraft;
  /** Optional log media — currently neither sheet collects it; reserved. */
  media?: LogMedia[];
}

export interface RouteAttemptInput extends RouteSessionContext {
  routeKind: RouteKind;
  routeId: string;
  routeName: string;
  routeStyle: string;
  /** Catalog grade as known to the route detail page; logged as-is. */
  routeGrade: string;
}

type WallType = "boulder" | "lead";

function mapStyleToWallType(kind: RouteKind, style: string): WallType {
  if (kind === "outdoor") {
    // DWS is bouldering-style (no rope). multi-pitch / sport / trad use rope → lead.
    if (style === "boulder" || style === "DWS") return "boulder";
    return "lead";
  }
  // gym: boulder | rope
  return style === "rope" ? "lead" : "boulder";
}

function newId(): string {
  // Same shape as logsOutbox.ts uid() — no extra dependency.
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

/**
 * B2: ensure an active session exists, resume if paused, and bump activity.
 * Idempotent — safe to call from every catalog log path. Returns the
 * (possibly newly-created) activeSession's startTime as the local sessionKey,
 * or null if startSession somehow failed.
 */
async function ensureActiveSessionForRoute(
  kind: RouteKind,
  wallType: WallType,
  ctx: RouteSessionContext,
): Promise<number | null> {
  const store = useLogsStore.getState();
  let active = store.activeSession;

  if (!active) {
    const fallbackName = kind === "outdoor" ? "Outdoor" : "Gym";
    const gymName = ctx.sessionGymName?.trim() || fallbackName;
    const locationType = ctx.sessionLocationType ?? (kind === "outdoor" ? "outdoor" : "gym");
    store.startSession(gymName, wallType as LogType, ctx.sessionGymId ?? null, locationType);
    active = useLogsStore.getState().activeSession;
  } else if (active.pausedAt) {
    await store.resumeSession();
    active = useLogsStore.getState().activeSession;
  }

  // Always bump — even when we just started, so lastActivityAt reflects the
  // log event that triggered the session creation.
  useLogsStore.getState().touchActivity();

  return active ? active.startTime : null;
}

export async function enqueueRouteSendLog(input: RouteSendInput): Promise<void> {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const wallType = mapStyleToWallType(input.routeKind, input.routeStyle);
  const itemId = newId();

  // B2: ensure active session before enqueueing the log so the outbox
  // can resolve session_id at flush time via _sessionKey lookup.
  const sessionStartTime = await ensureActiveSessionForRoute(input.routeKind, wallType, input);
  const sessionKey = sessionStartTime != null ? String(sessionStartTime) : null;

  // OutdoorSendDraft.style is always a send (redpoint/onsight/flash) — no
  // 'attempt' branch reaches here, so sendCount is always 1.
  const item: LocalDayLogItem = {
    id: itemId,
    date: today,
    type: wallType,
    grade: input.draft.suggested_grade,
    name: input.routeName,
    style: input.draft.style,
    feel: input.draft.feel,
    sendCount: 1,
    attemptsTotal: input.draft.attempts,
    note: input.draft.comment?.trim() || undefined,
    media: input.media,
    outdoor_route_id: input.routeKind === "outdoor" ? input.routeId : undefined,
    gym_route_id: input.routeKind === "gym" ? input.routeId : undefined,
    createdAt: Date.now(),
  };

  const existing = await readDayList(today, wallType);
  await writeDayList(today, wallType, [item, ...existing]);

  await enqueueLogEvent({
    type: "create",
    localId: itemId,
    payload: {
      client_id: itemId,
      session_id: null,
      _sessionKey: sessionKey,
      date: today,
      log_type: wallType,
      grade_text: input.draft.suggested_grade,
      route_name: input.routeName,
      style: input.draft.style,
      feel: input.draft.feel,
      attempts_total: input.draft.attempts,
      send_count: 1,
      note: input.draft.comment?.trim() || null,
      media: input.media || null,
      outdoor_route_id: input.routeKind === "outdoor" ? input.routeId : null,
      gym_route_id: input.routeKind === "gym" ? input.routeId : null,
    },
  });
}

/**
 * B2: catalog Attempt → ClimbLog with result="attempt". Backend already
 * accepts the "attempt" result type. Same auto-session semantics as
 * enqueueRouteSendLog. No grade picker (uses the route's catalog grade);
 * no feel; sendCount=0 + attemptsTotal=1 in the local list.
 */
export async function enqueueRouteAttemptLog(input: RouteAttemptInput): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);
  const wallType = mapStyleToWallType(input.routeKind, input.routeStyle);
  const itemId = newId();

  const sessionStartTime = await ensureActiveSessionForRoute(input.routeKind, wallType, input);
  const sessionKey = sessionStartTime != null ? String(sessionStartTime) : null;

  const item: LocalDayLogItem = {
    id: itemId,
    date: today,
    type: wallType,
    grade: input.routeGrade,
    name: input.routeName,
    // Local rendering treats "attempt" as the redpoint family minus sendCount;
    // LogItemCard already handles sendCount=0 → "attempted" badge variant.
    style: "redpoint",
    feel: "solid",
    sendCount: 0,
    attemptsTotal: 1,
    media: undefined,
    outdoor_route_id: input.routeKind === "outdoor" ? input.routeId : undefined,
    gym_route_id: input.routeKind === "gym" ? input.routeId : undefined,
    createdAt: Date.now(),
  };

  const existing = await readDayList(today, wallType);
  await writeDayList(today, wallType, [item, ...existing]);

  await enqueueLogEvent({
    type: "create",
    localId: itemId,
    payload: {
      client_id: itemId,
      session_id: null,
      _sessionKey: sessionKey,
      date: today,
      log_type: wallType,
      grade_text: input.routeGrade,
      route_name: input.routeName,
      style: "attempt",
      feel: null,
      attempts_total: 1,
      send_count: 0,
      note: null,
      media: null,
      outdoor_route_id: input.routeKind === "outdoor" ? input.routeId : null,
      gym_route_id: input.routeKind === "gym" ? input.routeId : null,
    },
  });
}

/**
 * Local-only logs outbox flush — no session work, no full sync, no cooldown.
 * Caller awaits this right after `enqueueRouteSendLog` so the user's send
 * appears on the route detail's Climbers list within the same interaction
 * instead of waiting for the next Journal-tab focus.
 *
 * Returns silently when offline / not signed in — the queued event will
 * flush at the next opportunity (Journal focus, sync, app reopen).
 */
export async function flushLogsOutboxNow(): Promise<void> {
  const token = useAuthStore.getState().accessToken;
  if (!token) return;
  try {
    const idMap = await readAllServerIds();
    await flushLogsOutbox({
      token,
      resolveServerId: (localId) => idMap[localId] ?? null,
      saveServerId: async (localId, serverId) => {
        await setServerId(localId, serverId);
        idMap[localId] = serverId;
      },
    });
  } catch (e) {
    if (__DEV__) console.warn("[flushLogsOutboxNow] failed:", e);
  }
}
