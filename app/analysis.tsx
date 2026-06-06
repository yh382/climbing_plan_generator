// app/analysis.tsx
// Thin wrapper: mounts AnalysisScreen + configures the native large header.
// The same AnalysisScreen is reused inside Activity tab's Analysis segment.

import React from "react";
import { useThemeColors } from "@/lib/useThemeColors";
import { useNavigation } from "@react-navigation/native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { HeaderButton } from "../src/components/ui/HeaderButton";
import { NATIVE_HEADER_LARGE, withHeaderTheme } from "../src/lib/nativeHeaderOptions";
import { useSettings } from "../src/contexts/SettingsContext";
import AnalysisScreen, {
  type AnalysisFocusKey,
} from "../src/features/analysis/AnalysisScreen";

export default function AnalysisRoute() {
  const colors = useThemeColors();
  const navigation = useNavigation();
  const router = useRouter();
  const { tr } = useSettings();

  // TR7 — `focus` param drives the auto-scroll on mount. Ribbon cards
  // navigate here with a key (csm / pyramid / volume / training-*) so the
  // user lands on the section they tapped, not the top of the page.
  const { focus } = useLocalSearchParams<{ focus?: string }>();
  const safeFocus: AnalysisFocusKey | undefined = (focus as AnalysisFocusKey) || undefined;

  React.useLayoutEffect(() => {
    navigation.setOptions({
      ...NATIVE_HEADER_LARGE,
      ...withHeaderTheme(colors),
      headerShown: true,
      title: tr("分析", "Analysis"),
      headerLeft: () => (
        <HeaderButton icon="chevron.backward" onPress={() => router.back()} />
      ),
    });
  }, [navigation, router, tr, colors]);

  return <AnalysisScreen focus={safeFocus} />;
}
