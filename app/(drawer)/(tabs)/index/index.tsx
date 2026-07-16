// app/(drawer)/(tabs)/index/index.tsx — Home tab.
// Window α reshape: This Month → Coach prompt → My Gyms → Rank → Saved Spots.
// Blog / Outdoor list / Challenges sections live elsewhere now.

import { useEffect, useLayoutEffect } from "react";
import { ScrollView } from "react-native";
import { StatusBar } from "expo-status-bar";
import { Stack, useRouter } from "expo-router";
import { useNavigation } from "@react-navigation/native";
import { DrawerActions } from "@react-navigation/native";
import { NATIVE_HEADER_LARGE, withHeaderTheme } from "@/lib/nativeHeaderOptions";
import { useAuthStore } from "@/store/useAuthStore";
import { useThemeColors } from "@/lib/useThemeColors";
import { useSettings } from "@/contexts/SettingsContext";
import SetupClimmateCard from "@/features/home/components/SetupClimmateCard";
import { ThisMonthSection } from "@/features/home/components/ThisMonthSection";
import { CoachPromptCard } from "@/features/home/components/CoachPromptCard";
import { MyGymsCard } from "@/features/home/components/MyGymsCard";
import ProgramsCard from "@/features/home/components/ProgramsCard";
import { RankCard } from "@/features/home/components/RankCard";
import { SavedSpotsCarousel } from "@/features/home/components/SavedSpotsCarousel";
import { useInboxUnreadCount } from "@/features/inbox/hooks";

export default function HomeScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const navigation = useNavigation();
  const bootstrap = useAuthStore((s) => s.bootstrap);
  const { tr } = useSettings();
  const inboxUnread = useInboxUnreadCount();

  useLayoutEffect(() => {
    navigation.setOptions({
      ...NATIVE_HEADER_LARGE,
      ...withHeaderTheme(colors),
      headerShown: true,
      title: tr("嗨，攀岩者", "Hi, Climber"),
      headerLargeTitleStyle: { color: colors.textPrimary },
    });
  }, [navigation, colors, tr]);

  useEffect(() => {
    bootstrap();
  }, []);

  return (
    <>
      <Stack.Toolbar placement="left">
        <Stack.Toolbar.Button
          icon="line.3.horizontal"
          onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
        />
      </Stack.Toolbar>
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button icon="magnifyingglass" onPress={() => router.push("/search" as any)} />
        <Stack.Toolbar.Button icon="tray" onPress={() => router.push("/inbox" as any)}>
          {inboxUnread > 0 ? (
            // IG-style unread dot: glyph color == background color at a tiny
            // font size renders the native badge as a small solid circle at
            // the icon's top-right instead of a numbered pill.
            <Stack.Toolbar.Badge
              style={{ backgroundColor: colors.unreadDot, color: colors.unreadDot, fontSize: 5 }}
            >
              •
            </Stack.Toolbar.Badge>
          ) : null}
        </Stack.Toolbar.Button>
      </Stack.Toolbar>
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        <StatusBar style="auto" />

        <SetupClimmateCard />

        <ThisMonthSection />

        <CoachPromptCard />

        <MyGymsCard />

        <ProgramsCard />

        <RankCard />

        <SavedSpotsCarousel />
      </ScrollView>
    </>
  );
}

