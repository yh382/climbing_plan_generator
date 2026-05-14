// src/features/profile/components/fivecorefunction/MiniSessionCard.tsx
// Window BG — Profile Activity: compact session card for the profile
// Activity tab's Sessions sub-section. Single-row title + 1 KPI text row.
// No ring / no pyramid / no caption / no actions — those live in the full
// SessionCard (BF_polished) which renders in the community feed and
// /community/post/[postId] detail screen.

import React, { useMemo } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { theme } from "@/lib/theme";
import { useThemeColors } from "@/lib/useThemeColors";
import { useSettings } from "@/contexts/SettingsContext";
import type { FeedPost } from "@/types/community";

type Props = {
  post: FeedPost;
  onPress: () => void;
};

function formatDuration(min: number): string {
  if (min <= 0) return "0m";
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function formatTimeAgo(iso: string, tr: (zh: string, en: string) => string): string {
  const t = new Date(iso).getTime();
  if (!t) return "";
  const diff = Date.now() - t;
  const m = Math.floor(diff / 60000);
  if (m < 1) return tr("刚刚", "now");
  if (m < 60) return tr(`${m} 分钟前`, `${m}m ago`);
  const h = Math.floor(m / 60);
  if (h < 24) return tr(`${h} 小时前`, `${h}h ago`);
  const d = Math.floor(h / 24);
  if (d < 7) return tr(`${d} 天前`, `${d}d ago`);
  const w = Math.floor(d / 7);
  if (w < 5) return tr(`${w} 周前`, `${w}w ago`);
  const months = Math.floor(d / 30);
  if (months < 12) return tr(`${months} 月前`, `${months}mo ago`);
  return tr(`${Math.floor(d / 365)} 年前`, `${Math.floor(d / 365)}y ago`);
}

export default function MiniSessionCard({ post, onPress }: Props) {
  const colors = useThemeColors();
  const { tr } = useSettings();
  const styles = useMemo(() => createStyles(colors), [colors]);

  // Read full nested attachment_meta passthrough (BF_polished shape).
  const meta = post.attachment?.meta ?? {};
  const summary = (meta.summary ?? {}) as {
    total_sends?: number;
    total_attempts?: number;
    best_grade?: string;
  };
  const attempts = summary.total_attempts ?? 0;
  const sends = summary.total_sends ?? 0;
  const bestGrade = summary.best_grade ?? "—";

  const durationMin =
    (meta.active_duration_minutes as number | undefined) ??
    (meta.duration_minutes as number | undefined) ??
    0;

  const gymName =
    (meta.gym_name as string | undefined) ??
    post.gymName ??
    tr("攀岩馆", "Gym");
  const locationType = meta.location_type as string | undefined;
  const isOutdoor = locationType === "outdoor";
  const locationLabel = isOutdoor ? tr("户外", "Outdoor") : tr("室内", "Indoor");
  const timeAgo = formatTimeAgo(post.timestamp, tr);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={tr(`${gymName} session`, `${gymName} session`)}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      <View style={styles.titleRow}>
        <Ionicons
          name={isOutdoor ? "leaf-outline" : "barbell-outline"}
          size={16}
          color={colors.textSecondary}
        />
        <View style={styles.titleTextWrap}>
          <Text style={styles.titleText} numberOfLines={1}>
            {gymName}
          </Text>
          <Text style={styles.subText} numberOfLines={1}>
            {locationLabel}
            {durationMin > 0 ? ` · ${formatDuration(durationMin)}` : ""}
            {timeAgo ? ` · ${timeAgo}` : ""}
          </Text>
        </View>
      </View>

      <Text style={styles.kpiRow} numberOfLines={1}>
        <Text style={styles.kpiNum}>{attempts}</Text>
        {tr(" 次尝试 · ", " attempts · ")}
        <Text style={styles.kpiNum}>{sends}</Text>
        {tr(" 次完攀 · ", " sends · ")}
        {tr("最高 ", "best ")}
        <Text style={styles.kpiNum}>{bestGrade}</Text>
      </Text>
    </Pressable>
  );
}

const createStyles = (colors: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    card: {
      paddingHorizontal: 14,
      paddingVertical: 12,
      marginHorizontal: 12,
      marginBottom: 8,
      borderRadius: 14,
      backgroundColor: colors.backgroundSecondary,
      gap: 8,
    },
    cardPressed: {
      opacity: 0.7,
    },
    titleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    titleTextWrap: {
      flex: 1,
      minWidth: 0,
    },
    titleText: {
      fontSize: 15,
      fontFamily: theme.fonts.bold,
      color: colors.textPrimary,
    },
    subText: {
      marginTop: 2,
      fontSize: 12,
      fontFamily: theme.fonts.regular,
      color: colors.textSecondary,
    },
    kpiRow: {
      fontSize: 13,
      fontFamily: theme.fonts.regular,
      color: colors.textSecondary,
    },
    kpiNum: {
      fontFamily: theme.fonts.bold,
      color: colors.textPrimary,
    },
  });
