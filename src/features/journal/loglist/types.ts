export type SendStyle = "redpoint" | "onsight" | "flash";
export type Feel = "soft" | "solid" | "hard";

/** Style sentinel used by AggregatedClimbItem when a route has only attempts
 *  and no sends — UI renders an "Attempted" variant. Never appears on raw
 *  LocalDayLogItem (whose `style` is set even for attempt rows). */
export type AggregatedStyle = SendStyle | "attempt";

export type LogType = "boulder" | "toprope" | "lead";

export type LogMedia = {
  id: string;
  type: "image" | "video";
  uri: string;
  coverUri?: string; // video thumbnail（如果你以后生成了就填）
};

export type LocalDayLogItem = {
  id: string;
  date: string; // YYYY-MM-DD
  type: LogType;
  grade: string;
  name: string;

  style: SendStyle;
  feel: Feel;

  // ✅ new: per-item accumulation (NOT group)
  sendCount?: number;       // repeat 会 +1
  attemptsTotal?: number;   // repeat 会 +1

  // legacy fields (still supported)
  attempts?: number;        // old: single record attempts
  note?: string;

  // ✅ new: multi-media
  media?: LogMedia[];

  // legacy media fields (still supported)
  videoUri?: string;
  coverUri?: string;
  imageUri?: string;

  // INDOOR_A: catalog-route binding. Mutually exclusive — populated when the
  // log was created from outdoor/gym route detail Send. Drives Journal's
  // onPress routing back to the correct detail page.
  outdoor_route_id?: string | null;
  gym_route_id?: string | null;

  createdAt: number;
};

/** Per-route aggregation of `LocalDayLogItem[]` — multiple attempts and
 *  sends on the same route collapse into one row. Produced by
 *  `aggregateByRoute` and rendered by ClimbItemCard's aggregated path.
 *
 *  Both FE (`src/lib/aggregateClimbItems.ts`) and BE
 *  (`services/aggregate_climbs.py`) implement the same algorithm; this
 *  type matches the BE Pydantic schema `AggregatedClimbItem`. */
export type AggregatedClimbItem = {
  routeKey: string;
  name: string;
  grade: string;
  type: LogType;
  attemptsTotal: number;
  sendCount: number;
  /** "attempt" only when sendCount === 0; otherwise the best send style. */
  style: AggregatedStyle;
  feel: Feel;
  note?: string;
  media?: LogMedia[];
  outdoor_route_id?: string | null;
  gym_route_id?: string | null;
  /** Latest underlying log's id — used to navigate back to a single log. */
  latestId: string;
  /** All raw LocalDayLogItem ids that were folded into this row. */
  rawIds: string[];
  /** Latest underlying log's createdAt (ms). Used for ordering. */
  createdAt: number;
};
