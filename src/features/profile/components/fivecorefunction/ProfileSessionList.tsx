// src/features/profile/components/fivecorefunction/ProfileSessionList.tsx
// Window BG — Profile Activity: Sessions sub-section.
// Source: useCommunityStore.userActivityByUserId (single fetch shared with
// ProfileMediaGrid), FE filter `attachment.type === "session"`, sliced to 3.

import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useRouter } from "expo-router";

import { theme } from "@/lib/theme";
import { useThemeColors } from "@/lib/useThemeColors";
import { useSettings } from "@/contexts/SettingsContext";
import { useCommunityStore } from "@/store/useCommunityStore";
import type { FeedPost } from "@/types/community";
import MiniSessionCard from "./MiniSessionCard";

type Props = {
  userId: string;
  viewMode: "self" | "other";
};

// 决策 2026-07-01 — preview shows only the LATEST session; the rest live
// behind "View all".
const MAX_PREVIEW = 1;

export default function ProfileSessionList({ userId, viewMode }: Props) {
  const colors = useThemeColors();
  const { tr } = useSettings();
  const router = useRouter();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const cache = useCommunityStore((s) => s.userActivityByUserId[userId]);

  const sessions = useMemo<FeedPost[]>(() => {
    const items = cache?.items ?? [];
    return items
      .filter((p) => p.attachment?.type === "session")
      .slice(0, MAX_PREVIEW);
  }, [cache?.items]);

  if (!cache || (cache.loading && sessions.length === 0)) {
    // Loading/uninitialised — empty container; SubSection title still shows.
    return <View style={styles.empty} />;
  }

  if (sessions.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyTitle}>
          {viewMode === "self"
            ? tr("还没有训练 session", "No training sessions yet")
            : tr("暂无 session", "No sessions")}
        </Text>
        {viewMode === "self" ? (
          <Text style={styles.emptyHint}>
            {tr(
              "开始一次训练，自动出现在这里",
              "Start a session — it will appear here",
            )}
          </Text>
        ) : null}
      </View>
    );
  }

  return (
    <View>
      {sessions.map((post) => (
        <MiniSessionCard
          key={post.id}
          post={post}
          onPress={() =>
            router.push({
              pathname: "/community/post/[postId]",
              params: { postId: post.id },
            } as any)
          }
        />
      ))}
    </View>
  );
}

const createStyles = (colors: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
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
