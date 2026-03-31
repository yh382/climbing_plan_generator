import * as FileSystem from "expo-file-system/legacy";
import { api } from "../../lib/apiClient";
import { compressVideo } from "../../lib/videoCompression";

type UploadProgressCallback = (progress: number) => void;

interface UploadResult {
  public_url: string;
  key: string;
}

type PresignResponse = { upload_url: string; public_url: string; key: string };

export async function toFileUri(uri: string, isVideo = false): Promise<string> {
  if (!uri.startsWith("ph://")) return uri;
  const ext = isVideo ? "mp4" : "jpg";
  const dest = `${FileSystem.cacheDirectory}upload_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.${ext}`;
  await FileSystem.copyAsync({ from: uri, to: dest });
  return dest;
}

/**
 * Upload log media to R2 via presigned URL.
 */
export async function uploadLogMedia(
  uri: string,
  contentType: string,
  onProgress?: UploadProgressCallback
): Promise<UploadResult> {
  const isVideo = contentType.startsWith("video/");
  let fileUri: string;

  if (isVideo) {
    // Compress video: HEVC→H.264, 4K→1080p, moov→front
    fileUri = await compressVideo(uri, (progress) => {
      // Compression takes 0-40% of overall progress
      onProgress?.(progress * 40);
    });
    // After compression, override content type to video/mp4
    contentType = "video/mp4";
  } else {
    fileUri = await toFileUri(uri);
  }

  // 1. Get presigned URL
  const presign = await api.post<PresignResponse>("/upload/presign", {
    category: "logs",
    content_type: contentType,
  });

  const uploadBase = isVideo ? 40 : 0;
  const uploadRange = 100 - uploadBase;
  onProgress?.(uploadBase + uploadRange * 0.05);

  // 2. Read file as blob (simulate slow progress during read)
  let simPct = uploadBase + uploadRange * 0.05;
  const readTarget = uploadBase + uploadRange * 0.25;
  const simInterval = setInterval(() => {
    simPct = Math.min(simPct + 1, readTarget);
    onProgress?.(simPct);
  }, 500);

  const response = await fetch(fileUri);
  const blob = await response.blob();

  clearInterval(simInterval);
  const baseAfterRead = Math.max(simPct, readTarget);
  onProgress?.(baseAfterRead);

  // 3. Upload via XMLHttpRequest for real progress
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", presign.upload_url);
    xhr.setRequestHeader("Content-Type", contentType);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        const pct = baseAfterRead + (e.loaded / e.total) * (100 - baseAfterRead);
        onProgress?.(pct);
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`Upload failed: ${xhr.status}`));
    };
    xhr.onerror = () => reject(new Error("Upload network error"));
    xhr.send(blob);
  });

  onProgress?.(100);

  return {
    public_url: presign.public_url,
    key: presign.key,
  };
}

/**
 * Upload multiple log media items with aggregate progress.
 */
export async function uploadLogMediaBatch(
  items: Array<{ uri: string; contentType: string }>,
  onProgress?: UploadProgressCallback
): Promise<UploadResult[]> {
  const results: UploadResult[] = [];
  for (let i = 0; i < items.length; i++) {
    const result = await uploadLogMedia(
      items[i].uri,
      items[i].contentType,
      (p) => {
        const overall = ((i + p / 100) / items.length) * 100;
        onProgress?.(overall);
      }
    );
    results.push(result);
  }
  return results;
}
