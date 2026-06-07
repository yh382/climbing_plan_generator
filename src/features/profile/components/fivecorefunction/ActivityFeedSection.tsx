// src/features/profile/components/fivecorefunction/ActivityFeedSection.tsx
// Window BG — Profile Activity tab content.
// Composes the 3 sub-sections (Media / Sessions / Climbs) under typed
// sub-headers with right-aligned "View all (N+|N)" deep-link. Media +
// Sessions share a single fetchUserActivity call; Climbs is BE-driven
// via useUserAscents and only renders for self profile.

import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import Animated from "react-native-reanimated";

import { theme } from "@/lib/theme";
import { useThemeColors } from "@/lib/useThemeColors";
import { useSettings } from "@/contexts/SettingsContext";
import { useCommunityStore } from "@/store/useCommunityStore";
import { useUserAscents } from "@/features/profile/hooks/useUserAscents";
import type { ProfileChromePageHandle } from "@/features/profile/components/ProfileChromeRoot.types";

import ProfileMediaGrid from "./ProfileMediaGrid";
import ProfileSessionList from "./ProfileSessionList";
import ProfileLogList from "./ProfileLogList";
import {
  MediaGridSkeleton,
  SessionListSkeleton,
} from "./ActivitySkeleton";

type Props = {
  userId: string;
  viewMode: "self" | "other";
  /**
   * Window BX — when mounted inside ProfileChromeRoot, this tab owns its
   * own scroller. The handle's reanimated plumbing is spread onto the
   * wrapping Animated.ScrollView. When absent (legacy / standalone), the
   * section renders a plain View and the caller provides scrolling.
   */
  pageHandle?: ProfileChromePageHandle;
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

export default function ActivityFeedSection({ userId, viewMode, pageHandle }: Props) {
  const { tr } = useSettings();
  const router = useRouter();
  const colors = useThemeColors();

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

  // BG-FU — skeleton visibility logic. Two conditions OR-ed:
  // (1) Genuine loading state: no cache yet OR loading + empty
  // (2) Minimum display time floor: 200ms after mount, so the skeleton
  //     is perceivable even when the network round-trip resolves in
  //     under one frame. Without the floor, a fast cache write makes
  //     the skeleton flash for ~16ms and the user feels "nothing
  //     happened" on first paint.
  //
  // If the cache is already populated on mount (warm cache from a
  // prior screen visit), skip the floor entirely so we don't flash a
  // skeleton over data that's ready.
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);
  useEffect(() => {
    if (cache && cache.items.length > 0) {
      setMinTimeElapsed(true);
      return;
    }
    const id = setTimeout(() => setMinTimeElapsed(true), 200);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isLoading =
    !minTimeElapsed || !cache || (cache.loading && cache.items.length === 0);

  const content = (
    <>
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
        {isLoading ? (
          <MediaGridSkeleton />
        ) : (
          <ProfileMediaGrid userId={userId} viewMode={viewMode} />
        )}
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
        {isLoading ? (
          <SessionListSkeleton />
        ) : (
          <ProfileSessionList userId={userId} viewMode={viewMode} />
        )}
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
    </>
  );

  if (pageHandle) {
    return (
      <Animated.ScrollView
        ref={pageHandle.scrollRef}
        onScroll={pageHandle.scrollHandler}
        scrollEventThrottle={1}
        showsVerticalScrollIndicator={false}
        style={[styles.scroller, { backgroundColor: colors.background }]}
        contentContainerStyle={{
          paddingTop: pageHandle.contentInsetTop,
          paddingBottom: pageHandle.contentInsetBottom,
        }}
      >
        {content}
      </Animated.ScrollView>
    );
  }

  return <View>{content}</View>;
}

const styles = StyleSheet.create({
  scroller: { flex: 1 },
});

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
