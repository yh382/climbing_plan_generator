// src/lib/haptics.ts
// Design Language v1 (docs/DESIGN_LANGUAGE.md §4.2) — the app's haptics
// grammar. All haptic feedback goes through these four verbs; calling
// expo-haptics directly in components is a review flag.
//
// Forbidden: scroll, tab switches (native tab bar provides its own), and
// plain button presses — press feedback is visual (PressableScale), not
// haptic.

import * as Haptics from "expo-haptics";

export const haptic = {
  /** Segmented / filter / picker selection change. */
  selection() {
    Haptics.selectionAsync().catch(() => {});
  },
  /** Minor confirmations — add to list, log a workout, log an attempt. */
  confirm() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  },
  /** THE send moment (§4.3) — the app's single Success notification.
   *  Reserved: do not call anywhere except logging a send. */
  sendSuccess() {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
      () => {},
    );
  },
  /** A destructive-confirm sheet is being presented. */
  destructiveWarning() {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(
      () => {},
    );
  },
};
