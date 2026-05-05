// Standalone "My Lists" page — used when navigating from outside the Profile tab
// (e.g. crag-community's My Lists chip, deep links). Reuses <ListsSection /> so the
// Profile tab and this page stay in sync.

import { useLayoutEffect } from "react";
import { withHeaderTheme } from "@/lib/nativeHeaderOptions";
import { View, StyleSheet } from "react-native";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { HeaderButton } from "../../src/components/ui/HeaderButton";
import { useThemeColors } from "../../src/lib/useThemeColors";
import { useSettings } from "../../src/contexts/SettingsContext";
import ListsSection from "../../src/features/outdoor/components/ListsSection";

export default function MyListsPage() {
  const navigation = useNavigation();
  const router = useRouter();
  const colors = useThemeColors();
  const { tr } = useSettings();
  const { userId } = useLocalSearchParams<{ userId?: string }>();
  const viewedUserId = typeof userId === "string" ? userId : undefined;
  const isSelf = !viewedUserId;

  useLayoutEffect(() => {
    navigation.setOptions({
      title: isSelf ? tr("我的清单", "My Lists") : tr("清单", "Lists"),
      headerLargeTitle: true,
      ...withHeaderTheme(colors),
      headerLargeTitleShadowVisible: false,
      headerLeft: () => <HeaderButton icon="chevron.backward" onPress={() => router.back()} />,
    });
  }, [navigation, isSelf, tr, router]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ListsSection userId={viewedUserId} showCreate={isSelf} contentPaddingHorizontal={16} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
