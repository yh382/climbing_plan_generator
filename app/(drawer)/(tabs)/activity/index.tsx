// app/(tabs)/activity/index.tsx
// Activity tab entry with a 2-segment switcher (Sessions / Training).
// TR7 — Analysis is no longer a segment; it lives at the full-screen
// app/analysis.tsx route, reached via QuickInsightsRibbon cards on
// each remaining segment. Each segment owns its own primary
// ScrollView so the native large title collapses correctly.

import React, { useLayoutEffect } from "react";
import { useNavigation } from "@react-navigation/native";
import { Stack, useRouter } from "expo-router";
import { NATIVE_HEADER_LARGE, withHeaderTheme, HEADER_TRANSPARENT } from "@/lib/nativeHeaderOptions";
import { useThemeColors } from "../../../../src/lib/useThemeColors";
import { useSettings } from "../../../../src/contexts/SettingsContext";

import useSettingsStore from "../../../../src/store/useSettingsStore";

import SessionsSegment from "../../../../src/features/activity/SessionsSegment";
import TrainingSegment from "../../../../src/features/activity/TrainingSegment";

// Native iOS large title in top-left (Home-page parity), collapsing into
// the translucent nav bar on scroll via scrollEdgeEffects. Drawer opens via
// edge-swipe gesture; no header toolbar items so the large title sits flush
// to the top, matching AA Book-tab parity.

export default function ActivityScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const colors = useThemeColors();
  const { tr } = useSettings();

  const segment = useSettingsStore((s) => s.activitySegment);

  useLayoutEffect(() => {
    navigation.setOptions({
      ...NATIVE_HEADER_LARGE,
      ...withHeaderTheme(colors),
      headerShown: true,
      headerTransparent: HEADER_TRANSPARENT,
      scrollEdgeEffects: { top: "soft" },
      title: tr("活动", "Activity"),
      headerLeft: undefined,
    });
  }, [navigation, tr, colors]);

  return (
    <>
      {/* TR4b-2: "+" → native UIMenu popover (iOS 26 toolbar-anchored
          menu, same pattern as Motra's workout-tab +). UIMenu attaches
          to the bar button without a sheet animation so it feels
          tap-fast; matches the system look. */}
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Menu icon="plus">
          <Stack.Toolbar.MenuAction
            icon="doc.text"
            onPress={() => router.push("/library/template-builder" as any)}
          >
            {tr("新建模板", "Add Template")}
          </Stack.Toolbar.MenuAction>
          <Stack.Toolbar.MenuAction
            icon="calendar"
            onPress={() => router.push("/library/plan-builder" as any)}
          >
            {tr("新建计划", "Add Plan")}
          </Stack.Toolbar.MenuAction>
        </Stack.Toolbar.Menu>
      </Stack.Toolbar>

      {segment === "sessions" && <SessionsSegment />}
      {segment === "training" && <TrainingSegment />}
    </>
  );
}
