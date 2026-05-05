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
