import React, { useEffect, useMemo, useState } from "react";
import { View, FlatList } from "react-native";
import { useLocalSearchParams, Stack } from "expo-router";

import GymCommunityTabs from "../src/features/community/gyms/GymCommunityTabs";
import GymDropdownPill from "../src/features/community/components/GymDropdownPill";
import { useGymFavoriteToggle } from "../src/features/gyms/hooks";
import { gymCommunityApi, GymStats } from "../src/features/gyms/api";
import { useThemeColors } from "../src/lib/useThemeColors";

export default function GymCommunityPage() {
  const { gymId, gymName } = useLocalSearchParams<{
    gymId: string;
    gymName?: string;
  }>();
  const colors = useThemeColors();
  const { isFavorited, toggle } = useGymFavoriteToggle();
  const favorited = gymId ? isFavorited(gymId) : false;

  const [stats, setStats] = useState<GymStats | null>(null);
  useEffect(() => {
    if (!gymId) { setStats(null); return; }
    let cancelled = false;
    gymCommunityApi.getStats(gymId).then((s) => {
      if (!cancelled) setStats(s);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [gymId]);

  const content = useMemo(() => {
    if (!gymId) return null;
    return (
      <>
        <View style={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 10 }}>
          <GymDropdownPill
            readonly
            gymName={gymName ?? ""}
            weeklyActive={stats?.weekly_active}
            totalSends={stats?.total_sends}
            gradeFeel={stats?.grade_feel ?? undefined}
          />
        </View>
        <GymCommunityTabs
          gymId={gymId}
          isFavorited={favorited}
          onToggleFavorite={() => gymId && toggle(gymId)}
        />
      </>
    );
  }, [gymId, gymName, stats, favorited, toggle]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack.Screen options={{
        title: "",
        headerTransparent: true,
        headerBackButtonDisplayMode: "minimal",
        scrollEdgeEffects: { top: "soft" },
      }} />
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button
          icon={favorited ? "star.fill" : "star"}
          tintColor={favorited ? "#F59E0B" : colors.textSecondary}
          onPress={() => gymId && toggle(gymId)}
        />
      </Stack.Toolbar>

      <FlatList
        style={{ flex: 1, backgroundColor: colors.background }}
        data={[]}
        keyExtractor={() => "gym-community-empty"}
        renderItem={() => null}
        ListFooterComponent={content}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      />
    </View>
  );
}
