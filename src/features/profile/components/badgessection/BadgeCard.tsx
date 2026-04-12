// src/features/profile/components/badgessection/BadgeCard.tsx
// Badge card — used in the full badges page (AllBadgesPage).
//
// Unlocked: badge image + subtle tier border glow + title + awarded date
// Locked:   dimmed image inside circular progress ring + title + description + "3/10"

import { memo, useMemo } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Image } from "expo-image";
import Svg, { Circle as SvgCircle } from "react-native-svg";
import { Ionicons } from "@expo/vector-icons";

import { useThemeColors } from "@/lib/useThemeColors";
import { theme } from "@/lib/theme";
import type { ThemeColors } from "@/lib/theme";
import type { Badge, BadgeTier } from "./types";
import { useSettings } from "src/contexts/SettingsContext";

// ── Tier palette ──

const TIER_COLORS: Record<string, { border: string; fill: string }> = {
  bronze: { border: "#CD7F32", fill: "rgba(205,127,50,0.45)" },
  silver: { border: "#A0A0A0", fill: "rgba(160,160,160,0.45)" },
  gold: { border: "#DAA520", fill: "rgba(218,165,32,0.45)" },
  diamond: { border: "#6ECBF5", fill: "rgba(110,203,245,0.45)" },
};

function tierColor(tier?: BadgeTier): string {
  if (!tier) return "#888888";
  return TIER_COLORS[tier]?.border ?? "#888888";
}

function clamp01(n: number) {
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

// ── Circular progress ring (SVG) ──

function ProgressRing({
  size,
  progress,
  color,
  trackColor,
}: {
  size: number;
  progress: number;
  color: string;
  trackColor: string;
}) {
  const strokeWidth = 2.5;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - clamp01(progress));
  const center = size / 2;

  return (
    <Svg
      width={size}
      height={size}
      style={StyleSheet.absoluteFill}
    >
      {/* Track */}
      <SvgCircle
        cx={center}
        cy={center}
        r={radius}
        stroke={trackColor}
        strokeWidth={strokeWidth}
        fill="none"
      />
      {/* Fill */}
      {progress > 0 && (
        <SvgCircle
          cx={center}
          cy={center}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${circumference}`}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${center} ${center})`}
        />
      )}
    </Svg>
  );
}

// ── Badge icon with fallback ──

function BadgeImage({
  badge,
  size,
  locked,
}: {
  badge: Badge;
  size: number;
  locked: boolean;
}) {
  if (badge.iconUrl) {
    return (
      <Image
        source={{ uri: badge.iconUrl }}
        style={{
          width: size,
          height: size,
          borderRadius: size * 0.15,
          opacity: locked ? 0.3 : 1,
        }}
        contentFit="contain"
      />
    );
  }

  // Fallback: trophy icon
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.15,
        backgroundColor: locked ? "rgba(150,150,150,0.15)" : "rgba(48,110,111,0.15)",
        alignItems: "center",
        justifyContent: "center",
        opacity: locked ? 0.5 : 1,
      }}
    >
      <Ionicons name="trophy" size={size * 0.4} color={locked ? "#999" : "#306E6F"} />
    </View>
  );
}

// ── Main component ──

type Props = {
  badge: Badge;
  size: number;
  onPress?: (badge: Badge) => void;
  onLongPress?: (badge: Badge) => void;
};

