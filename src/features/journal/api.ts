import * as FileSystem from "expo-file-system/legacy";
import { api } from "../../lib/apiClient";

type UploadProgressCallback = (progress: number) => void;

interface UploadResult {
  public_url: string;
  key: string;
}

type PresignResponse = { upload_url: string; public_url: string; key: string };

async function toFileUri(uri: string): Promise<string> {
  if (!uri.startsWith("ph://")) return uri;
  const ext = "jpg";
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
  const fileUri = await toFileUri(uri);

  // 1. Get presigned URL
  const presign = await api.post<PresignResponse>("/upload/presign", {
    category: "logs",
    content_type: contentType,
  });

  onProgress?.(30);

  // 2. Upload to R2
  const result = await FileSystem.uploadAsync(presign.upload_url, fileUri, {
    httpMethod: "PUT",
    uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
    headers: { "Content-Type": contentType },
  });

  if (result.status < 200 || result.status >= 300) {
    throw new Error(`Upload failed: ${result.status}`);
  }

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
