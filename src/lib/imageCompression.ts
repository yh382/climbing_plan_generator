// src/lib/imageCompression.ts
// Image compression utility using expo-image-manipulator.
// Resizes longest side and re-encodes to JPEG to cut R2 storage cost.

import { ImageManipulator, SaveFormat } from "expo-image-manipulator";

export type ImageVariant =
  | "avatar"      // profile avatar (~512px)
  | "cover"       // profile cover / gym hero (~1920px)
  | "logMedia"    // journal log main image (~2048px)
  | "postMedia"   // community post main image (~2048px)
  | "thumbnail";  // video cover / route topo thumbnail (~720px)

const PRESETS: Record<ImageVariant, { maxSize: number; quality: number }> = {
  avatar:    { maxSize: 512,  quality: 0.8 },
  cover:     { maxSize: 1920, quality: 0.85 },
  logMedia:  { maxSize: 2048, quality: 0.9 },
  postMedia: { maxSize: 2048, quality: 0.9 },
  thumbnail: { maxSize: 720,  quality: 0.75 },
};

/**
 * Compress an image before upload.
 * - Longest side capped at variant.maxSize (no upscale; vertical/horizontal aware)
 * - Re-encodes to JPEG at variant.quality
 * - Skips remote http(s) URLs (already uploaded)
 * - Falls back to original URI on any error so upload can still proceed
 *
 * Accepts ph://, file://, or local paths.
 *
 * @returns file:// URI of the compressed image
 */
export async function compressImage(
  uri: string,
  variant: ImageVariant,
): Promise<string> {
  if (uri.startsWith("http://") || uri.startsWith("https://")) {
    return uri;
  }

  const preset = PRESETS[variant];

  try {
    // Probe dimensions: render once without transforms.
    // Single-axis resize would otherwise stretch the longest side past the cap
    // for vertical images (resize({ width }) on a portrait would only constrain width).
    const probe = await ImageManipulator.manipulate(uri).renderAsync();

    let ref = probe;
    const longest = Math.max(probe.width, probe.height);

    if (longest > preset.maxSize) {
      const ctx = ImageManipulator.manipulate(uri);
      if (probe.width >= probe.height) {
        ctx.resize({ width: preset.maxSize });
      } else {
        ctx.resize({ height: preset.maxSize });
      }
      ref = await ctx.renderAsync();
    }

    const result = await ref.saveAsync({
      format: SaveFormat.JPEG,
      compress: preset.quality,
    });
    return result.uri;
  } catch (err: any) {
    console.warn(
      "[IMAGE_COMPRESS] failed, falling back to original:",
      uri,
      err?.message || err,
    );
    return uri;
  }
}
