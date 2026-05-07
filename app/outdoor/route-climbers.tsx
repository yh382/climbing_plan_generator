// app/outdoor/route-climbers.tsx
// Reached from tapping the GradeSuggestionCard on outdoor-route-detail.
// Shows the full ascent log + the full review list, toggled by a native
// segmented control. Extracts what used to be two inline sections on the
// detail page so the route header stays short.

import { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useThemeColors } from '../../src/lib/useThemeColors';
import { useSettings } from '../../src/contexts/SettingsContext';
import { theme } from '../../src/lib/theme';
import { NativeSegmentedControl } from '../../src/components/ui/NativeSegmentedControl';
import { outdoorApi } from '../../src/features/outdoor/api';
import type {
  OutdoorRoute,
  RouteAscent,
  RouteRating,
} from '../../src/features/outdoor/types';

export default function RouteClimbersPage() {
  const colors = useThemeColors();
  const { tr } = useSettings();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const { routeId } = useLocalSearchParams<{ routeId?: string }>();
  const safeRouteId =
    typeof routeId === 'string' && routeId.length > 0 ? routeId : null;

  const [segment, setSegment] = useState<0 | 1>(0);
  const [route, setRoute] = useState<OutdoorRoute | null>(null);
  const [ascents, setAscents] = useState<RouteAscent[]>([]);
  const [reviews, setReviews] = useState<RouteRating[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!safeRouteId) return;
    let cancelled = false;
    setLoading(true);
    Promise.all([
      outdoorApi.getRoute(safeRouteId),
      outdoorApi.getAscents(safeRouteId),
      outdoorApi.getRatings(safeRouteId),
    ])
      .then(([r, a, rv]) => {
        if (cancelled) return;
        if (r) setRoute(r);
        setAscents(a ?? []);
        setReviews(rv ?? []);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [safeRouteId]);

  const title = route?.name ?? tr('攀登者', 'Climbers');

  return (
    <>
      <Stack.Screen options={{ title }} />
      <ScrollView
        style={styles.container}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}
      >
        <View style={styles.segmentWrap}>
          <NativeSegmentedControl
            options={[tr('攀爬', 'Ascents'), tr('评价', 'Reviews')]}
            selectedIndex={segment}
            onSelect={(i) => setSegment(i as 0 | 1)}
          />
        </View>

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="small" color={colors.accent} />
          </View>
        ) : segment === 0 ? (
          ascents.length === 0 ? (
            <EmptyState text={tr('还没有攀登记录', 'No ascents yet')} />
          ) : (
            ascents.map((a) => (
              <AscentRow key={a.id} ascent={a} tr={tr} colors={colors} />
            ))
          )
        ) : reviews.length === 0 ? (
          <EmptyState text={tr('还没有评价', 'No reviews yet')} />
        ) : (
          reviews.map((r) => (
            <ReviewRow key={r.id} review={r} colors={colors} />
          ))
        )}
      </ScrollView>
    </>
  );
}

function EmptyState({ text }: { text: string }) {
  const colors = useThemeColors();
  return (
    <View style={{ paddingVertical: 40, alignItems: 'center' }}>
      <Text
        style={{
          fontFamily: theme.fonts.regular,
          fontSize: 14,
          color: colors.textSecondary,
        }}
      >
        {text}
      </Text>
    </View>
  );
}

function AscentRow({
  ascent,
  tr,
  colors,
}: {
  ascent: RouteAscent;
  tr: (zh: string, en: string) => string;
  colors: ReturnType<typeof useThemeColors>;
}) {
  const styles = useMemo(() => createRowStyles(colors), [colors]);
  const resultIcon = ascent.result === 'attempt' ? '✗' : '✓';
  const showTries = (ascent.attempts ?? 1) >= 2;
  return (
    <View style={styles.row}>
      <Text style={styles.user}>@{ascent.username}</Text>
      <Text style={styles.result}>
        {resultIcon} {ascent.result}
      </Text>
      {showTries && (
        <Text style={styles.meta}>
          · {ascent.attempts} {tr('次尝试', 'tries')}
        </Text>
      )}
      <Text style={styles.meta}>· {ascent.date}</Text>
    </View>
  );
}

function ReviewRow({
  review,
  colors,
}: {
  review: RouteRating;
  colors: ReturnType<typeof useThemeColors>;
}) {
  const styles = useMemo(() => createReviewStyles(colors), [colors]);
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.user}>@{review.username}</Text>
        <View style={styles.stars}>
          {Array.from({ length: 5 }).map((_, i) => (
            <Ionicons
              key={i}
              name={i < Math.round(review.stars) ? 'star' : 'star-outline'}
              size={11}
              color="#FFD60A"
            />
          ))}
        </View>
      </View>
      {review.comment ? (
        <Text style={styles.comment}>&ldquo;{review.comment}&rdquo;</Text>
      ) : null}
    </View>
  );
}

const createStyles = (c: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    content: { paddingBottom: 40 },
    segmentWrap: {
      paddingHorizontal: theme.spacing.screenPadding,
      paddingTop: 8,
      paddingBottom: 12,
    },
    centered: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  });

const createRowStyles = (c: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 8,
      paddingHorizontal: theme.spacing.screenPadding,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    user: { fontFamily: theme.fonts.bold, fontSize: 13, color: c.textPrimary },
    result: { fontFamily: theme.fonts.medium, fontSize: 13, color: c.textPrimary },
    meta: { fontFamily: theme.fonts.regular, fontSize: 12, color: c.textSecondary },
  });

const createReviewStyles = (c: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    card: {
      marginHorizontal: theme.spacing.screenPadding,
      marginBottom: 12,
      paddingBottom: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
    user: { fontFamily: theme.fonts.bold, fontSize: 13, color: c.textPrimary },
    stars: { flexDirection: 'row', gap: 1 },
    comment: {
      fontFamily: theme.fonts.regular,
      fontSize: 13,
      color: c.textPrimary,
      fontStyle: 'italic',
      lineHeight: 19,
    },
  });
