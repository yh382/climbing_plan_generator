// src/lib/liveActivityBridge.ts
import { Platform } from "react-native";
import ClimmateLiveActivity from "../../modules/climmate-live-activity/src";

// Note: we intentionally do NOT track an in-memory "_hasActive" flag here.
// JS bundle reloads (dev FastRefresh, hot reload) would reset the flag and
// short-circuit subsequent end() calls, leaving orphan Live Activities on
// iOS. The native module already iterates `Activity<...>.activities` on every
// call, so calling update/end when nothing is running is a cheap no-op. Let
// ActivityKit be the single source of truth.

/** Start Live Activity when a climbing session begins. */
export function startLiveActivity(params: {
  gymName: string;
  discipline: string;
  startTime: number;
}) {
  if (Platform.OS !== "ios") return;
  if (!ClimmateLiveActivity) {
    if (__DEV__) console.warn("[liveActivity] native module not available");
    return;
  }
  if (__DEV__) console.log("[liveActivity] start()", params);

  ClimmateLiveActivity.start(params.gymName, params.discipline, params.startTime)
    .then((id) => {
      if (__DEV__) console.log("[liveActivity] start() ok id=", id);
    })
    .catch((e) => {
      if (__DEV__) console.warn("[liveActivity] start failed:", e);
    });
}

/** Update Live Activity whenever a log is recorded. */
export function updateLiveActivity(params: {
  routeCount: number;
  sendCount: number;
  bestGrade: string;
}) {
  if (Platform.OS !== "ios") return;
  if (!ClimmateLiveActivity) return;
  if (__DEV__) console.log("[liveActivity] update()", params);

  ClimmateLiveActivity.update(params.routeCount, params.sendCount, params.bestGrade).catch((e) => {
    if (__DEV__) console.warn("[liveActivity] update failed:", e);
  });
}

/** End Live Activity when the session ends. */
export function endLiveActivity(params: {
  routeCount: number;
  sendCount: number;
  bestGrade: string;
}) {
  if (Platform.OS !== "ios") return;
  if (!ClimmateLiveActivity) return;
  if (__DEV__) console.log("[liveActivity] end()", params);

  ClimmateLiveActivity.end(params.routeCount, params.sendCount, params.bestGrade).catch((e) => {
    if (__DEV__) console.warn("[liveActivity] end failed:", e);
  });
}

/**
 * Nuclear option: immediately dismiss every Live Activity of our type.
 * Used at app boot to clean up orphans left over from JS bundle reloads,
 * crashes, or force-quits where the JS-side end() call never fired.
 */
export function endAllLiveActivities(): Promise<void> {
  if (Platform.OS !== "ios") return Promise.resolve();
  if (!ClimmateLiveActivity?.endAll) return Promise.resolve();
  if (__DEV__) console.log("[liveActivity] endAll()");
  return ClimmateLiveActivity.endAll().catch((e) => {
    if (__DEV__) console.warn("[liveActivity] endAll failed:", e);
  });
}
