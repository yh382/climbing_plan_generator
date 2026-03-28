// src/features/profile/components/badgessection/BadgeCard.tsx

import React, { memo, useMemo } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { useThemeColors } from "@/lib/useThemeColors";
import type { ThemeColors } from "@/lib/theme";
import type { Badge, BadgeTier } from "./types";

type Props = {
  badge: Badge;
  size: number;
  onPress?: (badge: Badge) => void;
};

const TIER_COLORS: Record<string, { border: string; fill: string; emoji: string }> = {
  bronze: { border: "#CD7F32", fill: "rgba(205,127,50,0.5)", emoji: "\uD83E\uDD49" },
  silver: { border: "#A0A0A0", fill: "rgba(160,160,160,0.5)", emoji: "\uD83E\uDD48" },
  gold: { border: "#DAA520", fill: "rgba(218,165,32,0.5)", emoji: "\uD83E\uDD47" },
  diamond: { border: "#6ECBF5", fill: "rgba(110,203,245,0.5)", emoji: "\uD83D\uDC8E" },
};

function clamp01(n: number) {
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function BadgeCard({ badge, size, onPress }: Props) {
  const colors = useThemeColors();
  const s = useMemo(() => createStyles(colors), [colors]);
  const locked = badge.status === "locked";
  const progress = clamp01(badge.progress ?? 0);
  const tier = badge.tier as BadgeTier;
  const tierStyle = tier ? TIER_COLORS[tier] : null;

  const iconText = locked ? "\uD83E\uDEA8" : "\uD83C\uDFC5";

  return (
    <Pressable
      onPress={() => onPress?.(badge)}
      style={({ pressed }) => [
        s.card,
        { width: size },
        locked && s.locked,
        pressed && s.pressed,
      ]}
    >
      <View style={s.iconWrap}>
        {badge.iconUrl ? (
          <Image
            source={{ uri: badge.iconUrl }}
            style={[s.badgeImage, locked && s.lockedIcon]}
            contentFit="contain"
          />
        ) : (
          <Text style={[s.icon, locked && s.lockedIcon]}>{iconText}</Text>
        )}
      </View>

      <Text numberOfLines={1} style={[s.title, locked && s.lockedTitle, { paddingHorizontal: 2 }]}>
        {badge.title}
      </Text>

      {locked ? (
        <View style={s.progressTrack}>
          <View
            style={[
              s.progressFill,
              { width: `${progress * 100}%` },
              tierStyle && { backgroundColor: tierStyle.fill },
            ]}
          />
        </View>
      ) : badge.awardedAt ? (
        <Text style={s.awardedDate}>
          {new Date(badge.awardedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
        </Text>
      ) : (
        <View style={s.progressSpacer} />
      )}
    </Pressable>
  );
}

export default memo(BadgeCard);

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    card: {
      paddingBottom: 6,
      alignItems: "center",
    },
    locked: {
      opacity: 0.7,
    },
    pressed: {
      transform: [{ scale: 0.985 }],
    },

    iconWrap: {
      width: "100%",
      aspectRatio: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    icon: {
      fontSize: 40,
    },
    badgeImage: {
      width: "100%",
      height: "100%",
      backgroundColor: "transparent",
    },
    lockedIcon: {
      opacity: 0.35,
    },

    title: {
      fontSize: 11,
      fontWeight: "700",
      color: colors.textPrimary,
      textAlign: "center",
      marginTop: 4,
    },
    lockedTitle: {
      color: colors.textTertiary,
    },

    progressTrack: {
      width: "80%",
      height: 3,
      borderRadius: 999,
      overflow: "hidden",
      backgroundColor: colors.border,
      marginTop: 4,
    },
    progressFill: {
      height: "100%",
      borderRadius: 999,
      backgroundColor: colors.textSecondary,
    },
    progressSpacer: {
      height: 3,
      marginTop: 4,
      opacity: 0,
    },
    awardedDate: {
      fontSize: 9,
      color: colors.textSecondary,
      textAlign: "center",
      marginTop: 2,
    },
  });
}
