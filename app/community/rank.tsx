import { useLayoutEffect } from "react";
import { ScrollView } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useNavigation } from "@react-navigation/native";
import { Host, Button as SUIButton } from "@expo/ui/swift-ui";
import { frame, buttonStyle, labelStyle } from "@expo/ui/swift-ui/modifiers";
import { NATIVE_HEADER_LARGE, withHeaderTheme, HEADER_TRANSPARENT } from "@/lib/nativeHeaderOptions";
import { useSettings } from "@/contexts/SettingsContext";
import { useThemeColors } from "@/lib/useThemeColors";
import RankTab from "@/features/community/rank/RankTab";
import { ScrollEdgeFallback } from "@/components/shared/ScrollEdgeFallback";

export default function RankScreen() {
  const { tr } = useSettings();
  const colors = useThemeColors();
  const navigation = useNavigation();
  const router = useRouter();

  // future-proofing: 预留 URL 参数供未来 deep-link 到特定 discipline，
  // 当前 toolbar trophy 不带参数，永远回退 "all"。保留不妨碍。
  const { discipline = "all" } = useLocalSearchParams<{
    discipline?: "all" | "boulder" | "rope";
  }>();

  useLayoutEffect(() => {
    navigation.setOptions({
      ...NATIVE_HEADER_LARGE,
      ...withHeaderTheme(colors),
      headerTransparent: HEADER_TRANSPARENT,
      scrollEdgeEffects: { top: "soft" },
      title: tr("排行榜", "Rank"),
      headerLeft: () => (
        <Host matchContents>
          <SUIButton
            systemImage={"chevron.backward" as any}
            label=""
            onPress={() => router.back()}
            modifiers={[
              buttonStyle("plain"),
              labelStyle("iconOnly"),
              frame({ width: 34, height: 34, alignment: "center" }),
            ]}
          />
        </Host>
      ),
    });
  }, [navigation, colors, tr, router]);

  return (
    <ScrollEdgeFallback>
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        <RankTab
          discipline={discipline}
          onPressUser={(userId) => router.push(`/community/u/${userId}`)}
        />
      </ScrollView>
    </ScrollEdgeFallback>
  );
}
