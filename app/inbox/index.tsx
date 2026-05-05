import React, { useLayoutEffect, useMemo, useState } from "react";
import { View, StyleSheet } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useNavigation } from "@react-navigation/native";
import { HeaderButton } from "@/components/ui/HeaderButton";
import { withHeaderTheme } from "@/lib/nativeHeaderOptions";
import { useSettings } from "@/contexts/SettingsContext";
import { useThemeColors } from "@/lib/useThemeColors";
import { NativeSegmentedControl } from "@/components/ui";
import { theme } from "@/lib/theme";
import ConversationsList from "@/features/inbox/ConversationsList";
import ActivityFeed from "@/features/inbox/ActivityFeed";
import { ScrollEdgeFallback } from "@/components/shared/ScrollEdgeFallback";

type Section = "conversations" | "activity";

export default function InboxScreen() {
  const { tr } = useSettings();
  const colors = useThemeColors();
  const router = useRouter();
  const navigation = useNavigation();

  const params = useLocalSearchParams<{ section?: string }>();
  const initialSection: Section = params.section === "activity" ? "activity" : "conversations";
  const [section, setSection] = useState<Section>(initialSection);

  // Header options (NATIVE_HEADER_LARGE / headerTransparent / scrollEdgeEffects)
  // are configured by app/inbox/_layout.tsx nested Stack. Only dynamic bits set here.
  useLayoutEffect(() => {
    navigation.setOptions({
      ...withHeaderTheme(colors),
      title: tr("收件箱", "Inbox"),
      headerLeft: () => (
        <HeaderButton icon="chevron.backward" onPress={() => router.back()} />
      ),
    });
  }, [navigation, colors, router, tr]);

  const styles = useMemo(() => createStyles(colors), [colors]);

  const options = useMemo(
    () => [tr("对话", "Chats"), tr("通知", "Notifications")],
    [tr],
  );

  const handleSelect = (idx: number) => {
    const next: Section = idx === 0 ? "conversations" : "activity";
    setSection(next);
    router.setParams({ section: next });
  };

  const listHeader = useMemo(
    () => (
      <View style={styles.segmentWrap}>
        <NativeSegmentedControl
          options={options}
          selectedIndex={section === "conversations" ? 0 : 1}
          onSelect={handleSelect}
          style={{ height: 32 }}
        />
      </View>
    ),
    [styles, options, section],
  );

  return (
    <ScrollEdgeFallback>
      {section === "conversations" ? (
        <ConversationsList listHeader={listHeader} />
      ) : (
        <ActivityFeed listHeader={listHeader} />
      )}
    </ScrollEdgeFallback>
  );
}

const createStyles = (colors: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    segmentWrap: {
      paddingHorizontal: theme.spacing.screenPadding,
      paddingBottom: 8,
      backgroundColor: colors.background,
    },
  });
