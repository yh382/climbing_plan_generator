import { requireOptionalNativeModule } from "expo-modules-core";

export type ImageViewerMediaItem = {
  url: string;
  type?: "image" | "video";
};

interface ClimmateImageViewerNative {
  present: (params: {
    urls: string[];
    types: string[];
    startIndex: number;
  }) => Promise<void>;
}

const NativeModule =
  requireOptionalNativeModule<ClimmateImageViewerNative>("ClimmateImageViewer");

/**
 * Open a full-screen native image/video viewer.
 *
 * Backed by a custom SwiftUI implementation (not QuickLook):
 * - Loads media by HTTP Content-Type, so URLs without file extensions still
 *   work (legacy R2 keys generated before backend started embedding `.ext`).
 * - Black backdrop, transparent top bar (Close · counter · Share).
 * - Pinch-zoom (UIScrollView) + double-tap toggle for images.
 * - Native AVPlayer with system controls for videos.
 *
 * Imperative API: this opens a modal controller, so it cannot be expressed
 * as a declarative React component.
 */
export async function presentImageViewer({
  media,
  startIndex = 0,
}: {
  media: ImageViewerMediaItem[];
  startIndex?: number;
}): Promise<void> {
  if (!NativeModule) {
    if (__DEV__) {
      console.warn(
        "[ClimmateImageViewer] native module not available (run on a dev build, not Expo Go)",
      );
    }
    return;
  }
  const valid = media.filter(
    (m) => typeof m.url === "string" && m.url.length > 0,
  );
  if (valid.length === 0) return;
  const urls = valid.map((m) => m.url);
  const types = valid.map((m) => (m.type === "video" ? "video" : "image"));
  await NativeModule.present({ urls, types, startIndex });
}

export default { presentImageViewer };
