// app/community/media-grid.tsx
// Window BG — Profile Activity: full Media grid (view-all destination).
// 3-column FlatList of post-media thumbnails, cursor-paginated through
// useCommunityStore.userActivityByUserId. Cell tap → /community/user-posts.

import React, { useCallback, useEffect, useLayoutEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useNavigation } from "@react-navigation/native";

import { HEADER_TRANSPARENT } from "@/lib/nativeHeaderOptions";
import { theme } from "@/lib/theme";
import { useThemeColors } from "@/lib/useThemeColors";
import { useSettings } from "@/contexts/SettingsContext";
import { HeaderButton } from "@/components/ui/HeaderButton";
import { useCommunityStore } from "@/store/useCommunityStore";
import type { FeedPost } from "@/types/community";

const COLS = 3;
const GAP = 2;

const GRADE_RE = /(V\d+|5\.\d+[a-d+\-]?|[Ff]\d+[a-c+]?)/i;

function extractGrade(post: FeedPost): string | null {
  if (post.attachment?.type !== "log") return null;
  const subtitle = post.attachment?.subtitle ?? "";
  const m = subtitle.match(GRADE_RE);
  if (m) return m[0];
  const gradeText = post.attachment?.gradeText ?? "";
  if (gradeText) return gradeText;
  return null;
}

function pickThumb(post: FeedPost): { uri: string; isVideo: boolean } | null {
  if (!post.media?.length) return null;
  const first = post.media[0];
  const uri = first.thumbUrl || first.url;
  if (!uri) return null;
  return { uri, isVideo: first.type === "video" };
}

export default function MediaGridScreen() {
  const params = useLocalSearchParams<{ userId?: string }>();
  const userId = Array.isArray(params.userId) ? params.userId[0] : params.userId;
  const router = useRouter();
  const navigation = useNavigation();
  const colors = useThemeColors();
  const { tr } = useSettings();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const cache = useCommunityStore((s) =>
    userId ? s.userActivityByUserId[userId] : undefined,
  );
  const fetchUserActivity = useCommunityStore((s) => s.fetchUserActivity);
  const loadMoreUserActivity = useCommunityStore((s) => s.loadMoreUserActivity);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: tr("媒体", "Media"),
      headerTransparent: HEADER_TRANSPARENT,
      scrollEdgeEffects: { top: "soft" },
      headerLeft: () => (
        <HeaderButton icon="chevron.backward" onPress={() => router.back()} />
      ),
    });
  }, [navigation, router, tr]);

  useEffect(() => {
    if (!userId) return;
    if (!cache) fetchUserActivity(userId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, fetchUserActivity]);

  const items = useMemo<FeedPost[]>(() => {
    const list = cache?.items ?? [];
    return list.filter((p) => Array.isArray(p.media) && p.media.length > 0);
  }, [cache?.items]);

  const onCellPress = useCallback(
    (post: FeedPost) => {
      if (!userId) return;
      router.push({
        pathname: "/community/user-posts",
        params: { userId, initialPostId: post.id },
      } as any);
    },
    [router, userId],
  );

  const onEndReached = useCallback(() => {
    if (!userId || !cache || cache.exhausted || cache.loading) return;
    loadMoreUserActivity(userId);
  }, [cache, loadMoreUserActivity, userId]);

  const renderItem = useCallback(
    ({ item }: { item: FeedPost }) => {
      const thumb = pickThumb(item);
      const grade = extractGrade(item);
      return (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={tr("查看媒体", "View media")}
          onPress={() => onCellPress(item)}
          style={styles.cell}
        >
          {thumb ? (
            <Image
              source={{ uri: thumb.uri }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
            />
          ) : (
            <View style={[StyleSheet.absoluteFill, styles.cellEmpty]} />
          )}
          {thumb?.isVideo ? (
            <View style={styles.playBadge}>
              <Ionicons name="play" size={9} color="#FFFFFF" />
            </View>
          ) : null}
          {grade ? (
            <View style={styles.gradePill}>
              <Text style={styles.gradeText}>{grade}</Text>
            </View>
          ) : null}
        </Pressable>
      );
    },
    [onCellPress, styles, tr],
  );

  if (!userId) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>
          {tr("用户 ID 缺失", "Missing user id")}
        </Text>
      </View>
    );
  }

  const initialLoading = !cache || (cache.loading && items.length === 0);
  const loadingMore = !!cache?.loading && items.length > 0;

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
        <Ionicons name="image-outline" size={36} color={colors.border} />
        <Text style={styles.emptyText}>{tr("暂无媒体", "No media yet")}</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={items}
      keyExtractor={(it) => it.id}
      numColumns={COLS}
      renderItem={renderItem}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.gridContent}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.5}
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
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: "rgba(0,0,0,0.55)",
      alignItems: "center",
      justifyContent: "center",
    },
    gradePill: {
      position: "absolute",
      left: 6,
      bottom: 6,
      paddingHorizontal: 7,
      paddingVertical: 2,
      borderRadius: 6,
      backgroundColor: "rgba(0,0,0,0.6)",
    },
    gradeText: {
      color: "#FFFFFF",
      fontSize: 11,
      fontWeight: "700",
      fontFamily: theme.fonts.bold,
    },
    center: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      paddingHorizontal: 24,
    },
    emptyText: {
      color: colors.textTertiary,
      fontSize: 14,
      fontFamily: theme.fonts.regular,
      textAlign: "center",
    },
    footerLoader: {
      paddingVertical: 16,
      alignItems: "center",
    },
  });
};
