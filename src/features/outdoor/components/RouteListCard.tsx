// src/features/outdoor/components/RouteListCard.tsx
// Larger route card: 72×72 thumb, 16px title, bigger padding.

import { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../../../lib/useThemeColors';
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

export function gradeColor(score: number | undefined): string {
  if (!score || score <= 90) return '#34C759';
  if (score <= 110) return '#FFD60A';
  if (score <= 125) return '#FF9500';
  return '#FF3B30';
}

export default function RouteListCard({ route, onPress, hideLocation, expanded }: RouteListCardProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const cardBg = expanded ? colors.background : colors.backgroundSecondary;
  const gc = gradeColor(route.grade_score);
  const thumb = route.photos?.[0]?.thumb_url ?? route.photos?.[0]?.url;
  const breadcrumb = !hideLocation
    ? [route.crag_name, route.wall_name].filter(Boolean).join(' · ')
    : '';

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

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={1}>{route.name}</Text>

        <View style={styles.subtitleRow}>
          <View style={[styles.gradeDot, { backgroundColor: gc }]} />
          <Text style={styles.gradeText}>{route.grade_text}</Text>
          <Text style={styles.separator}>·</Text>
          <Text style={styles.metaText}>{route.style}</Text>
          {route.length_m ? (
            <>
              <Text style={styles.separator}>·</Text>
              <Text style={styles.metaText}>{route.length_m}m</Text>
            </>
          ) : null}
          {route.stars != null && route.stars > 0 ? (
            <>
              <Text style={styles.separator}>·</Text>
              <Ionicons name="star" size={12} color="#FFD60A" style={{ marginRight: 2 }} />
              <Text style={styles.metaText}>{route.stars.toFixed(1)}</Text>
            </>
          ) : null}
        </View>

        {breadcrumb ? (
          <Text style={styles.breadcrumbText} numberOfLines={1}>{breadcrumb}</Text>
        ) : null}
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
      backgroundColor: c.backgroundSecondary,
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
      fontFamily: theme.fonts.bold,
      fontSize: 16,
      color: c.textPrimary,
    },
    subtitleRow: { flexDirection: 'row', alignItems: 'center' },
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
