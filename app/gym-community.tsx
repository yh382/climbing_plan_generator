import React from "react";
import { View } from "react-native";
import { useLocalSearchParams, Stack } from "expo-router";

import GymCommunityTabs from "../src/features/community/gyms/GymCommunityTabs";
import { useGymFavoriteToggle } from "../src/features/gyms/hooks";
import { useThemeColors } from "../src/lib/useThemeColors";

export default function GymCommunityPage() {
  const { gymId, gymName } = useLocalSearchParams<{
    gymId: string;
    gymName?: string;
  }>();
  const colors = useThemeColors();
  const { isFavorited, toggle } = useGymFavoriteToggle();
  const favorited = gymId ? isFavorited(gymId) : false;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack.Screen options={{
        title: gymName || "Gym Community",
      }} />
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button
          icon={favorited ? "star.fill" : "star"}
          tintColor={favorited ? "#F59E0B" : colors.textSecondary}
          onPress={() => gymId && toggle(gymId)}
        />
      </Stack.Toolbar>

      {gymId ? (
        <GymCommunityTabs
          gymId={gymId}
          isFavorited={favorited}
          onToggleFavorite={() => gymId && toggle(gymId)}
        />
      ) : null}
    </View>
  );
}
