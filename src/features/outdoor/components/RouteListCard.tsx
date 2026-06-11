// src/features/outdoor/components/RouteListCard.tsx
// Larger route card: 72×72 thumb, 16px title, bigger padding.

import { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../../../lib/useThemeColors';
import { useSettings } from '../../../contexts/SettingsContext';
import { theme } from '../../../lib/theme';
import type { OutdoorRoute } from '../types';

type RouteListCardProps = {
  route: OutdoorRoute;
  onPress: () => void;
  hideLocation?: boolean;
  /** When true, use `colors.background` (white in light mode) as the card
   *  background instead of `backgroundSecondary`. Used by crag-map when the
   *  parent sheet is in its expanded detent (sheet material reads lighter,
   *  so grey cards need to flip to white for contrast). */
  expanded?: boolean;
};

export default function RouteListCard({ route, onPress, hideLocation, expanded }: RouteListCardProps) {
  const colors = useThemeColors();
  const { tr } = useSettings();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const cardBg = expanded ? colors.background : colors.sheetCardBackground;
  const thumb = route.photos?.[0]?.thumb_url ?? route.photos?.[0]?.url;
  // CB 点5 — subtitle = the route's two parent levels (crag · nearest area).
  // Prefers the B1 breadcrumb fields; falls back to the legacy wall pairing
  // so it degrades gracefully before the backend B1 change is deployed.
  const subtitle = !hideLocation
    ? [route.crag_name, route.parent_area_name ?? route.area_name ?? route.wall_name]
        .filter(Boolean)
        .join(' · ')
    : '';
  const hasStars = route.stars != null && route.stars > 0;
  const hasAscents = route.send_count != null && route.send_count > 0;

  return (
    <TouchableOpacity style={[styles.card, { backgroundColor: cardBg }]} onPress={onPress} activeOpacity={0.7}>
      {/* Thumbnail */}
      <View style={styles.thumbContainer}>
        {thumb ? (
          <Image source={{ uri: thumb }} style={styles.thumb} contentFit="cover" />
        ) : (
          <View style={styles.thumbPlaceholder}>
            <Ionicons name="image-outline" size={22} color={colors.textTertiary} />
          </View>
        )}
      </View>

      {/* Content — 3 fixed lines (name+grade / subtitle / meta) keep the row
          height deterministic for the future snap-to-card list (CB 点8). */}
      <View style={styles.content}>
        {/* Line 1: name + grade */}
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={1}>{route.name}</Text>
          <View style={styles.gradeBadge}>
            <View style={[styles.gradeDot, { backgroundColor: colors.textPrimary }]} />
            <Text style={styles.gradeText}>{route.grade_text}</Text>
          </View>
        </View>

        {/* Line 2: subtitle — crag · nearest area */}
        {subtitle ? (
          <Text style={styles.breadcrumbText} numberOfLines={1}>{subtitle}</Text>
        ) : null}

        {/* Line 3: meta — ★ rating · N ascents · style */}
        <View style={styles.metaRow}>
          {hasStars ? (
            <>
              <Ionicons name="star" size={12} color={colors.textPrimary} style={{ marginRight: 2 }} />
              <Text style={styles.metaText}>{route.stars!.toFixed(1)}</Text>
              <Text style={styles.separator}>·</Text>
            </>
          ) : null}
          {hasAscents ? (
            <>
              <Text style={styles.metaText}>
                {tr(`${route.send_count} 次完成`, `${route.send_count} ascents`)}
              </Text>
              <Text style={styles.separator}>·</Text>
            </>
          ) : null}
          <Text style={styles.metaText} numberOfLines={1}>{route.style}</Text>
        </View>
      </View>

      <View style={styles.chevron}>
        <Text style={{ color: colors.textTertiary, fontSize: 16 }}>›</Text>
      </View>
    </TouchableOpacity>
  );
}

const createStyles = (c: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    card: {
      backgroundColor: c.sheetCardBackground,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      marginBottom: 8,
      borderRadius: 14,
      flexDirection: 'row',
      alignItems: 'center',
      overflow: 'hidden',
    },
    thumbContainer: { width: 72, height: 72 },
    thumb: { width: 72, height: 72 },
    thumbPlaceholder: {
      width: 72, height: 72,
      backgroundColor: c.cardBackground,
      alignItems: 'center', justifyContent: 'center',
    },
    content: {
      flex: 1,
      paddingVertical: 12,
      paddingHorizontal: 14,
      gap: 4,
    },
    title: {
      flex: 1,
      fontFamily: theme.fonts.bold,
      fontSize: 16,
      color: c.textPrimary,
    },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    gradeBadge: { flexDirection: 'row', alignItems: 'center' },
    metaRow: { flexDirection: 'row', alignItems: 'center' },
    gradeDot: { width: 7, height: 7, borderRadius: 3.5, marginRight: 6 },
    gradeText: {
      fontFamily: theme.fonts.medium,
      fontSize: 13,
      color: c.textPrimary,
    },
    separator: { fontSize: 13, color: c.textTertiary, marginHorizontal: 5 },
    metaText: { fontFamily: theme.fonts.regular, fontSize: 13, color: c.textSecondary },
    breadcrumbText: {
      fontFamily: theme.fonts.regular,
      fontSize: 12,
      color: c.textTertiary,
    },
    chevron: {
      paddingRight: 14,
      justifyContent: 'center',
    },
  });
