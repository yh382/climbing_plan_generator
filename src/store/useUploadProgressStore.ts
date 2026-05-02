// src/store/useUploadProgressStore.ts
// Global upload-progress state. Single source of truth across all media-upload
// channels (community / journal / outdoor / indoor / profile). Most callers
// should go through src/lib/uploadActivityBridge.ts which also fans out to the
// Live Activity native module — that bridge is the only place that knows about
// surface-specific behaviors (Live Activity vs silent).

import { create } from "zustand";

export type UploadStatus = "compressing" | "uploading" | "success" | "error";

/** UI surface this upload should drive.
 *  - 'la'     → trigger Live Activity (long-running tasks: video / multi-image)
 *  - 'silent' → no UI; entry kept for error handling + observability
 */
export type UploadSurface = "la" | "silent";

export type UploadEntry = {
  id: string;
  label: string;
  surface: UploadSurface;
  progress: number; // 0..1
  status: UploadStatus;
  startedAt: number;
  errorMessage?: string;
};

type State = {
  uploads: UploadEntry[];
  startUpload: (params: { label: string; surface: UploadSurface }) => string;
  updateProgress: (id: string, progress: number, status?: UploadStatus) => void;
  finishUpload: (
    id: string,
    status: "success" | "error",
    errorMessage?: string,
  ) => void;
  removeUpload: (id: string) => void;
};

function genId(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

const AUTO_REMOVE_MS = 1500;

export const useUploadProgressStore = create<State>((set, get) => ({
  uploads: [],

  startUpload: ({ label, surface }) => {
    const id = genId();
    set((s) => ({
      uploads: [
        ...s.uploads,
        {
          id,
          label,
          surface,
          progress: 0,
          status: "uploading",
          startedAt: Date.now(),
        },
      ],
    }));
    return id;
  },

  updateProgress: (id, progress, status) => {
    set((s) => ({
      uploads: s.uploads.map((u) =>
        u.id === id
          ? { ...u, progress, ...(status ? { status } : {}) }
          : u,
      ),
    }));
  },

  finishUpload: (id, status, errorMessage) => {
    set((s) => ({
      uploads: s.uploads.map((u) =>
        u.id === id
          ? {
              ...u,
              status,
              progress: status === "success" ? 1 : u.progress,
              errorMessage,
            }
          : u,
      ),
    }));
    setTimeout(() => get().removeUpload(id), AUTO_REMOVE_MS);
  },

  removeUpload: (id) => {
    set((s) => ({ uploads: s.uploads.filter((u) => u.id !== id) }));
  },
}));
