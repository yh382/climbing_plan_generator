// app/recent-climbs.tsx
// Native iOS formSheet route showing recent climbs. Sheet presentation +
// nav bar (Liquid Glass material on iOS 26) configured at root level in
// app/_layout.tsx.

import React from "react";
import { ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { RecentClimbsList } from "@/features/profile/components/RecentClimbsList";
import { useThemeColors } from "@/lib/useThemeColors";

export default function RecentClimbsRoute() {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  // ScrollView at the root — UIKit's formSheet sizes its content view to
  // the active detent, and an extra `<View style={{flex:1}}>` wrapper has
  // been observed to collapse at the large detent. Skipping the wrapper.
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      // `contentInsetAdjustmentBehavior="automatic"` lets iOS apply the
      // standard safe-area inset below the nav bar (and add extra at the
      // bottom for the home indicator) — same convention Apple uses in
      // Settings / Health / Messages contact-card sheets. Don't hardcode
      // paddingTop / paddingBottom on top of that.
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ paddingBottom: insets.bottom }}
    >
      <RecentClimbsList />
    </ScrollView>
  );
}
