// src/lib/liveActivityThrottle.ts
// B2-FU: trailing-edge debounce wrapper around updateLiveActivity for
// catalog-log-driven stats pushes. User tapping Send/Attempt 5x in 500ms
// produces a single LA update with the latest aggregated stats.
//
// `paused:true` calls skip the throttle and flush any pending trailing
// payload immediately so pause UX feels instant. (Resume is just another
// stats push with paused:false — covered by the trailing branch.)

import { updateLiveActivity } from "./liveActivityBridge";

const TRAILING_DELAY_MS = 500;

interface LAStats {
  routeCount: number;
  sendCount: number;
  bestGrade: string;
  attempts: number;
  paused?: boolean;
}

let pending: LAStats | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;

function flushNow() {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  if (pending) {
    const next = pending;
    pending = null;
    updateLiveActivity(next);
  }
}

/**
 * Trailing-edge debounced LA stats push. Calls coalesce within
 * TRAILING_DELAY_MS; the latest stats win and fire once after the window.
 *
 * If `paused` is set, bypass the debounce and push immediately (also
 * flushing any pending trailing call) — pause UX must feel instant.
 */
export function pushLiveActivityStatsThrottled(stats: LAStats) {
  if (stats.paused) {
    pending = stats;
    flushNow();
    return;
  }
  pending = stats;
  if (timer) return;
  timer = setTimeout(() => {
    timer = null;
    if (pending) {
      const next = pending;
      pending = null;
      updateLiveActivity(next);
    }
  }, TRAILING_DELAY_MS);
}

/** Test/reset hook — drops any pending trailing call without firing. */
export function __resetLiveActivityThrottle() {
  if (timer) clearTimeout(timer);
  timer = null;
  pending = null;
}
