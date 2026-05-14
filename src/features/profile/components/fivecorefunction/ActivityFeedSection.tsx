// src/features/profile/components/fivecorefunction/ActivityFeedSection.tsx
// Window BG — Profile Activity tab content.
// Composes the 3 sub-sections (Media / Sessions / Climbs) under typed
// sub-headers with right-aligned "View all (N+|N)" deep-link. Media +
// Sessions share a single fetchUserActivity call; Climbs is BE-driven
// via useUserAscents and only renders for self profile.

import React, { useEffect, useMemo } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { theme } from "@/lib/theme";
import { useThemeColors } from "@/lib/useThemeColors";
import { useSettings } from "@/contexts/SettingsContext";
import { useCommunityStore } from "@/store/useCommunityStore";
import { useUserAscents } from "@/features/profile/hooks/useUserAscents";

import ProfileMediaGrid from "./ProfileMediaGrid";
import ProfileSessionList from "./ProfileSessionList";
import ProfileLogList from "./ProfileLogList";

type Props = {
  userId: string;
  viewMode: "self" | "other";
};

type SubSectionProps = {
  title: string;
  viewAllLabel: string | null;
  onViewAll?: () => void;
  children: React.ReactNode;
};

function SubSection({ title, viewAllLabel, onViewAll, children }: SubSectionProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createSubSectionStyles(colors), [colors]);
  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        {viewAllLabel && onViewAll ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`View all ${title}`}
            onPress={onViewAll}
            hitSlop={8}
            style={({ pressed }) => [
              styles.viewAllBtn,
              pressed && styles.viewAllBtnPressed,
            ]}
          >
            <Text style={styles.viewAllText}>{viewAllLabel}</Text>
            <Ionicons
              name="chevron-forward"
              size={13}
              color={colors.textSecondary}
            />
          </Pressable>
        ) : null}
      </View>
      <View style={styles.body}>{children}</View>
    </View>
  );
}

function formatCount(loadedCount: number, hasMore: boolean): string | null {
  if (loadedCount <= 0) return null;
  return hasMore ? `${loadedCount}+` : String(loadedCount);
}

export default function ActivityFeedSection({ userId, viewMode }: Props) {
  const { tr } = useSettings();
  const router = useRouter();

  const cache = useCommunityStore((s) => s.userActivityByUserId[userId]);
  const fetchUserActivity = useCommunityStore((s) => s.fetchUserActivity);

  // Plain useEffect with `[userId, fetchUserActivity]` only — never `cache`
  // (γ1.2 06fe322 lesson: every set() emits a new cache reference and
  // re-fires the effect). The action itself short-circuits when the cache
  // is already populated so this is safe to call eagerly.
  useEffect(() => {
    if (!userId) return;
    if (!cache) {
      fetchUserActivity(userId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, fetchUserActivity]);

  // Climbs sub-section is self-only — useUserAscents drives both render
  // count + viewAllCount; we still call the hook unconditionally to keep
  // hook order stable across viewMode flips.
  const ascentsState = useUserAscents(viewMode === "self" ? userId : undefined, {
    locationType: "all",
    wallType: "all",
  });

  // Derived counts from the shared activity cache.
  const mediaItems = useMemo(
    () => (cache?.items ?? []).filter((p) => Array.isArray(p.media) && p.media.length > 0),
    [cache?.items],
  );
  const sessionItems = useMemo(
    () => (cache?.items ?? []).filter((p) => p.attachment?.type === "session"),
    [cache?.items],
  );

  const hasMoreActivity = !!cache && !cache.exhausted;
  const mediaCountLabel = formatCount(mediaItems.length, hasMoreActivity);
  const sessionCountLabel = formatCount(sessionItems.length, hasMoreActivity);
  const climbsCountLabel = formatCount(ascentsState.ascents.length, ascentsState.hasMore);

  return (
    <View>
      <SubSection
        title={tr("媒体", "Media")}
        viewAllLabel={mediaCountLabel ? `${tr("查看全部", "View all")} (${mediaCountLabel})` : null}
        onViewAll={
          mediaCountLabel
            ? () =>
                router.push({
                  pathname: "/community/media-grid",
                  params: { userId },
                } as any)
            : undefined
        }
      >
        <ProfileMediaGrid userId={userId} viewMode={viewMode} />
      </SubSection>

      <SubSection
        title={tr("训练 Session", "Sessions")}
        viewAllLabel={sessionCountLabel ? `${tr("查看全部", "View all")} (${sessionCountLabel})` : null}
        onViewAll={
          sessionCountLabel
            ? () =>
                router.push({
                  pathname: "/users/[userId]/sessions",
                  params: { userId },
                } as any)
            : undefined
        }
      >
        <ProfileSessionList userId={userId} viewMode={viewMode} />
      </SubSection>

      {viewMode === "self" ? (
        <SubSection
          title={tr("攀爬记录", "Climbs")}
          viewAllLabel={climbsCountLabel ? `${tr("查看全部", "View all")} (${climbsCountLabel})` : null}
          onViewAll={
            climbsCountLabel
              ? () =>
                  router.push({
                    pathname: "/users/[userId]/ascents",
                    params: { userId },
                  } as any)
              : undefined
          }
        >
          <ProfileLogList userId={userId} viewMode={viewMode} />
        </SubSection>
      ) : null}
    </View>
  );
}

const createSubSectionStyles = (colors: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    wrap: {
      marginTop: 16,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingBottom: 8,
    },
    title: {
      fontSize: 13,
      fontFamily: theme.fonts.bold,
      color: colors.textSecondary,
      letterSpacing: 0.6,
      textTransform: "uppercase",
    },
    viewAllBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 2,
    },
    viewAllBtnPressed: {
      opacity: 0.6,
    },
    viewAllText: {
      fontSize: 13,
      fontFamily: theme.fonts.medium,
      color: colors.textSecondary,
    },
    body: {},
  });