function BadgeCard({ badge, size, onPress, onLongPress }: Props) {
  const colors = useThemeColors();
  const { lang } = useSettings();
  const tr = (zh: string, en: string) => (lang === "zh" ? zh : en);
  const s = useMemo(() => createStyles(colors), [colors]);
  const locked = badge.status === "locked";
  const progress = clamp01(badge.progress ?? 0);
  const tier = badge.tier as BadgeTier;
  const tColor = tierColor(tier);

  // Image area is 75% of card width
  const imgAreaSize = Math.floor(size * 0.75);
  const imgSize = Math.floor(imgAreaSize * 0.78);

  return (
    <Pressable
      onPress={() => onPress?.(badge)}
      onLongPress={() => onLongPress?.(badge)}
      style={({ pressed }) => [
        s.card,
        { width: size },
        pressed && s.pressed,
      ]}
    >
      {/* Image area with optional ring / border */}
      <View style={[s.imgArea, { width: imgAreaSize, height: imgAreaSize }]}>
        {locked ? (
          // Locked: circular progress ring wrapping the dimmed image
          <>
            <ProgressRing
              size={imgAreaSize}
              progress={progress}
              color={tColor}
              trackColor={colors.border}
            />
            <View style={s.imgCenter}>
              <BadgeImage badge={badge} size={imgSize} locked />
            </View>
          </>
        ) : (
          // Unlocked: subtle tier-colored border glow
          <View
            style={[
              s.imgCenter,
              {
                shadowColor: tColor,
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.35,
                shadowRadius: 8,
              },
            ]}
          >
            <BadgeImage badge={badge} size={imgSize} locked={false} />
          </View>
        )}
      </View>

      {/* Title */}
      <Text
        numberOfLines={1}
        style={[s.title, locked && { color: colors.textTertiary }]}
      >
        {badge.title}
      </Text>

      {/* Bottom info: locked = description + fraction | unlocked = date */}
      {locked ? (
        <View style={s.lockedInfo}>
          {badge.description && (
            <Text numberOfLines={2} style={s.description}>
              {badge.description}
            </Text>
          )}
          {typeof badge.threshold === "number" && badge.threshold > 0 && (
            <Text style={[s.fraction, { color: tColor }]}>
              {badge.currentValue ?? 0} / {badge.threshold}
            </Text>
          )}
          {typeof badge.rarity === "number" && badge.rarity > 0 && (
            <Text style={s.rarity}>
              {badge.rarity < 1 ? "<1" : Math.round(badge.rarity)}% {tr("已获得", "earned")}
            </Text>
          )}
        </View>
      ) : (
        <View style={s.lockedInfo}>
          {badge.awardedAt && (
            <Text style={s.awardedDate}>
              {new Date(badge.awardedAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </Text>
          )}
          {typeof badge.rarity === "number" && badge.rarity > 0 && (
            <Text style={s.rarity}>
              {badge.rarity < 1 ? "<1" : Math.round(badge.rarity)}% {tr("已获得", "earned")}
            </Text>
          )}
        </View>
      )}
    </Pressable>
  );
}

export default memo(BadgeCard);

// ── Styles ──

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    card: {
      alignItems: "center",
      paddingBottom: 12,
    },
    pressed: {
      opacity: 0.8,
    },

    imgArea: {
      alignItems: "center",
      justifyContent: "center",
    },
    imgCenter: {
      position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
      alignItems: "center",
      justifyContent: "center",
    },

    title: {
      fontSize: 13,
      fontWeight: "700",
      fontFamily: theme.fonts.bold,
      color: colors.textPrimary,
      textAlign: "center",
      marginTop: 6,
      paddingHorizontal: 4,
    },

    lockedInfo: {
      alignItems: "center",
      marginTop: 4,
      paddingHorizontal: 4,
      gap: 2,
    },
    description: {
      fontSize: 10,
      fontFamily: theme.fonts.regular,
      color: colors.textSecondary,
      textAlign: "center",
      lineHeight: 13,
    },
    fraction: {
      fontSize: 11,
      fontWeight: "600",
      fontFamily: theme.fonts.medium,
    },

    awardedDate: {
      fontSize: 10,
      fontFamily: theme.fonts.regular,
      color: colors.textSecondary,
      textAlign: "center",
      marginTop: 3,
    },
    rarity: {
      fontSize: 10,
      fontFamily: theme.fonts.regular,
      color: colors.textTertiary,
      textAlign: "center",
      marginTop: 2,
    },
  });
}
