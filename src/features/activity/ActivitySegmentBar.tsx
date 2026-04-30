// src/features/activity/ActivitySegmentBar.tsx
// Shared segmented control for the Activity tab. Rendered as a sticky header
// inside each segment's ScrollView so the native large title can collapse
// against the single primary scroll view, and the bar stays pinned below
// the collapsed header while content scrolls.

import React, { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { theme } from "@/lib/theme";
import { useThemeColors } from "../../lib/useThemeColors";
import { useSettings } from "../../contexts/SettingsContext";
import { NativeSegmentedControl } from "../../components/ui";
import useSettingsStore, { type ActivitySegment } from "../../store/useSettingsStore";

const SEGMENT_ORDER: ActivitySegment[] = ["sessions", "training", "analysis"];

export default function ActivitySegmentBar() {
  const colors = useThemeColors();
  const { tr } = useSettings();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const segment = useSettingsStore((s) => s.activitySegment);
  const setSegment = useSettingsStore((s) => s.setActivitySegment);

  const options = useMemo(
    () => [
      tr("Sessions", "Sessions"),
      tr("Training", "Training"),
      tr("Analysis", "Analysis"),
    ],
    [tr]
  );

  const selectedIndex = Math.max(0, SEGMENT_ORDER.indexOf(segment));

  return (
    <View style={styles.wrap}>
      <NativeSegmentedControl
        options={options}
        selectedIndex={selectedIndex}
        onSelect={(i) => setSegment(SEGMENT_ORDER[i] ?? "sessions")}
      />
    </View>
  );
}

const createStyles = (colors: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    wrap: {
      // 16pt aligns with iOS native large-title leading margin.
      paddingHorizontal: 16,
      paddingTop: 4,
      paddingBottom: 6,
      backgroundColor: colors.background,
    },
  });
