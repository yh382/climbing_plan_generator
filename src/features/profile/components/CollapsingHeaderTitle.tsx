// src/features/profile/components/CollapsingHeaderTitle.tsx
// Window BG — Profile collapsing nav: mini-avatar + name row that fades
// in over the nav bar as the user scrolls. Mirrors Twitter / Instagram
// profile collapse. Plugged via navigation.setOptions({ headerTitle }).
//
// BX (2026-06-07) — driven by `pinFadeProgress` shared value published from
// ProfileChromeRoot's useAnimatedReaction (0 → 1 as the hero approaches pin).
// All scroll arithmetic lives in ProfileChromeRoot (no measure()).

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  interpolate,
  Extrapolation,
  type SharedValue,
} from "react-native-reanimated";

import { theme } from "@/lib/theme";
import { useThemeColors } from "@/lib/useThemeColors";

type Props = {
  /** 0 = bar at rest (title invisible) → 1 = bar pinned (title shown). */
  pinFadeProgress: SharedValue<number>;
  avatarUrl: string | null;
  name: string;
};

export default function CollapsingHeaderTitle({
  pinFadeProgress,
  avatarUrl,
  name,
}: Props) {
  const colors = useThemeColors();
  const styles = createStyles(colors);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: pinFadeProgress.value,
    transform: [
      {
        scale: interpolate(
          pinFadeProgress.value,
          [0, 1],
          [0.85, 1],
          Extrapolation.CLAMP,
        ),
      },
    ],
  }));

  return (
    <Animated.View style={[styles.row, containerStyle]}>
      {avatarUrl ? (
        <Image source={{ uri: avatarUrl }} style={styles.avatar} contentFit="cover" />
      ) : (
        <View style={[styles.avatar, styles.avatarFallback]}>
          <Ionicons name="person" size={16} color={colors.textTertiary} />
        </View>
      )}
      <Text style={styles.name} numberOfLines={1}>
        {name}
      </Text>
    </Animated.View>
  );
}

const createStyles = (colors: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      maxWidth: 220,
    },
    avatar: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: colors.backgroundSecondary,
    },
    avatarFallback: {
      alignItems: "center",
      justifyContent: "center",
    },
    name: {
      fontSize: 15,
      fontFamily: theme.fonts.bold,
      color: colors.textPrimary,
    },
  });
