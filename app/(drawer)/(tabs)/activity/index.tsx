// app/(tabs)/activity/index.tsx
// Activity tab entry with a 3-segment switcher (Sessions / Training / Analysis).
// Each segment owns its own primary ScrollView so the native large title
// collapses correctly; the segmented control is rendered as a sticky header
// inside each segment via ActivitySegmentBar.

import React, { useLayoutEffect } from "react";
import { Alert } from "react-native";
import { Stack, useRouter } from "expo-router";
import { DrawerActions, useNavigation } from "@react-navigation/native";
import { NATIVE_HEADER_LARGE, withHeaderTheme, HEADER_TRANSPARENT } from "@/lib/nativeHeaderOptions";
import { useThemeColors } from "../../../../src/lib/useThemeColors";
import { useSettings } from "../../../../src/contexts/SettingsContext";

import useSettingsStore from "../../../../src/store/useSettingsStore";

import SessionsSegment from "../../../../src/features/activity/SessionsSegment";
import TrainingSegment from "../../../../src/features/activity/TrainingSegment";
import AnalysisSegmentView from "../../../../src/features/activity/AnalysisSegment";

// Native iOS large title in top-left (Home-page parity), collapsing into
// the translucent nav bar on scroll via scrollEdgeEffects. Subtitle is
// rendered as the first content row of each segment.

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
      <Stack.Toolbar placement="left">
        <Stack.Toolbar.Button
          icon="line.3.horizontal"
          onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
        />
      </Stack.Toolbar>
      {segment === "training" ? (
        <Stack.Toolbar placement="right">
          <Stack.Toolbar.Menu icon="plus">
            <Stack.Toolbar.MenuAction
              icon="hammer"
              onPress={() => router.push("/library/plan-builder" as any)}
            >
              {tr("自定义", "Customize")}
            </Stack.Toolbar.MenuAction>
            <Stack.Toolbar.MenuAction
              icon="sparkles"
              onPress={() =>
                Alert.alert(
                  tr("即将推出", "Coming Soon"),
                  tr("AI 计划生成将随 Coach AI 一起上线。", "AI plan generation will arrive with Coach AI.")
                )
              }
            >
              {tr("AI 生成", "AI Pick")}
            </Stack.Toolbar.MenuAction>
          </Stack.Toolbar.Menu>
        </Stack.Toolbar>
      ) : null}

      {segment === "sessions" && <SessionsSegment />}
      {segment === "training" && <TrainingSegment />}
      {segment === "analysis" && <AnalysisSegmentView />}
    </>
  );
}
