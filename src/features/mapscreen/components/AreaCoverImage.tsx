// src/features/mapscreen/components/AreaCoverImage.tsx
// Offline-safe cover image used by AreaMenuSheet and AreaInfoSheet.
// When URL is missing or fails to load, falls back to a default pattern
// (accent-tinted block + mountain icon) so the cover region keeps
// visual weight instead of collapsing.

import { useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useThemeColors } from '../../../lib/useThemeColors';

type Props = {
  url?: string | null;
  fallbackName: string;
  height?: number;
  topRadius?: boolean;
};

export function AreaCoverImage({
  url,
  fallbackName: _fallbackName,
  height = 160,
  topRadius = true,
}: Props) {
  const colors = useThemeColors();
  const [failed, setFailed] = useState(false);

  const radiusStyle = topRadius
    ? { borderTopLeftRadius: 10, borderTopRightRadius: 10 }
    : undefined;

  if (!url || failed) {
    return (
      <View
        style={[
          styles.cover,
          { height, backgroundColor: colors.sheetCardBackground },
          radiusStyle,
        ]}
      >
        <Ionicons name="triangle" size={44} color={colors.accent} />
      </View>
    );
  }

  return (
    <Image
      source={{ uri: url }}
      style={[styles.cover, { height }, radiusStyle]}
      onError={() => setFailed(true)}
    />
  );
}

const styles = StyleSheet.create({
  cover: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
