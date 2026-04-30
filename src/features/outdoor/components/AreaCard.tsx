// src/features/outdoor/components/AreaCard.tsx
// Horizontal scroll card for Home page outdoor section

import { useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, InteractionManager } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useThemeColors } from '../../../lib/useThemeColors';
import { useSettings } from '../../../contexts/SettingsContext';
import { theme } from '../../../lib/theme';
import type { Area } from '../types';

interface AreaCardProps {
  area: Area;
  onPress: () => void;
}

export default function AreaCard({ area, onPress }: AreaCardProps) {
  const colors = useThemeColors();
  const { tr } = useSettings();
  const styles = useMemo(() => createStyles(colors), [colors]);

  // Defer navigation until press animation / scroll settles to avoid
  // Mapbox's "Unknown reactTag" error on the target crag-map page: the
  // native map view can get its camera/shape messages before its React
  // tree has finished mounting when we push during the touch release.
  const handlePress = useCallback(() => {
    InteractionManager.runAfterInteractions(() => {
      onPress();
    });
  }, [onPress]);

  return (
    <TouchableOpacity style={styles.card} onPress={handlePress} activeOpacity={0.8}>
      {/* Cover or gradient placeholder */}
      {area.cover_url ? (
        <Image source={{ uri: area.cover_url }} style={styles.cover} contentFit="cover" />
      ) : (
        <LinearGradient
          colors={[colors.accent, '#4A9A9B']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.cover}
        />
      )}

      {/* Text */}
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {area.name_en ?? area.name}
        </Text>
        <Text style={styles.meta}>
          {area.route_count ?? 0}+ {tr('条路线', 'routes')}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const createStyles = (c: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    card: {
      width: 140,
      borderRadius: theme.borderRadius.cardSmall,
      overflow: 'hidden',
      backgroundColor: c.cardBackground,
    },
    cover: {
      width: 140,
      height: 100,
    },
    info: {
      padding: 8,
    },
    name: {
      fontFamily: theme.fonts.bold,
      fontSize: 14,
      color: c.textPrimary,
    },
    meta: {
      fontFamily: theme.fonts.regular,
      fontSize: 12,
      color: c.textSecondary,
      marginTop: 2,
    },
  });
