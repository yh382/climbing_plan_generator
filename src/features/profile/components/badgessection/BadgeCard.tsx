// src/features/profile/components/badgessection/BadgeCard.tsx

import React, { memo } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import type { Badge } from "./types";

type Props = {
  badge: Badge;
  size: number;
  onPress?: (badge: Badge) => void;
};

function clamp01(n: number) {
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function BadgeCard({ badge, size, onPress }: Props) {
  const locked = badge.status === "locked";
  const progress = clamp01(badge.progress ?? 0);

  const iconText = locked ? "🪨" : "🏅";

  return (
    <Pressable
      onPress={() => onPress?.(badge)}
      style={({ pressed }) => [
        styles.card,
        { width: size, height: size },
        locked ? styles.locked : styles.unlocked,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.iconWrap}>
        <Text style={[styles.icon, locked && styles.lockedIcon]}>{iconText}</Text>
      </View>

      <Text numberOfLines={1} style={[styles.title, locked && styles.lockedTitle]}>
        {badge.title}
      </Text>

      {locked ? (
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
        </View>
      ) : (
        <View style={styles.progressSpacer} />
      )}
    </Pressable>
  );
}

export default memo(BadgeCard);

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 9,
    justifyContent: "space-between",
    borderWidth: 1,
    backgroundColor: "#fff",
  },
  unlocked: {
    borderColor: "rgba(0,0,0,0.06)",
  },
  locked: {
    borderColor: "rgba(0,0,0,0.05)",
    opacity: 0.8,
  },
  pressed: {
    transform: [{ scale: 0.985 }],
  },

  iconWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  icon: {
    fontSize: 30,
  },
  lockedIcon: {
    opacity: 0.45,
  },

  title: {
    fontSize: 12,
    fontWeight: "700",
    color: "#111",
    textAlign: "center",
    marginTop: 6,
  },
  lockedTitle: {
    color: "rgba(17,17,17,0.55)",
  },

  progressTrack: {
    height: 3,
    borderRadius: 999,
    overflow: "hidden",
    backgroundColor: "rgba(0,0,0,0.08)",
    marginTop: 8,
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  progressSpacer: {
    height: 3,
    marginTop: 8,
    opacity: 0,
  },
});
