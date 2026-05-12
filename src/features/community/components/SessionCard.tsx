// src/features/community/components/SessionCard.tsx
// Window BF_polished — full session card for community feed (Strava-mode
// auto-share). Renders the per-session aggregate: dual ring (time + sends),
// Tops Rate ring, and grade pyramid — fully derived from
// post.attachment.meta (BE auto_share.create_session_post stamps everything
// at create time so this view is a pure read with zero cross-store fetch).
//
// Rings + pyramid are reused from the daily-summary feature so visual stays
// consistent with the user's own daily summary page.

import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { theme } from "@/lib/theme";
import { useThemeColors } from "@/lib/useThemeColors";
import { useSettings } from "@/contexts/SettingsContext";
import RingsPage from "@/features/dailysummary/RingsPage";
import DailyGradePyramid from "@/features/dailysummary/DailyGradePyramid";
import { FeedPost } from "@/types/community";

type Props = {
  post: FeedPost;
};

type LogGradeRow = { grade: string; sends: number; attempts: number };

function formatDuration(min: number): string {
  if (min <= 0) return "0m";
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export default function SessionCard({ post }: Props) {
  const colors = useThemeColors();
  const { tr } = useSettings();
  const styles = useMemo(() => createStyles(colors), [colors]);

  // attachment_meta lives on the polymorphic field — see auto_share.create_session_post
  // for the full shape. All keys here are optional so legacy / partial rows
  // still render without crashing.
  const meta = post.attachment?.meta ?? {};
  const summary = (meta.summary ?? {}) as {
    total_sends?: number;
    total_attempts?: number;
    best_grade?: string;
  };
  const sends = summary.total_sends ?? 0;
  const attempts = summary.total_attempts ?? 0;
  // Prefer active_duration_minutes (B2 authoritative) — fall back to wall-clock
  // duration_minutes for pre-B2 sessions; finally 0 to keep the ring 0% rather
  // than NaN.
  const timeOnWallMin =
    (meta.active_duration_minutes as number | undefined) ??
    (meta.duration_minutes as number | undefined) ??
    0;
  const timeOnWallPct = Math.min(1, timeOnWallMin / 120); // 2h goal — same as RingsPage daily
  // RingsPage expects topsRatePct as 0-100 (not 0-1) — it both displays the
  // raw value as `${pct}%` and divides by 100 internally for the ring stroke.
  const topsRatePct = attempts > 0 ? Math.round((sends / attempts) * 100) : 0;
  const gradeData: LogGradeRow[] = Array.isArray(meta.log_grades) ? meta.log_grades : [];

  const gymName = (meta.gym_name as string | undefined) ?? post.gymName ?? tr("攀岩馆", "Gym");
  const locationType = meta.location_type as string | undefined;
  const isOutdoor = locationType === "outdoor";

  return (
    <View style={styles.wrap}>
      {/* Title row — gym + indoor/outdoor + duration */}
      <View style={styles.titleRow}>
        <Ionicons
          name={isOutdoor ? "leaf-outline" : "barbell-outline"}
          size={16}
          color={colors.textSecondary}
        />
        <Text style={styles.titleText} numberOfLines={1}>
          {gymName}
        </Text>
        <Text style={styles.titleSub} numberOfLines={1}>
          {isOutdoor ? tr("户外", "Outdoor") : tr("室内", "Indoor")}
          {timeOnWallMin > 0 ? ` · ${formatDuration(timeOnWallMin)} ${tr("训练", "session")}` : ""}
        </Text>
      </View>

      {/* Rings — direct reuse from daily-summary so the visual matches the
          user's own day view 1:1. */}
      <RingsPage
        timeOnWallMin={timeOnWallMin}
        timeOnWallPct={timeOnWallPct}
        topsRatePct={topsRatePct}
        sends={sends}
        attempts={attempts}
        quickLogCount={0}
      />

      {/* Grade pyramid — reused as-is. Empty data renders the placeholder
          card; we still mount it so the section is consistent. */}
      <View style={styles.pyramidWrap}>
        <DailyGradePyramid data={gradeData} />
      </View>
    </View>
  );
}

const createStyles = (colors: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    wrap: {
      paddingHorizontal: 16,
      paddingTop: 4,
      paddingBottom: 4,
      marginBottom: 8,
      gap: 12,
    },
    titleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    titleText: {
      fontSize: 15,
      fontFamily: theme.fonts.bold,
      color: colors.textPrimary,
      maxWidth: "55%",
    },
    titleSub: {
      flex: 1,
      fontSize: 13,
      fontFamily: theme.fonts.regular,
      color: colors.textSecondary,
    },
    pyramidWrap: {
      marginTop: 4,
    },
  });
