// app/users/[userId]/sessions.tsx
// Window BG — Profile Activity: full Sessions list (view-all destination).
// Vertical FlatList of MiniSessionCard, cursor-paginated through the
// shared userActivityByUserId cache (FE-side filter attachment.type==='session').
// Cell tap → /community/post/[postId] for full SessionCard + comments.

import React, { useCallback, useEffect, useLayoutEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useNavigation } from "@react-navigation/native";

import {
  HEADER_TRANSPARENT,
  NATIVE_HEADER_BASE,
  withHeaderTheme,
} from "@/lib/nativeHeaderOptions";
import { theme } from "@/lib/theme";
import { useThemeColors } from "@/lib/useThemeColors";
import { useSettings } from "@/contexts/SettingsContext";
import { HeaderButton } from "@/components/ui/HeaderButton";
import { useCommunityStore } from "@/store/useCommunityStore";
import type { FeedPost } from "@/types/community";
import MiniSessionCard from "@/features/profile/components/fivecorefunction/MiniSessionCard";

export default function UserSessionsScreen() {
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
      ...NATIVE_HEADER_BASE,
      ...withHeaderTheme(colors),
      headerShown: true,
      headerTransparent: HEADER_TRANSPARENT,
      scrollEdgeEffects: { top: "soft" },
      title: tr("训练 Session", "Sessions"),
      headerLeft: () => (
        <HeaderButton icon="chevron.backward" onPress={() => router.back()} />
      ),
      headerRight: undefined,
    });
  }, [navigation, router, tr, colors]);

  useEffect(() => {
    if (!userId) return;
    if (!cache) fetchUserActivity(userId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, fetchUserActivity]);

  const sessions = useMemo<FeedPost[]>(() => {
    const list = cache?.items ?? [];
    return list.filter((p) => p.attachment?.type === "session");
  }, [cache?.items]);

  const onEndReached = useCallback(() => {
    if (!userId || !cache || cache.exhausted || cache.loading) return;
    loadMoreUserActivity(userId);
  }, [cache, loadMoreUserActivity, userId]);

  const renderItem = useCallback(
    ({ item }: { item: FeedPost }) => (
      <MiniSessionCard
        post={item}
        onPress={() =>
          router.push({
            pathname: "/community/post/[postId]",
            params: { postId: item.id },
          } as any)
        }
      />
    ),
    [router],
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

  const initialLoading = !cache || (cache.loading && sessions.length === 0);
  const loadingMore = !!cache?.loading && sessions.length > 0;

  if (initialLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.textTertiary} />
      </View>
    );
  }

  if (sessions.length === 0) {
    return (
      <View style={styles.center}>
        <Ionicons name="barbell-outline" size={36} color={colors.border} />
        <Text style={styles.emptyText}>
          {tr("暂无 session", "No sessions yet")}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={sessions}
        keyExtractor={(it) => it.id}
        renderItem={renderItem}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.listContent}
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
    </View>
  );
}

const createStyles = (colors: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    // BG real-device fix — root container needs an explicit background;
    // without it the FlatList's edges + scroll-bounce reveal the parent
    // Stack screen's default light-gray contentStyle.
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    listContent: {
      paddingTop: 8,
      paddingBottom: 80,
      backgroundColor: colors.background,
    },
    center: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      paddingHorizontal: 24,
      backgroundColor: colors.background,
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
