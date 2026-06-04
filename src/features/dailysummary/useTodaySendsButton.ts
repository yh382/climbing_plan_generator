// src/features/dailysummary/useTodaySendsButton.ts
// KAYA-style "today's sends" counter button — packaged as a MapTopBar
// `count` button so callers can spread it into `rightButtons` and let
// the GlassUnionPill native view render it as a tinted-glass member of
// the same liquid-glass capsule as the icon buttons. Returns null when
// count <= 0; the caller's array shrinks and SwiftUI auto-morphs the
// union accordingly.

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
