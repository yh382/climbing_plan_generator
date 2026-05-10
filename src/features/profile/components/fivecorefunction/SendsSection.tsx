// src/features/profile/components/fivecorefunction/SendsSection.tsx
// Window β — Profile KAYA: 3-column video sends grid (replaces PostsSection).
// Each cell = video thumbnail + ▶ play badge + grade pill. Time-desc.
// Cell tap → push to reels feed (γ window's `/community/reels` route).

import React, { useEffect, useMemo, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { theme } from "@/lib/theme";
import { useThemeColors } from "@/lib/useThemeColors";
import { useSettings } from "@/contexts/SettingsContext";
import { useCommunityStore } from "@/store/useCommunityStore";
import type { FeedPost } from "@/types/community";

const COLS = 3;
const GAP = 1;

interface SendsSectionProps {
  userId: string;
  viewMode: "self" | "other";
}

const GRADE_RE = /(V\d+|5\.\d+[a-d+\-]?|[Ff]\d+[a-c+]?)/i;

function extractGrade(post: FeedPost): string {
  const metrics = post.attachment?.metrics;
  if (Array.isArray(metrics)) {
    const best = metrics.find((m: any) => m.label === "Best")?.value;
    if (best && GRADE_RE.test(best)) return String(best).match(GRADE_RE)?.[0] ?? best;
    if (best && best !== "—") return String(best);
  }
  const subtitle = post.attachment?.subtitle ?? "";
  const match = subtitle.match(GRADE_RE);
  if (match) return match[0];
  const title = post.attachment?.title ?? "";
  const titleMatch = title.match(GRADE_RE);
  return titleMatch ? titleMatch[0] : "—";
}

function pickThumb(post: FeedPost): string | null {
  const first = post.media?.find((m) => m.type === "video") ?? post.media?.[0];
  return first?.thumbUrl || first?.url || null;
}

export default function SendsSection({ userId, viewMode }: SendsSectionProps) {
  const colors = useThemeColors();
  const { tr } = useSettings();
  const router = useRouter();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const cache = useCommunityStore((s) => s.userSendsByUserId[userId]);
  const fetchUserSends = useCommunityStore((s) => s.fetchUserSends);
  const loadMoreUserSends = useCommunityStore((s) => s.loadMoreUserSends);

  useEffect(() => {
    if (!userId) return;
    // Only fetch when there's no cache entry at all. Once `fetchUserSends`
    // starts it writes a `{ loading: true, items: [] }` row, so subsequent
    // re-renders that update `cache` don't retrigger us.
    //
    // BUGFIX: previously this depended on `cache` and gated on
    // `cache.items.length === 0`, which created a tight refetch loop —
    // every `set()` produced a new `cache` reference, useEffect re-fired,
    // and users with zero video sends never satisfied the
    // `items.length > 0` exit condition.
    if (!cache) {
      fetchUserSends(userId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, fetchUserSends]);

  const items = cache?.items ?? [];
  const initialLoading = !cache || (cache.loading && items.length === 0);
  const loadingMore = !!cache?.loading && items.length > 0;

  const onCellPress = useCallback(
    (post: FeedPost) => {
      // Window γ will own /community/reels (vertical sends feed). Until then,
      // fall back to the existing single-post viewer so cell tap never crashes.
      router.push(
        {
          pathname: "/community/user-posts",
          params: { userId, initialPostId: post.id },
        } as any,
      );
    },
    [router, userId],
  );

  const renderItem = useCallback(
    ({ item }: { item: FeedPost }) => {
      const thumb = pickThumb(item);
      const grade = extractGrade(item);
      return (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={tr(`${grade} send`, `${grade} send`)}
          style={styles.cell}
          onPress={() => onCellPress(item)}
        >
          {thumb ? (
            <Image source={{ uri: thumb }} style={StyleSheet.absoluteFill} contentFit="cover" />
          ) : (
            <View style={[StyleSheet.absoluteFill, styles.cellEmpty]} />
          )}
          <View style={styles.playBadge}>
            <Ionicons name="play" size={9} color="#FFFFFF" />
          </View>
          <View style={styles.gradePill}>
            <Text style={styles.gradeText}>{grade}</Text>
          </View>
        </Pressable>
      );
    },
    [onCellPress, styles, tr],
  );

  const onEndReached = useCallback(() => {
    if (!cache || cache.exhausted || cache.loading) return;
    loadMoreUserSends(userId);
  }, [cache, loadMoreUserSends, userId]);

  if (initialLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.textTertiary} />
      </View>
    );
  }

  if (items.length === 0) {
    return (
      <View style={styles.center}>
        <Ionicons name="videocam-outline" size={36} color={colors.border} />
        <Text style={styles.emptyTitle}>
          {tr(
            viewMode === "self" ? "还没有视频 send" : "暂无视频 send",
            "No sends yet",
          )}
        </Text>
        {viewMode === "self" ? (
          <Text style={styles.emptyHint}>
            {tr(
              "记录攀登时附上视频，它会出现在这里",
              "Log a climb with video to see your sends here",
            )}
          </Text>
        ) : null}
      </View>
    );
  }

  return (
    // Disable internal scrolling — the outer profile ScrollView owns scroll.
    // FlatList stays for keyExtractor + numColumns layout but is rendered as
    // a non-virtualized list so the parent ScrollView's gesture takes over
    // and the whole page scrolls as one (mockup behavior).
    <FlatList
      data={items}
      keyExtractor={(it) => it.id}
      numColumns={COLS}
      renderItem={renderItem}
      contentContainerStyle={styles.gridContent}
      scrollEnabled={false}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.5}
      removeClippedSubviews
      ListFooterComponent={
        loadingMore ? (
          <View style={styles.footerLoader}>
            <ActivityIndicator color={colors.textTertiary} />
          </View>
        ) : null
      }
    />
  );
}

const createStyles = (colors: ReturnType<typeof useThemeColors>) => {
  const screenWidth = Dimensions.get("window").width;
  const cellSize = Math.floor((screenWidth - GAP * (COLS - 1)) / COLS);
  return StyleSheet.create({
    gridContent: {
      backgroundColor: colors.background,
    },
    cell: {
      width: cellSize,
      height: cellSize,
      marginRight: GAP,
      marginBottom: GAP,
      backgroundColor: colors.backgroundSecondary,
      overflow: "hidden",
      position: "relative",
    },
    cellEmpty: {
      backgroundColor: colors.backgroundSecondary,
    },
    playBadge: {
      position: "absolute",
      top: 8,
      right: 8,
      width: 18,
      height: 18,
      borderRadius: 9,
      backgroundColor: "rgba(0,0,0,0.5)",
      alignItems: "center",
      justifyContent: "center",
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: "rgba(255,255,255,0.3)",
    },
    gradePill: {
      position: "absolute",
      left: 6,
      bottom: 6,
      paddingHorizontal: 7,
      paddingVertical: 2,
      borderRadius: 6,
      backgroundColor: "rgba(0,0,0,0.55)",
    },
    gradeText: {
      color: "#FFFFFF",
      fontSize: 11,
      fontWeight: "700",
      fontFamily: theme.fonts.bold,
    },
    center: {
      paddingVertical: 60,
      paddingHorizontal: 24,
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
    },
    emptyTitle: {
      color: colors.textSecondary,
      fontSize: 14,
      fontFamily: theme.fonts.medium,
    },
    emptyHint: {
      color: colors.textTertiary,
      fontSize: 12,
      fontFamily: theme.fonts.regular,
      textAlign: "center",
      maxWidth: 240,
    },
    footerLoader: {
      paddingVertical: 16,
      alignItems: "center",
    },
  });
};
