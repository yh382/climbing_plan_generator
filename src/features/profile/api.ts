// src/features/profile/api.ts

import * as FileSystem from "expo-file-system/legacy";
import { api } from "../../lib/apiClient";
import { compressImage } from "../../lib/imageCompression";
import {
  startUpload,
  finishUpload,
} from "../../lib/uploadActivityBridge";

export type PrivacySettingsData = {
  posts_public: boolean;
  body_info_public: boolean;
  analysis_public: boolean;
  plans_public: boolean;
  badges_public: boolean;
  lists_public: boolean;
  logs_public: boolean;
};

export const profileApi = {
  getPrivacy: () => api.get<PrivacySettingsData>("/profiles/me/privacy"),
  updatePrivacy: (data: Partial<PrivacySettingsData>) =>
    api.patch<PrivacySettingsData>("/profiles/me/privacy", data),
};

// ---------------------------------------------------------------------------
// /users/me + /profiles/* plumbing (CF Phase 2 — routes/stores stop calling
// apiClient directly). Payload shapes live with their consumers (screen view
// types, store types), so these take a type parameter instead of pinning one.
// ---------------------------------------------------------------------------

export type FollowCounts = { followers: number; following: number };

/** GET /users/me — raw current-user payload. */
export function getUserMe<T = unknown>(): Promise<T> {
  return api.get<T>("/users/me");
}

/** PUT /users/me — partial user update. */
export function updateUserMe<T = unknown>(patch: unknown): Promise<T> {
  return api.put<T>("/users/me", patch);
}

/** GET /profiles/me — my full profile. */
export function getMyProfile<T = unknown>(): Promise<T> {
  return api.get<T>("/profiles/me");
}

/** PUT /profiles/me — partial profile update. */
export function updateMyProfile<T = unknown>(partial: unknown): Promise<T> {
  return api.put<T>("/profiles/me", partial);
}

/** POST /profiles/me/performance — upsert performance metrics. */
export function upsertMyPerformance<T = unknown>(
  perfPatch: Record<string, any>,
): Promise<T> {
  return api.post<T>("/profiles/me/performance", perfPatch);
}

/** GET /profiles/{userId} — another user's profile (single request). */
export function getProfile<T = unknown>(userId: string): Promise<T> {
  return api.get<T>(`/profiles/${userId}`);
}

/** GET /profiles/{userId} with a legacy `/profiles/by_user/{id}` fallback —
 *  preserved verbatim from useProfileStore's defensive path handling. */
export async function getProfileByUserId<T = unknown>(
  userId: string,
): Promise<T> {
  try {
    return await getProfile<T>(userId);
  } catch {
    return await api.get<T>(`/profiles/by_user/${userId}`);
  }
}

/** GET follow counts — mine when `userId` is omitted, otherwise theirs.
 *  Always returns coerced numbers. */
export async function getFollowCounts(userId?: string): Promise<FollowCounts> {
  const path = userId
    ? `/profiles/${userId}/follow_counts`
    : "/profiles/me/follow_counts";
  const res = await api.get<FollowCounts>(path);
  return {
    followers: Number(res?.followers ?? 0),
    following: Number(res?.following ?? 0),
  };
}

/** GET /climbs — climb list with pre-built query string (see useClimbsStore
 *  for filter → query mapping). */
export function listClimbs<T = unknown>(query: string): Promise<T> {
  return api.get<T>(`/climbs?${query}`);
}

/** GET /career/summary — aggregated career stats. */
export function getCareerSummary<T = unknown>(query: string): Promise<T> {
  return api.get<T>(`/career/summary?${query}`);
}

import type { AscentsFilter, UserAscentsResponse } from "./types";

/** GET /users/{userId}/ascents — historical aggregated ascents for the
 *  user, filtered by privacy + visibility on the backend. */
export function getUserAscents(
  userId: string,
  params: AscentsFilter = {},
): Promise<UserAscentsResponse> {
  const qs = new URLSearchParams();
  if (params.location_type && params.location_type !== "all") {
    qs.set("location_type", params.location_type);
  }
  if (params.wall_type && params.wall_type !== "all") {
    qs.set("wall_type", params.wall_type);
  }
  if (params.since) qs.set("since", params.since);
  if (params.cursor) qs.set("cursor", params.cursor);
  if (params.limit != null) qs.set("limit", String(params.limit));
  const query = qs.toString();
  return api.get<UserAscentsResponse>(
    `/users/${userId}/ascents${query ? `?${query}` : ""}`,
  );
}

type PresignResponse = {
  upload_url: string;
  public_url: string;
  key: string;
};

/**
 * Convert a ph:// (iOS Photos Library) URI to a file:// URI
 * that expo-file-system can handle.
 */
async function toFileUri(uri: string): Promise<string> {
  if (!uri.startsWith("ph://")) return uri;

  const dest = `${FileSystem.cacheDirectory}upload_${Date.now()}.jpg`;
  await FileSystem.copyAsync({ from: uri, to: dest });
  return dest;
}

/**
 * Upload a local image (ph://, file://) to Cloudflare R2 via presigned URL.
 * Returns the public HTTPS URL for storage in the database.
 */
export async function uploadImageToR2(
  localUri: string,
  category: "avatars" | "covers"
): Promise<string> {
  // Surface 'silent' — avatar/cover are small enough (< 100KB after
  // compression, ~500ms upload) that flashing a Live Activity would be jankier
  // than no UI. Failures are surfaced via the caller's Alert (EditProfileView
  // catches the throw). The store entry is kept anyway so there's a single
  // record of every upload across the app.
  const uploadId = startUpload(
    category === "avatars" ? "Updating avatar" : "Updating cover",
    "silent",
  );

  try {
    // 0. Compress (avatar 512px / cover 1920px) + convert ph:// to file://
    const variant = category === "avatars" ? "avatar" : "cover";
    const compressed = await compressImage(localUri, variant);
    const fileUri = await toFileUri(compressed);

    // 1. Get presigned PUT URL from backend
    const { upload_url, public_url } = await api.post<PresignResponse>(
      "/upload/presign",
      { category, content_type: "image/jpeg" }
    );

    // 2. Upload directly to R2
    const result = await FileSystem.uploadAsync(upload_url, fileUri, {
      httpMethod: "PUT",
      uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
      headers: { "Content-Type": "image/jpeg" },
    });

    if (result.status < 200 || result.status >= 300) {
      throw new Error(`Upload failed: ${result.status}`);
    }

    finishUpload(uploadId, "success");
    return public_url;
  } catch (err: any) {
    finishUpload(uploadId, "error", err?.message);
    throw err;
  }
}
