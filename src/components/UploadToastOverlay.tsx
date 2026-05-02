// src/components/UploadToastOverlay.tsx
//
// In-app upload progress overlay (SwiftUI capsule via native module).
//
// Why this exists alongside the Live Activity:
//   iOS suppresses an app's own Live Activity in the Dynamic Island while the
//   app is foreground active (system policy, not a bug — see WWDC23 "Meet
//   ActivityKit"). The LA only appears once the user backgrounds the app.
//   This overlay shows the same progress in-app, so users staying inside
//   ClimMate during a long upload still get feedback.
//
// Position: floating capsule above the native tab bar, mirroring how Apple
// Photos / Music render their in-app upload/playback indicators.
//
// Mounted once at the root layout. It auto-hides when there is no `surface:
// 'la'` upload in flight (silent surface uploads — avatar/cover — never
// surface here; they're so short the overlay would just flash).

import React from "react";
import { View, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useUploadProgressStore } from "../store/useUploadProgressStore";
import { ClimmateUploadToast } from "../../modules/climmate-upload-toast/src";

const NATIVE_TAB_BAR_HEIGHT = 49;
const MARGIN_ABOVE_TAB_BAR = 12;
const TOAST_HEIGHT = 38;

export default function UploadToastOverlay() {
  const insets = useSafeAreaInsets();
  const uploads = useUploadProgressStore((s) => s.uploads);

  // Show only LA-surfaced uploads — silent ones have no UI by design.
  // Pick the most recent so multiple parallel uploads collapse to the latest.
  const latest = uploads
    .filter((u) => u.surface === "la")
    .sort((a, b) => b.startedAt - a.startedAt)[0];

  if (!latest) return null;

  return (
    <View
      pointerEvents="none"
      style={[
        styles.container,
        { bottom: insets.bottom + NATIVE_TAB_BAR_HEIGHT + MARGIN_ABOVE_TAB_BAR },
      ]}
    >
      <ClimmateUploadToast
        status={latest.status}
        progress={latest.progress}
        label={latest.label}
        style={styles.toast}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 0,
    right: 0,
    height: TOAST_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
    // Above tab bar / floating timer / etc. but below dialogs/sheets — these
    // dismiss before upload starts in practice, so no z-index conflict.
    zIndex: 50,
  },
  toast: {
    height: TOAST_HEIGHT,
    width: "100%",
  },
});
