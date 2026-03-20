/**
 * Sanitize image URLs — reject local-only schemes (ph://, assets-library://)
 * that cannot be loaded by React Native Image outside the originating device.
 */
export function sanitizeImageUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith("ph://") || url.startsWith("assets-library://")) return null;
  return url;
}
