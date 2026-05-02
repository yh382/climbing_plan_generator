import { requireNativeView } from "expo";
import React from "react";
import { Platform, type ViewProps } from "react-native";

export type UploadToastStatus =
  | "compressing"
  | "uploading"
  | "success"
  | "error";

interface NativeProps extends ViewProps {
  status: UploadToastStatus;
  progress: number;
  label: string;
}

const NativeUploadToast =
  Platform.OS === "ios"
    ? (requireNativeView("ClimmateUploadToast") as React.ComponentType<NativeProps>)
    : null;

/**
 * SwiftUI capsule that visually mirrors the upload Live Activity. Mount this
 * declaratively when the in-app upload toast should be visible; the consumer
 * is responsible for foreground-only gating + position (UploadToastOverlay
 * does both — see src/components/UploadToastOverlay.tsx).
 */
export function ClimmateUploadToast(props: NativeProps) {
  if (!NativeUploadToast) return null;
  return <NativeUploadToast {...props} />;
}
