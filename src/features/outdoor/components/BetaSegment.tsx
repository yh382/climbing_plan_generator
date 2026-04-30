// src/features/outdoor/components/BetaSegment.tsx
// Area-level beta list for crag-community's 3rd tab. Read-only surface —
// shows all beta videos across all routes in the current area sorted by
// likes_count desc. Infinite scroll with 20-item pages. Uploads are NOT
// authored here; users contribute beta from individual route detail pages
// so every upload is bound to a concrete route_id. This keeps the area
// view a pure roll-up.
//
// Like taps do optimistic updates so fast double-tap doesn't feel laggy.

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';

import { useThemeColors } from '../../../lib/useThemeColors';
import { useSettings } from '../../../contexts/SettingsContext';
import { theme } from '../../../lib/theme';
import { useUserStore } from '../../../store/useUserStore';
import { betaApi, type BetaOut } from '../betaApi';
import { BetaCard } from './BetaCard';
import BetaPlayerSheet, {
  type BetaPlayerSheetHandle,
} from './BetaPlayerSheet';

const PAGE_SIZE = 20;

interface BetaSegmentProps {
  areaId: string;
}

export function BetaSegment({ areaId }: BetaSegmentProps) {
  const colors = useThemeColors();
  const { tr } = useSettings();
  const user = useUserStore((s) => s.user);
  const styles = useMemo(() => createStyles(colors), [colors]);

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
      const data = await betaApi.listForArea(areaId, {
        limit: PAGE_SIZE,
        offset,
      });
      setHasMore(data.length === PAGE_SIZE);
      setBetas((prev) => (replace ? data : [...prev, ...data]));
    },
    [areaId],
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

  // Refresh when returning from /outdoor/upload-beta so the newly-created
  // beta shows up without a manual pull-to-refresh.
  useFocusEffect(
    useCallback(() => {
      fetchPage(0, true).catch(() => {});
    }, [fetchPage]),
  );

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
      if (!user) {
        Alert.alert(tr('请先登录', 'Please sign in first'));
        return;
      }
      const currentlyLiked = beta.liked_by_me;
      // Optimistic update.
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
        if (currentlyLiked) {
          await betaApi.unlike(beta.id);
        } else {
          await betaApi.like(beta.id);
        }
      } catch {
        // Revert on failure.
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
    [tr, user],
  );

  if (loading && betas.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (betas.length === 0) {
    return (
      <>
        <View style={styles.emptyWrap}>
          <Ionicons name="videocam-outline" size={48} color={colors.textSecondary} />
          <Text style={styles.emptyTitle}>
            {tr('还没有 beta', 'No beta yet')}
          </Text>
          <Text style={styles.emptyBody}>
            {tr(
              'Beta 由攀过这些路线的人分享',
              "Betas are shared by climbers who've sent these routes.",
            )}
          </Text>
        </View>
        <BetaPlayerSheet
          ref={(h) => {
            playerRef.current = h;
          }}
        />
      </>
    );
  }

  return (
    <>
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
        scrollEnabled={false}
        ListFooterComponent={
          loadingMore ? (
            <ActivityIndicator
              color={colors.accent}
              style={{ paddingVertical: 16 }}
            />
          ) : null
        }
      />
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
    centered: {
      paddingVertical: 40,
      alignItems: 'center',
    },
    emptyWrap: {
      paddingVertical: 36,
      paddingHorizontal: 16,
      alignItems: 'center',
      gap: 8,
    },
    emptyTitle: {
      marginTop: 4,
      fontFamily: theme.fonts.bold,
      fontSize: 17,
      color: c.textPrimary,
    },
    emptyBody: {
      fontFamily: theme.fonts.regular,
      fontSize: 14,
      color: c.textSecondary,
      textAlign: 'center',
      lineHeight: 20,
    },
  });
