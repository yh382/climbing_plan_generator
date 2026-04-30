// src/features/outdoor/components/WallGroup.tsx
// Wall group: topo photo header + route list, used inside crag-map Sheet

import { useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../../../lib/useThemeColors';
import { useSettings } from '../../../contexts/SettingsContext';
import { theme } from '../../../lib/theme';
import type { Wall } from '../types';
import RouteListCard from './RouteListCard';

type WallGroupProps = {
  wall: Wall;
  onRoutePress: (routeId: string) => void;
  /** Initially collapsed? */
  defaultExpanded?: boolean;
  /** Forwarded to child RouteListCards — when true, cards use white bg
   *  (for use inside a sheet that itself has a light material). */
  sheetExpanded?: boolean;
  /** When set, the route with this id is re-ordered to the top of the
   *  route list (pin-tap focus behavior). */
  highlightedRouteId?: string | null;
};

export default function WallGroup({
  wall,
  onRoutePress,
  defaultExpanded = true,
  sheetExpanded,
  highlightedRouteId,
}: WallGroupProps) {
  const colors = useThemeColors();
  const { tr } = useSettings();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [expanded, setExpanded] = useState(defaultExpanded);

  const rawRoutes = wall.routes ?? [];
  // Move the highlighted route to index 0 so the user lands on it at the
  // top of the sheet after tapping its map pin. Stable-sort-like: only
  // moves the matching element, preserves relative order of the rest.
  const routes = useMemo(() => {
    if (!highlightedRouteId) return rawRoutes;
    const idx = rawRoutes.findIndex((r) => r.id === highlightedRouteId);
    if (idx <= 0) return rawRoutes;
    const clone = rawRoutes.slice();
    const [hit] = clone.splice(idx, 1);
    clone.unshift(hit);
    return clone;
  }, [rawRoutes, highlightedRouteId]);
  const routeCount = wall.route_count ?? routes.length;

  return (
    <View style={styles.container}>
      {/* Wall header */}
      <TouchableOpacity
        style={styles.header}
        onPress={() => setExpanded((v) => !v)}
        activeOpacity={0.7}
      >
        <Ionicons
          name={expanded ? 'chevron-down' : 'chevron-forward'}
          size={14}
          color={colors.textSecondary}
        />
        <Text style={styles.wallName}>{wall.name}</Text>
        <Text style={styles.wallMeta}>
          ({routeCount})
          {wall.orientation ? ` · ${wall.orientation}` : ''}
        </Text>
      </TouchableOpacity>

      {expanded && (
        <View style={styles.body}>
          {/* Topo photo (pinch-to-zoom via horizontal ScrollView) */}
          {wall.topo_url && (
            <ScrollView
              horizontal
              maximumZoomScale={3}
              minimumZoomScale={1}
              showsHorizontalScrollIndicator={false}
              style={styles.topoWrap}
            >
              <Image source={{ uri: wall.topo_url }} style={styles.topo} contentFit="contain" />
            </ScrollView>
          )}

          {/* Route list */}
          {routes.map((route) => (
            <RouteListCard
              key={route.id}
              route={route}
              onPress={() => onRoutePress(route.id)}
              hideLocation
              expanded={sheetExpanded}
            />
          ))}

          {routeCount > routes.length && (
            <Text style={styles.moreText}>
              {tr(`共 ${routeCount} 条路线`, `${routeCount} routes total`)}
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

const createStyles = (c: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    container: {
      marginBottom: 16,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 8,
    },
    wallName: {
      fontFamily: theme.fonts.bold,
      fontSize: 15,
      color: c.textPrimary,
    },
    wallMeta: {
      fontFamily: theme.fonts.regular,
      fontSize: 12,
      color: c.textSecondary,
    },
    body: {
      paddingLeft: 4,
    },
    topoWrap: {
      marginBottom: 10,
      borderRadius: theme.borderRadius.cardSmall,
      overflow: 'hidden',
    },
    topo: {
      width: 300,
      height: 200,
    },
    moreText: {
      fontFamily: theme.fonts.regular,
      fontSize: 12,
      color: c.textTertiary,
      textAlign: 'center',
      marginTop: 4,
    },
  });
