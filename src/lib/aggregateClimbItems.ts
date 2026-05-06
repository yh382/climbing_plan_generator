// src/lib/aggregateClimbItems.ts
// Per-route aggregation: groups LocalDayLogItem[] by routeKey so multiple
// attempts/sends on the same route collapse into one AggregatedClimbItem.
//
// Mirror of BE services/aggregate_climbs.py — the two algorithms must stay
// in sync. The pure-function shape lets useDailyData (self path) and the
// remote-fallback branch share a single implementation, and is also
// reusable by future ascent-list / route-detail surfaces.

import type {
  AggregatedClimbItem,
  AggregatedStyle,
  Feel,
  LocalDayLogItem,
  LogMedia,
  SendStyle,
} from "../features/journal/loglist/types";

/** Routes are keyed by catalog id when available, and by name+grade only as
 *  the fallback for free-form logs. Mirrors BE COALESCE order. */
export function routeKey(item: LocalDayLogItem): string {
  if (item.outdoor_route_id) return `o:${item.outdoor_route_id}`;
  if (item.gym_route_id) return `g:${item.gym_route_id}`;
  const name = (item.name || "").trim();
  const grade = (item.grade || "").trim();
  return `f:${name}|${grade}`;
}

const STYLE_RANK: Record<AggregatedStyle, number> = {
  attempt: 0,
  redpoint: 1,
  flash: 2,
  onsight: 3,
};

function isSendItem(item: LocalDayLogItem): boolean {
  return (item.sendCount ?? 0) > 0;
}

// NOTE on FE/BE parity:
//   Local rows carry `sendCount` as a counter — manual route-detail Repeat
//   bumps it in place. Backend ClimbLog has no per-row counter; each send
//   is its own row. So FE sums `sendCount` while BE counts rows. For all
//   normal (catalog Send) writes the two are identical because each tap
//   creates a fresh row with sendCount=1. See data-flows/08-daily-aggregate.

function itemAttempts(item: LocalDayLogItem): number {
  return item.attemptsTotal ?? item.attempts ?? 1;
}

/** Best style across the rows that contributed to a route. Once any send row
 *  exists the style is at least redpoint; an "attempt" sentinel is reserved
 *  for routes whose only rows are pure attempts. */
function pickStyle(rows: LocalDayLogItem[]): AggregatedStyle {
  let best: AggregatedStyle = "attempt";
  for (const r of rows) {
    if (!isSendItem(r)) continue;
    const cand = (r.style ?? "redpoint") as SendStyle;
    if (STYLE_RANK[cand] > STYLE_RANK[best]) best = cand;
  }
  return best;
}

/** Pick the row used for media/note/nav: latest send if any, else latest
 *  attempt. Stable when ties happen (lower id wins arbitrarily). */
function pickRepresentative(rows: LocalDayLogItem[]): LocalDayLogItem {
  const sends = rows.filter(isSendItem);
  const pool = sends.length > 0 ? sends : rows;
  return pool.reduce((a, b) => (a.createdAt >= b.createdAt ? a : b));
}

export function aggregateByRoute(
  items: LocalDayLogItem[],
): AggregatedClimbItem[] {
  if (items.length === 0) return [];

  const groups = new Map<string, LocalDayLogItem[]>();
  for (const it of items) {
    const k = routeKey(it);
    const arr = groups.get(k);
    if (arr) arr.push(it);
    else groups.set(k, [it]);
  }

  const out: AggregatedClimbItem[] = [];
  for (const [key, rows] of groups.entries()) {
    const rep = pickRepresentative(rows);
    const style = pickStyle(rows);
    const sendCount = rows.reduce((s, r) => s + (r.sendCount ?? 0), 0);
    const attemptsTotal = rows.reduce((s, r) => s + itemAttempts(r), 0);
    const note = (rep.note ?? "").trim() || undefined;
    const media: LogMedia[] | undefined =
      rep.media && rep.media.length > 0 ? rep.media : undefined;

    out.push({
      routeKey: key,
      name: rep.name,
      grade: rep.grade,
      type: rep.type,
      attemptsTotal,
      sendCount,
      style,
      feel: rep.feel as Feel,
      note,
      media,
      outdoor_route_id: rep.outdoor_route_id ?? null,
      gym_route_id: rep.gym_route_id ?? null,
      latestId: rep.id,
      rawIds: rows.map((r) => r.id),
      createdAt: rep.createdAt,
    });
  }

  // Stable order: most recent activity first, matching how raw rows render.
  out.sort((a, b) => b.createdAt - a.createdAt);
  return out;
}
