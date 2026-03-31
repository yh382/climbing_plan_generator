// src/lib/videoCompression.ts
// Shared video compression utility using react-native-compressor.
// Converts HEVC → H.264, caps resolution at 1080p, moves moov atom to front.

import { Video } from "react-native-compressor";

type ProgressCallback = (progress: number) => void;

/**
 * Compress a local video file before upload.
 * - Re-encodes to H.264 (universal playback compatibility)
 * - Caps max dimension at 1920px (1080p)
 * - moov atom placed at file front (AVAssetExportSession default)
 * - Typical compression: 200 MB → 10-20 MB
 *
 * Accepts ph://, file://, or local paths.
 * Skips remote http(s) URLs (already uploaded).
 *
 * @returns file:// URI of the compressed video
 */
export async function compressVideo(
  uri: string,
  onProgress?: ProgressCallback,
): Promise<string> {
  // Skip already-uploaded remote URLs
  if (uri.startsWith("http://") || uri.startsWith("https://")) {
    return uri;
  }

  const result = await Video.compress(
    uri,
    {
      compressionMethod: "manual",
      maxSize: 1920,
      bitrate: 6_000_000, // 6 Mbps — crisp 1080p, ~45 MB/min
      minimumFileSizeForCompress: 10, // skip files already < 10 MB
    },
    (progress) => {
      onProgress?.(progress);
    },
  );

  return result;
}
