// src/features/dailysummary/TodaySendsButton.tsx
// Window B1 — KAYA-style "today's sends" counter button.
// Floating circle that sits in a map-screen top bar; hidden until the
// user records the day's first send, then fades in showing the running
// count. Tap → /daily-summary?date=<today> for the full breakdown.
//
// Positioning is owned by the caller — this component only renders the
// pill itself + animation.
//
// ⚠️ KNOWN VISUAL ISSUE (B1 ship): mounting this RN component anywhere
// in the same screen tree as a SwiftUI Host that uses
// `glassEffectUnion` (the right-pill on indoor / outdoor / gyms maps)
// silently breaks the union, causing the fused glass capsule to render
// as 3 disconnected "candied haws" beads. Verified by binary bisecting:
// neither the dismiss/useFocusEffect logic nor the absolute-overlay
// layout is the cause — the regression appears just from TodaySendsButton
// being rendered in the same screen subtree. Suspected: Reanimated 3
// `Animated.View` + `FadeInDown.springify()` worklet init / hit-test
// recompute disrupts the SwiftUI @Namespace registration that
// `glassEffectUnion` relies on.
//
// Tracked in BACKLOG as `TodaySendsButton-SwiftUI`: rewrite this
// component as a SwiftUI Host (`Button` + glass circle + Text count
// label), fused into the right pill via the same `glassEffectUnion`
// id. That avoids the cross-runtime namespace conflict entirely AND
// gives a tighter visual integration. Until then we ship with the
// broken pill — user has accepted the trade-off.

import React, { memo } from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { useRouter } from "expo-router";
import Animated, { FadeInDown, FadeOutUp } from "react-native-reanimated";

import { useDailyData } from "./useDailyData";
import { localDateString } from "../../lib/localDate";
import { useThemeColors } from "../../lib/useThemeColors";
import { theme } from "../../lib/theme";

type Props = {
  /** Caller-provided side effect that runs in the same tick as
   *  navigation — e.g. on map screens, fire `sheetRef.dismiss()` so the
   *  iOS sheet animates out in parallel with the push. Intentionally
   *  not awaited: awaiting iOS UISheetPresentationController.dismiss()
   *  blocks router.push for the full ~300-500ms dismiss animation,
   *  which feels laggy. Letting the two animations run concurrently
   *  composes cleanly (sheet slides down while new screen slides in
   *  from the right). Errors swallowed in the caller. */
  onPressBefore?: () => void | Promise<void>;
};

function TodaySendsButtonImpl({ onPressBefore }: Props) {
  const today = localDateString();
  // useDailyData already handles store subscription + 1s tick during an
  // active session, so the count stays live without extra wiring here.
  const data = useDailyData(today);
  const count = data?.kpis?.sends ?? 0;
  const colors = useThemeColors();
  const router = useRouter();

  if (count <= 0) return null;

  const display = count > 99 ? "99+" : String(count);

  const handlePress = () => {
    // Fire-and-forget — see Props.onPressBefore JSDoc.
    onPressBefore?.();
    router.push({
      pathname: "/daily-summary",
      params: { date: today },
    } as any);
  };

  return (
    <Animated.View
      entering={FadeInDown.springify().damping(40)}
      exiting={FadeOutUp.duration(200)}
    >
      <Pressable
        onPress={handlePress}
        style={({ pressed }) => [
          styles.button,
          { backgroundColor: colors.accent, opacity: pressed ? 0.85 : 1 },
        ]}
        hitSlop={6}
        accessibilityRole="button"
        accessibilityLabel={`${count} sends today`}
      >
        <Text style={styles.count}>{display}</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    // Match HeaderButton variant="glass" floating shadow so the count
    // pill reads as part of the same top-bar layer.
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  count: {
    fontFamily: theme.fonts.monoMedium,
    fontSize: 17,
    color: "#FFFFFF",
    fontVariant: ["tabular-nums"],
  },
});

const TodaySendsButton = memo(TodaySendsButtonImpl);
export default TodaySendsButton;
