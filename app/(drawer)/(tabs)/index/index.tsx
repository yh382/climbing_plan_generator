// app/(drawer)/(tabs)/index/index.tsx — Home tab.
// Window α reshape: This Month → Coach prompt → My Gyms → Rank → Saved Spots.
// Blog / Outdoor list / Challenges sections live elsewhere now.

import { useEffect, useLayoutEffect, useMemo } from "react";
import { ScrollView, TouchableOpacity, View, Text } from "react-native";
import { StatusBar } from "expo-status-bar";
import { Stack, useRouter } from "expo-router";
import { useNavigation } from "@react-navigation/native";
import { DrawerActions } from "@react-navigation/native";
import { NATIVE_HEADER_LARGE, withHeaderTheme } from "@/lib/nativeHeaderOptions";
import { useAuthStore } from "@/store/useAuthStore";
import { useThemeColors } from "@/lib/useThemeColors";
import { useSettings } from "@/contexts/SettingsContext";
import { theme } from "@/lib/theme";
import SetupClimmateCard from "@/features/home/components/SetupClimmateCard";
import { ThisMonthSection } from "@/features/home/components/ThisMonthSection";
import { CoachPromptCard } from "@/features/home/components/CoachPromptCard";
import { MyGymsCard } from "@/features/home/components/MyGymsCard";
import ProgramsCard from "@/features/home/components/ProgramsCard";
import { RankCard } from "@/features/home/components/RankCard";
import { SavedSpotsCarousel } from "@/features/home/components/SavedSpotsCarousel";

export default function HomeScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const navigation = useNavigation();
  const bootstrap = useAuthStore((s) => s.bootstrap);
  const { tr } = useSettings();

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
        <Stack.Toolbar.Button icon="tray" onPress={() => router.push("/inbox" as any)} />
      </Stack.Toolbar>
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        <StatusBar style="auto" />

        {__DEV__ ? <DevMockGymButton router={router} colors={colors} /> : null}

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

function DevMockGymButton({
  router,
  colors,
}: {
  router: ReturnType<typeof useRouter>;
  colors: ReturnType<typeof useThemeColors>;
}) {
  const styles = useMemo(
    () => ({
      btn: {
        marginHorizontal: 16,
        marginBottom: 12,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 12,
        backgroundColor: colors.cardDark,
      } as const,
      text: {
        color: "#FFF",
        fontFamily: theme.fonts.medium,
        fontSize: 14,
      } as const,
    }),
    [colors],
  );
  return (
    <TouchableOpacity
      style={styles.btn}
      onPress={() => router.push("/gym/00000000-0000-0000-0000-000000000001" as any)}
      activeOpacity={0.7}
    >
      <View>
        <Text style={styles.text}>🧗 Open Mock Gym (DEV)</Text>
      </View>
    </TouchableOpacity>
  );
}
