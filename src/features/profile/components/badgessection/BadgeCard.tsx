// src/features/profile/components/badgessection/BadgeCard.tsx

import React, { memo } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Image } from "expo-image";
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
  const locked = badge.status === "locked";
  const progress = clamp01(badge.progress ?? 0);
  const tier = badge.tier as BadgeTier;
  const tierStyle = tier ? TIER_COLORS[tier] : null;

  const iconText = locked ? "\uD83E\uDEA8" : "\uD83C\uDFC5";

  return (
    <Pressable
      onPress={() => onPress?.(badge)}
      style={({ pressed }) => [
        styles.card,
        { width: size },
        locked && styles.locked,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.iconWrap}>
        {badge.iconUrl ? (
          <Image
            source={{ uri: badge.iconUrl }}
            style={[styles.badgeImage, locked && styles.lockedIcon]}
            contentFit="contain"
          />
        ) : (
          <Text style={[styles.icon, locked && styles.lockedIcon]}>{iconText}</Text>
        )}
      </View>

      <Text numberOfLines={1} style={[styles.title, locked && styles.lockedTitle, { paddingHorizontal: 2 }]}>
        {badge.title}
      </Text>

      {locked ? (
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              { width: `${progress * 100}%` },
              tierStyle && { backgroundColor: tierStyle.fill },
            ]}
          />
        </View>
      ) : badge.awardedAt ? (
        <Text style={styles.awardedDate}>
          {new Date(badge.awardedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
        </Text>
      ) : (
        <View style={styles.progressSpacer} />
      )}
    </Pressable>
  );
}

export default memo(BadgeCard);

const styles = StyleSheet.create({
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
    color: "#111",
    textAlign: "center",
    marginTop: 4,
  },
  lockedTitle: {
    color: "rgba(17,17,17,0.5)",
  },

  progressTrack: {
    width: "80%",
    height: 3,
    borderRadius: 999,
    overflow: "hidden",
    backgroundColor: "rgba(0,0,0,0.08)",
    marginTop: 4,
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  progressSpacer: {
    height: 3,
    marginTop: 4,
    opacity: 0,
  },
  awardedDate: {
    fontSize: 9,
    color: "rgba(17,17,17,0.4)",
    textAlign: "center",
    marginTop: 2,
  },
});
