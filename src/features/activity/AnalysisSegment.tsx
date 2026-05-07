// src/features/activity/AnalysisSegment.tsx
// Activity tab's Analysis segment. Wraps the shared AnalysisScreen in a
// ScrollView that hosts the sticky segmented control header. AnalysisScreen
// is rendered in embedded mode so it doesn't create a nested ScrollView.

import React from "react";
import { ScrollView } from "react-native";
import { useThemeColors } from "../../lib/useThemeColors";
import AnalysisScreen from "../analysis/AnalysisScreen";
import ActivitySegmentBar from "./ActivitySegmentBar";
import ActivitySubtitle from "./ActivitySubtitle";
export default function AnalysisSegment() {
  const colors = useThemeColors();
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentInsetAdjustmentBehavior="automatic"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 120, backgroundColor: colors.background }}
    >
      <ActivitySubtitle />
      <ActivitySegmentBar />
      <AnalysisScreen embedded />
    </ScrollView>
  );
}
