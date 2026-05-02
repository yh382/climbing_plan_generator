// src/lib/uploadActivityBridge.ts
// Single entry point for all media-upload progress reporting.
//
// All upload pipelines (community / journal / outdoor / indoor / profile) call
// startUpload → updateUpload → finishUpload. The bridge:
//   1. mirrors state to useUploadProgressStore (for in-app observability)
//   2. fans out to the Live Activity native module when surface === 'la'
//   3. throttles native update calls to respect ActivityKit budgets
//
// Surface 'silent' = store entry only (no LA, no UI). Used for short uploads
// where flashing a progress chip would be jankier than no feedback at all
// (avatar, cover). Failed silent uploads still appear in the store, so the
// caller can surface an Alert based on the entry's `status === 'error'`.

import ClimmateUploadActivity from "../../modules/climmate-upload-activity/src";
import {
  useUploadProgressStore,
  type UploadStatus,
  type UploadSurface,
} from "../store/useUploadProgressStore";

type LastUpdate = { progress: number; ts: number };
const lastUpdateById = new Map<string, LastUpdate>();

const PROGRESS_DELTA = 0.05; // 5%
const TIME_DELTA_MS = 500;

/**
 * Begin tracking an upload. Returns the upload id used by subsequent calls.
 *
 * For surface 'la', also requests a Dynamic Island Live Activity. Note that
 * MVP only supports one concurrent LA — starting a second LA will end the
 * first. The store still tracks all in-flight uploads in parallel.
 */
export function startUpload(
  label: string,
  surface: UploadSurface = "la",
): string {
  const id = useUploadProgressStore.getState().startUpload({ label, surface });
  if (surface === "la" && ClimmateUploadActivity) {
    ClimmateUploadActivity.start(label).catch((e) => {
      if (__DEV__) console.warn("[uploadActivityBridge] LA.start failed:", e);
    });
  }
  return id;
}

/**
 * Report progress for an in-flight upload. Native LA updates are throttled to
 * 5% / 500ms to stay within ActivityKit's per-hour budget.
 */
export function updateUpload(
  id: string,
  progress: number,
  status?: UploadStatus,
): void {
  const clamped = Math.max(0, Math.min(1, progress));
  useUploadProgressStore.getState().updateProgress(id, clamped, status);

  const entry = useUploadProgressStore
    .getState()
    .uploads.find((u) => u.id === id);
  if (!entry || entry.surface !== "la" || !ClimmateUploadActivity) return;

  const last = lastUpdateById.get(id) ?? { progress: -1, ts: 0 };
  const dProgress = Math.abs(clamped - last.progress);
  const dTime = Date.now() - last.ts;
  if (dProgress < PROGRESS_DELTA && dTime < TIME_DELTA_MS) return;

  lastUpdateById.set(id, { progress: clamped, ts: Date.now() });
  ClimmateUploadActivity.update(clamped, status ?? entry.status).catch((e) => {
    if (__DEV__) console.warn("[uploadActivityBridge] LA.update failed:", e);
  });
}

/**
 * Mark an upload as succeeded or failed. Triggers the LA's terminal state +
 * 1.5s auto-dismiss, and schedules the store entry's auto-removal.
 */
export function finishUpload(
  id: string,
  status: "success" | "error",
  errorMessage?: string,
): void {
  useUploadProgressStore.getState().finishUpload(id, status, errorMessage);

  const entry = useUploadProgressStore
    .getState()
    .uploads.find((u) => u.id === id);
  if (entry?.surface === "la" && ClimmateUploadActivity) {
    ClimmateUploadActivity.end(status).catch((e) => {
      if (__DEV__) console.warn("[uploadActivityBridge] LA.end failed:", e);
    });
  }
  lastUpdateById.delete(id);
}
