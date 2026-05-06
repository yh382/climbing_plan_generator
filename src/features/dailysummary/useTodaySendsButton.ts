// src/features/dailysummary/useTodaySendsButton.ts
// KAYA-style "today's sends" counter button — packaged as a MapTopBar
// `count` button so callers can spread it into `rightButtons` and let
// SwiftUI fuse it into the same liquid-glass capsule as the icon
// buttons. Returns null when count <= 0; the caller's array shrinks
// and SwiftUI auto-morphs the union from 4 → 3 buttons.
//
// Replaces the prior RN <TodaySendsButton/> component which mounted as
// a sibling to the SwiftUI Host hosting the right pill — that sibling
// silently broke the SwiftUI @Namespace registration for
// `glassEffectUnion` (binary-bisected in B1; suspected Reanimated
// worklet init / Pressable hit-test recompute conflict). Living
// inside the SwiftUI subtree avoids the cross-runtime conflict
// entirely.

import { router } from "expo-router";

import { useDailyData } from "./useDailyData";
import { localDateString } from "../../lib/localDate";
import type { MapTopBarButton } from "../mapscreen/components/MapTopBar";

export function useTodaySendsButton(
  /** Caller-provided side effect that runs in the same tick as
   *  navigation — e.g. on map screens, fire `sheetRef.dismiss()` so the
   *  iOS sheet animates out in parallel with the push. Fire-and-forget;
   *  not awaited — awaiting iOS UISheetPresentationController.dismiss()
   *  blocks the push for the full ~300-500ms dismiss animation. */
  onPressBefore?: () => void | Promise<void>,
): MapTopBarButton | null {
  const today = localDateString();
  // useDailyData handles store subscription + 1s tick during an active
  // session, so the count stays live without extra wiring here.
  const data = useDailyData(today);
  const count = data?.kpis?.sends ?? 0;

  if (count <= 0) return null;

  return {
    key: "today-sends",
    count,
    onPress: () => {
      onPressBefore?.();
      router.push({
        pathname: "/daily-summary",
        params: { date: today },
      } as any);
    },
  };
}
