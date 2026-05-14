// src/features/profile/components/fivecorefunction/ProfileMediaGrid.tsx
// Window BG — Profile Activity: Media sub-section.
// 3×2 grid of post-media thumbnails (up to 6). Pulled from the shared
// userActivityByUserId cache; FE-side filter `media.length > 0`. Cell
// tap → /community/user-posts?initialPostId=… (mirrors SendsSection).

import React, { useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
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

type Props = {
  userId: string;
  viewMode: "self" | "other";
};

const COLS = 3;
const GAP = 4;
const SIDE_PADDING = 16;
const MAX_PREVIEW = 6;

const GRADE_RE = /(V\d+|5\.\d+[a-d+\-]?|[Ff]\d+[a-c+]?)/i;

function extractGrade(post: FeedPost): string | null {
  if (post.attachment?.type !== "log") return null;
  const subtitle = post.attachment?.subtitle ?? "";
  const m1 = subtitle.match(GRADE_RE);
  if (m1) return m1[0];
  const gradeText = post.attachment?.gradeText ?? "";
  if (gradeText) return gradeText;
  const title = post.attachment?.title ?? "";
  const m2 = title.match(GRADE_RE);
  return m2 ? m2[0] : null;
}

function pickThumb(post: FeedPost): { uri: string; isVideo: boolean } | null {
  if (!post.media || post.media.length === 0) return null;
  const first = post.media[0];
  const uri = first.thumbUrl || first.url;
  if (!uri) return null;
  return { uri, isVideo: first.type === "video" };
}

export default function ProfileMediaGrid({ userId, viewMode }: Props) {
  const colors = useThemeColors();
  const { tr } = useSettings();
  const router = useRouter();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const cache = useCommunityStore((s) => s.userActivityByUserId[userId]);

  const items = useMemo<FeedPost[]>(() => {
    const list = cache?.items ?? [];
    return list
      .filter((p) => Array.isArray(p.media) && p.media.length > 0)
      .slice(0, MAX_PREVIEW);
  }, [cache?.items]);

  const onCellPress = useCallback(
    (post: FeedPost) => {
      router.push({
        pathname: "/community/user-posts",
        params: { userId, initialPostId: post.id },
      } as any);
    },
    [router, userId],
  );

  if (!cache || (cache.loading && items.length === 0)) {
    return <View style={styles.empty} />;
  }

  if (items.length === 0) {
    return (
      <View style={styles.empty}>
        <Ionicons
          name="image-outline"
          size={32}
          color={colors.border}
        />
        <Text style={styles.emptyTitle}>
          {viewMode === "self"
            ? tr("还没有媒体", "No media yet")
            : tr("暂无媒体", "No media")}
        </Text>
        {viewMode === "self" ? (
          <Text style={styles.emptyHint}>
            {tr(
              "记录攀登附图或视频，会出现在这里",
              "Log a climb with a photo or video — it will appear here",
            )}
          </Text>
        ) : null}
      </View>
    );
  }

  return (
    <View style={styles.grid}>
      {items.map((post) => {
        const thumb = pickThumb(post);
        const grade = extractGrade(post);
        return (
          <Pressable
            key={post.id}
            accessibilityRole="button"
            accessibilityLabel={tr("查看媒体", "View media")}
            onPress={() => onCellPress(post)}
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
      })}
    </View>
  );
}

const createStyles = (colors: ReturnType<typeof useThemeColors>) => {
  const screenWidth = Dimensions.get("window").width;
  const cellSize = Math.floor(
    (screenWidth - SIDE_PADDING * 2 - GAP * (COLS - 1)) / COLS,
  );
  return StyleSheet.create({
    grid: {
      flexDirection: "row",
      flexWrap: "wrap",
      paddingHorizontal: SIDE_PADDING,
      gap: GAP,
    },
    cell: {
      width: cellSize,
      height: cellSize,
      borderRadius: 8,
      overflow: "hidden",
      backgroundColor: colors.backgroundSecondary,
      position: "relative",
    },
    cellEmpty: {
      backgroundColor: colors.backgroundSecondary,
    },
    playBadge: {
      position: "absolute",
      top: 6,
      right: 6,
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
};
