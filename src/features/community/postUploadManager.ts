// Background post upload manager.
// Fires the upload + create-post flow after the user leaves the arrange/create screen,
// exposing status so CommunityScreen can show a small progress banner.

import { useSyncExternalStore } from "react";
import { uploadPostMedia } from "./api";
import { api } from "../../lib/apiClient";
import { useCommunityStore } from "../../store/useCommunityStore";
import type { PostDraft } from "./pendingPostDraft";
import type { PickedMediaItem, UserPostCreateIn } from "./types";

// ── State ──

export type UploadStatus = "idle" | "uploading" | "success" | "error";

export type UploadState = {
  status: UploadStatus;
  uploaded: number; // media items uploaded so far
  total: number; // total media items to upload
  error?: string;
};

let _state: UploadState = { status: "idle", uploaded: 0, total: 0 };
const _listeners = new Set<() => void>();

function setState(patch: Partial<UploadState>) {
  _state = { ..._state, ...patch };
  _listeners.forEach((fn) => fn());
}

function getSnapshot(): UploadState {
  return _state;
}

function subscribe(cb: () => void) {
  _listeners.add(cb);
  return () => {
    _listeners.delete(cb);
  };
}

export function usePostUploadState(): UploadState {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

// ── Metrics builder (extracted from create.tsx) ──

function buildMetricsFromWidget(
  widget: { type: string; title: string; subtitle: string } | null,
) {
  if (!widget) return undefined;
  if (widget.type === "plan") {
    const parts = widget.subtitle.split(" · ");
    return [
      { label: "Weeks", value: parts[0]?.replace(" weeks", "") || "—" },
      {
        label: "Sessions/wk",
        value: parts[1]?.replace(" sessions/wk", "") || "—",
      },
      { label: "Type", value: parts[2] || "—" },
    ];
  }
  const parts = widget.subtitle.split(" · ");
  return [
    { label: "Gym", value: widget.title.split(" · ")[0] || "—" },
    { label: "Date", value: widget.title.split(" · ")[1] || "—" },
    { label: "Sends", value: parts[0]?.replace(" sends", "") || "—" },
    { label: "Best", value: parts[1] || "—" },
  ];
}

// ── Submit ──

let _pendingDraft: PostDraft | null = null;
let _pendingMedia: PickedMediaItem[] | null = null;

export async function submitPostInBackground(
  draft: PostDraft,
  sortedMedia: PickedMediaItem[],
) {
  // Stash for retry
  _pendingDraft = draft;
  _pendingMedia = sortedMedia;

  setState({ status: "uploading", uploaded: 0, total: sortedMedia.length, error: undefined });

  try {
    // 1. Upload media one by one for progress tracking
    const localItems = sortedMedia.filter((m) => !m.uri.startsWith("http"));
    const uploadMap = new Map<string, { type: "image" | "video"; url: string }>();

    if (localItems.length > 0) {
      setState({ total: localItems.length });
      const results = await uploadPostMedia(localItems);
      localItems.forEach((item, i) => {
        uploadMap.set(item.id, results[i]);
      });
      setState({ uploaded: localItems.length });
    }

    const uploadedMedia = sortedMedia.map((m) =>
      m.uri.startsWith("http")
        ? { type: m.mediaType, url: m.uri }
        : uploadMap.get(m.id)!,
    );

    // 2. Build post payload
    const w = draft.attachedWidget;
    const hasAttachment = !!(w && w.id && w.type);

    const postData: UserPostCreateIn = {
      content_text: draft.content || undefined,
      media: uploadedMedia,
      attachment_type: hasAttachment ? (w!.type as any) : undefined,
      attachment_id: hasAttachment ? w!.id : undefined,
      attachment_meta: hasAttachment
        ? {
            title: w!.title,
            subtitle: w!.subtitle,
            metrics: buildMetricsFromWidget(w),
          }
        : undefined,
      visibility: draft.visibility,
      gym_id: draft.selectedGym?.id || undefined,
    };

    // 3. Create post via store (optimistic update)
    await useCommunityStore.getState().createPost(postData);

    // 4. Share session/log if attached
    if (w && (w.type === "session" || w.type === "log") && w.id) {
      api
        .post(`/sessions/${w.id}/share`, { public: true })
        .catch(() => {});
    }

    setState({ status: "success" });
    _pendingDraft = null;
    _pendingMedia = null;

    // Auto-dismiss after 2.5s
    setTimeout(() => {
      if (_state.status === "success") {
        setState({ status: "idle", uploaded: 0, total: 0 });
      }
    }, 2500);
  } catch (e: any) {
    setState({ status: "error", error: e?.message || "Upload failed" });
  }
}

export function retryUpload() {
  if (_pendingDraft && _pendingMedia) {
    submitPostInBackground(_pendingDraft, _pendingMedia);
  }
}

export function dismissUploadBanner() {
  _pendingDraft = null;
  _pendingMedia = null;
  setState({ status: "idle", uploaded: 0, total: 0, error: undefined });
}
