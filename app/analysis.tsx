// app/analysis.tsx
// Thin wrapper: mounts AnalysisScreen + configures the native large header.
// The same AnalysisScreen is reused inside Activity tab's Analysis segment.

import React from "react";
import { useNavigation } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { HeaderButton } from "../src/components/ui/HeaderButton";
import { NATIVE_HEADER_LARGE } from "../src/lib/nativeHeaderOptions";
import { useSettings } from "../src/contexts/SettingsContext";
import AnalysisScreen from "../src/features/analysis/AnalysisScreen";

export default function AnalysisRoute() {
  const navigation = useNavigation();
  const router = useRouter();
  const { tr } = useSettings();

  React.useLayoutEffect(() => {
    navigation.setOptions({
      ...NATIVE_HEADER_LARGE,
      headerShown: true,
      title: tr("分析", "Analysis"),
      headerLeft: () => (
        <HeaderButton icon="chevron.backward" onPress={() => router.back()} />
      ),
    });
  }, [navigation, router, tr]);

  return <AnalysisScreen />;
}
