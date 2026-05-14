// src/features/profile/components/fivecorefunction/ProfileLogList.tsx
// Window BG — Profile Activity: Climbs sub-section.
// Self-only utility view: 3 most recent aggregated climbs from BE
// (useUserAscents hook — same data source as /users/[userId]/ascents).
// viewMode="other" renders nothing — Climbs are self-only, mirroring the
// Lists segment's β decision.
//
// Plan deviated: original draft said useLogsStore().logs, but LogEntry is
// aggregated count (no name/media/note), unrenderable by ClimbItemCard.
// useUserAscents returns AggregatedClimbItem shape directly.

import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useRouter } from "expo-router";

import { theme } from "@/lib/theme";
import { useThemeColors } from "@/lib/useThemeColors";
import { useSettings } from "@/contexts/SettingsContext";
import ClimbItemCard from "@/components/shared/ClimbItemCard";
import { useUserAscents } from "@/features/profile/hooks/useUserAscents";

type Props = {
  userId: string;
  viewMode: "self" | "other";
};

const MAX_PREVIEW = 3;

export default function ProfileLogList({ userId, viewMode }: Props) {
  const colors = useThemeColors();
  const { tr } = useSettings();
  const router = useRouter();
  const styles = useMemo(() => createStyles(colors), [colors]);

  // Hook must be called unconditionally (rules-of-hooks); early-return is
  // BELOW the hook calls. Parent caller (ActivityFeedSection) gates the
  // Climbs SubSection on viewMode==="self" already, but pass `undefined`
  // when viewMode==="other" so the hook's network fetch is suppressed
  // even if this component is ever rendered without that gate.
  const ascentsState = useUserAscents(
    viewMode === "self" ? userId : undefined,
    { locationType: "all", wallType: "all" },
  );
  const ascents = useMemo(
    () => ascentsState.ascents.slice(0, MAX_PREVIEW),
    [ascentsState.ascents],
  );

  // Hooks complete — safe to early-return.
  if (viewMode === "other") return null;

  if (ascentsState.loading && ascents.length === 0) {
    return <View style={styles.empty} />;
  }

  if (ascents.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyTitle}>
          {tr("还没有攀爬记录", "No climbs yet")}
        </Text>
        <Text style={styles.emptyHint}>
          {tr(
            "记录一次攀登，会出现在这里",
            "Log a climb — it will appear here",
          )}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.list}>
      {ascents.map((item) => (
        <ClimbItemCard
          key={item.routeKey}
          item={item}
          variant="single"
          showFeel
          tr={tr}
          note={item.note}
          onPress={() => {
            if (item.outdoor_route_id) {
              router.push({
                pathname: "/outdoor/outdoor-route-detail",
                params: { id: item.outdoor_route_id },
              } as any);
              return;
            }
            if (item.gym_route_id) {
              router.push({
                pathname: "/gym/route/[routeId]",
                params: { routeId: item.gym_route_id },
              } as any);
              return;
            }
            // No catalog binding — fall through silently.
          }}
        />
      ))}
    </View>
  );
}

const createStyles = (colors: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    list: {
      gap: 10,
    },
    empty: {
      paddingVertical: 24,
      paddingHorizontal: 24,
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
    },
    emptyTitle: {
      color: colors.textSecondary,
      fontSize: 13,
      fontFamily: theme.fonts.medium,
    },
    emptyHint: {
      color: colors.textTertiary,
      fontSize: 12,
      fontFamily: theme.fonts.regular,
      textAlign: "center",
      maxWidth: 240,
    },
  });
