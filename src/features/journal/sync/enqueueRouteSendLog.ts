// src/features/journal/sync/enqueueRouteSendLog.ts
// INDOOR_A: shared logic for outdoor + gym route detail "Send" → ClimbLog.
// Writes a LocalDayLogItem to the day list (detail-page Send doesn't bind to
// an active session) and enqueues an outbox `create` event so the backend
// receives outdoor_route_id / gym_route_id once online.

import type { LocalDayLogItem, LogMedia } from "../loglist/types";
import type { OutdoorSendDraft } from "../../outdoor/sendSheet/OutdoorSendSheet";
import { readDayList, writeDayList } from "../loglist/storage";
import { enqueueLogEvent } from "./logsOutbox";

export type RouteKind = "outdoor" | "gym";

export interface RouteSendInput {
  routeKind: RouteKind;
  routeId: string;
  routeName: string;
  /** Backend `style` enum. outdoor: sport/trad/boulder/multi-pitch/DWS. gym: boulder/rope. */
  routeStyle: string;
  draft: OutdoorSendDraft;
  /** Optional log media — currently neither sheet collects it; reserved. */
  media?: LogMedia[];
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

export async function enqueueRouteSendLog(input: RouteSendInput): Promise<void> {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const wallType = mapStyleToWallType(input.routeKind, input.routeStyle);
  const itemId = newId();

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
