// app/body-info.tsx
// Native iOS formSheet showing body-info cards (anthropometric / capacity /
// finger strength / mobility / core endurance / climbing background).
// Ability radar is omitted — the radar card on the parent screen already
// represents that data. Sheet presentation configured in app/_layout.tsx.

import React, { useMemo } from "react";
import { ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import BasicInfoSection from "@/features/profile/components/fivecorefunction/BasicInfoSection";
import { createBasicInfoStyles } from "@/features/profile/components/basicinfo/styles";
import { useThemeColors } from "@/lib/useThemeColors";
import { useProfileStore } from "@/features/profile/store/useProfileStore";

export default function BodyInfoRoute() {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const styles = useMemo(() => createBasicInfoStyles(colors), [colors]);
  const headerVM = useProfileStore((s) => s.headerVM);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ paddingBottom: insets.bottom }}
    >
      {headerVM ? (
        <BasicInfoSection user={headerVM} styles={styles} hideRadar />
      ) : null}
    </ScrollView>
  );
}
