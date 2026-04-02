// Background post upload manager.
// Fires the upload + create-post flow after the user leaves the arrange/create screen,
// exposing status so CommunityScreen can show a small progress banner.

import { useSyncExternalStore } from "react";
import {
  uploadThumbnailToR2,
  uploadSingleFileToR2,
  toFileUri,
} from "./api";
import { api } from "../../lib/apiClient";
import { compressVideo } from "../../lib/videoCompression";
import { useCommunityStore } from "../../store/useCommunityStore";
import type { PostDraft } from "./pendingPostDraft";
import type { PickedMediaItem, UserPostCreateIn } from "./types";

// ── State ──

export type UploadStatus = "idle" | "compressing" | "uploading" | "success" | "error";

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
    { label: "Duration", value: parts[2] || "—" },
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
    // 1. Upload media one by one (compress videos → auto-thumbnail → upload)
    const localItems = sortedMedia.filter((m) => !m.uri.startsWith("http"));
    const uploadMap = new Map<string, { type: "image" | "video"; url: string }>();
    const autoThumbMap = new Map<string, string>(); // auto-generated thumbnails

    if (localItems.length > 0) {
      setState({ total: localItems.length });
      for (let i = 0; i < localItems.length; i++) {
        const item = localItems[i];

        if (item.mediaType === "video") {
          // Step 1: Compress video (HEVC→H.264)
          setState({ status: "compressing" });
          const compressedUri = await compressVideo(item.uri);

          // Step 2: Auto-generate thumbnail if missing
          // Uses the COMPRESSED file (H.264) so it works even when
          // the original HEVC couldn't be decoded for thumbnails.
          if (!item.coverUri) {
            try {
              const VT = await import("expo-video-thumbnails");
              const { uri: thumbUri } = await VT.getThumbnailAsync(
                compressedUri,
                { time: 1000, quality: 0.7 },
              );
              autoThumbMap.set(item.id, thumbUri);
            } catch { /* fallback: no thumbnail */ }
          }

          // Step 3: Upload compressed video to R2
          setState({ status: "uploading" });
          const publicUrl = await uploadSingleFileToR2(compressedUri, "video/mp4");
          uploadMap.set(item.id, { type: "video", url: publicUrl });
        } else {
          // Image: copy ph:// → file:// then upload
          setState({ status: "uploading" });
          const fileUri = await toFileUri(item.uri);
          const publicUrl = await uploadSingleFileToR2(fileUri, "image/jpeg");
          uploadMap.set(item.id, { type: "image", url: publicUrl });
        }

        setState({ uploaded: i + 1 });
      }
    }

    // Upload cover thumbnails to R2 (manual picks + auto-generated, parallel)
    const coverUrlMap = new Map<string, string>();
    await Promise.all(
      sortedMedia
        .filter((m) => {
          const thumb = m.coverUri || autoThumbMap.get(m.id);
          return thumb && !thumb.startsWith("http");
        })
        .map(async (m) => {
          const thumbUri = m.coverUri || autoThumbMap.get(m.id)!;
          try {
            coverUrlMap.set(m.id, await uploadThumbnailToR2(thumbUri));
          } catch { /* skip — post proceeds without thumbnail */ }
        })
    );

    const uploadedMedia = sortedMedia.map((m) => {
      const thumbUrl = coverUrlMap.get(m.id)
        || (m.coverUri?.startsWith("http") ? m.coverUri : undefined);
      if (m.uri.startsWith("http")) {
        return { type: m.mediaType, url: m.uri, thumb_url: thumbUrl };
      }
      const uploaded = uploadMap.get(m.id)!;
      return { ...uploaded, thumb_url: thumbUrl };
    });

    // 2. Build post payload
    const w = draft.attachedWidget;
    if (__DEV__ && w && w.type && !w.id) {
      console.warn("[postUploadManager] attachment has type but empty id — dropped!", w);
    }
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
