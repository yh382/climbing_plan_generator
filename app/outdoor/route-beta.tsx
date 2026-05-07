// app/outdoor/route-beta.tsx
// Full-list viewer for a route's betas. Reached from the "View Beta" pill
// overlaid on the cover photo in outdoor-route-detail. View-only — uploads
// are NOT offered here; they happen through the post-Send completion flow
// so every beta is authored alongside a logged send.
//
// Uses the same BetaCard + BetaPlayerSheet + optimistic like pattern as
// BetaSegment so UX stays consistent across area-level and route-level views.

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  ScrollView,
} from 'react-native';
import { HEADER_TRANSPARENT } from "@/lib/nativeHeaderOptions";
import { Stack, useLocalSearchParams } from 'expo-router';

import { useThemeColors } from '../../src/lib/useThemeColors';
import { useSettings } from '../../src/contexts/SettingsContext';
import { theme } from '../../src/lib/theme';
import { useUserStore } from '../../src/store/useUserStore';
import { betaApi, type BetaOut } from '../../src/features/outdoor/betaApi';
import { BetaCard } from '../../src/features/outdoor/components/BetaCard';
import BetaPlayerSheet, {
  type BetaPlayerSheetHandle,
} from '../../src/features/outdoor/components/BetaPlayerSheet';
const PAGE_SIZE = 20;

export default function RouteBetaPage() {
  const colors = useThemeColors();
  const { tr } = useSettings();
  const user = useUserStore((s) => s.user);
  const styles = useMemo(() => createStyles(colors), [colors]);

  const { routeId, routeName } = useLocalSearchParams<{
    routeId?: string;
    routeName?: string;
  }>();
  const safeRouteId =
    typeof routeId === 'string' && routeId.length > 0 ? routeId : null;

  const [betas, setBetas] = useState<BetaOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const playerRef = useMemo(
    () => ({ current: null as BetaPlayerSheetHandle | null }),
    [],
  );

  const fetchPage = useCallback(
    async (offset: number, replace: boolean) => {
      if (!safeRouteId) return;
      const data = await betaApi.listForRoute(safeRouteId, {
        limit: PAGE_SIZE,
        offset,
      });
      setHasMore(data.length === PAGE_SIZE);
      setBetas((prev) => (replace ? data : [...prev, ...data]));
    },
    [safeRouteId],
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setBetas([]);
    fetchPage(0, true)
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [fetchPage]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || loading) return;
    setLoadingMore(true);
    try {
      await fetchPage(betas.length, false);
    } finally {
      setLoadingMore(false);
    }
  }, [betas.length, fetchPage, hasMore, loading, loadingMore]);

  const toggleLike = useCallback(
    async (beta: BetaOut) => {
      if (!user) return;
      const currentlyLiked = beta.liked_by_me;
      setBetas((prev) =>
        prev.map((b) =>
          b.id === beta.id
            ? {
                ...b,
                liked_by_me: !currentlyLiked,
                likes_count: b.likes_count + (currentlyLiked ? -1 : 1),
              }
            : b,
        ),
      );
      try {
        if (currentlyLiked) await betaApi.unlike(beta.id);
        else await betaApi.like(beta.id);
      } catch {
        setBetas((prev) =>
          prev.map((b) =>
            b.id === beta.id
              ? {
                  ...b,
                  liked_by_me: currentlyLiked,
                  likes_count: b.likes_count + (currentlyLiked ? 1 : -1),
                }
              : b,
          ),
        );
      }
    },
    [user],
  );

  return (
    <>
      <Stack.Screen
        options={{
          headerTitle:
            typeof routeName === 'string' && routeName.length > 0
              ? routeName
              : tr('Beta', 'Beta'),
          headerTransparent: HEADER_TRANSPARENT,
          scrollEdgeEffects: { top: 'soft' } as any,
          // Don't inherit the previous screen's title next to the back
          // chevron — keeps the nav bar clean (the page title IS the
          // route name, a redundant "Goodro's Wall ‹ Goodro's Wall" reads
          // as noise).
          headerBackTitle: '',
          headerBackButtonDisplayMode: 'minimal',
        }}
      />
      <View style={styles.container}>
        {loading && betas.length === 0 ? (
          // Non-FlatList branches (loading / error / empty) use a ScrollView
          // with contentInsetAdjustmentBehavior="automatic" so iOS applies
          // the transparent-header inset automatically — same inset behavior
          // the FlatList branch gets for free.
          <ScrollView
            contentInsetAdjustmentBehavior="automatic"
            contentContainerStyle={styles.centeredContent}
          >
            <ActivityIndicator color={colors.accent} size="large" />
          </ScrollView>
        ) : !safeRouteId ? (
          <ScrollView
            contentInsetAdjustmentBehavior="automatic"
            contentContainerStyle={styles.centeredContent}
          >
            <Text style={styles.emptyText}>
              {tr('缺少路线上下文', 'Missing route context.')}
            </Text>
          </ScrollView>
        ) : betas.length === 0 ? (
          <ScrollView
            contentInsetAdjustmentBehavior="automatic"
            contentContainerStyle={styles.centeredContent}
          >
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyTitle}>
                {tr('还没有 beta', 'No beta yet')}
              </Text>
              <Text style={styles.emptyBody}>
                {tr(
                  '完成这条路线后可以在记录页面分享 beta 视频',
                  'Log a send on this route to share a beta video.',
                )}
              </Text>
            </View>
          </ScrollView>
        ) : (
          <FlatList
            data={betas}
            keyExtractor={(b) => b.id}
            renderItem={({ item }) => (
              <BetaCard
                beta={item}
                onPress={() => playerRef.current?.present(item)}
                onToggleLike={() => toggleLike(item)}
              />
            )}
            onEndReached={loadMore}
            onEndReachedThreshold={0.4}
            contentInsetAdjustmentBehavior="automatic"
            contentContainerStyle={styles.listContent}
            ListFooterComponent={
              loadingMore ? (
                <ActivityIndicator
                  color={colors.accent}
                  style={{ paddingVertical: 16 }}
                />
              ) : null
            }
          />
        )}
      </View>
      <BetaPlayerSheet
        ref={(h) => {
          playerRef.current = h;
        }}
      />
    </>
  );
}

const createStyles = (c: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.background,
    },
    listContent: {
      paddingHorizontal: theme.spacing.screenPadding,
      paddingBottom: 40,
    },
    centeredContent: {
      paddingTop: 48,
      paddingHorizontal: 32,
      alignItems: 'center',
    },
    emptyText: {
      fontFamily: theme.fonts.regular,
      fontSize: 15,
      color: c.textSecondary,
      textAlign: 'center',
    },
    emptyWrap: {
      alignItems: 'center',
      gap: 8,
    },
    emptyTitle: {
      fontFamily: theme.fonts.bold,
      fontSize: 17,
      color: c.textPrimary,
    },
    emptyBody: {
      fontFamily: theme.fonts.regular,
      fontSize: 14,
      lineHeight: 20,
      color: c.textSecondary,
      textAlign: 'center',
    },
  });
