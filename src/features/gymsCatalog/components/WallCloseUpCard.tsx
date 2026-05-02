// Indoor analog of RouteTopoCard. Outdoor routes have a wide topo line
// over a wall photo (3:1); indoor routes have a portrait close-up of the
// wall section showing the holds. Same lightbox + tap-to-zoom pattern,
// taller aspect ratio so vertical compositions don't crop.

import { useMemo } from 'react';
import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { presentImageViewer } from '../../../../modules/climmate-image-viewer/src';
import { useThemeColors } from '../../../lib/useThemeColors';
import { useSettings } from '../../../contexts/SettingsContext';
import { theme } from '../../../lib/theme';

type Props = {
  wallCloseUpUrl: string | null | undefined;
  routeName?: string | null;
};

export function WallCloseUpCard({ wallCloseUpUrl, routeName }: Props) {
  const colors = useThemeColors();
  const { tr } = useSettings();
  const styles = useMemo(() => createStyles(colors), [colors]);

  if (!wallCloseUpUrl) return null;

  const label = routeName
    ? `${tr('路线视图', 'WALL VIEW')} · ${routeName}`
    : tr('路线视图', 'WALL VIEW');

  return (
    <View style={styles.card}>
      <Pressable
        onPress={() =>
          presentImageViewer({ media: [{ url: wallCloseUpUrl, type: 'image' }] })
        }
        style={styles.imageWrapper}
      >
        <Image
          source={{ uri: wallCloseUpUrl }}
          style={styles.image}
          resizeMode="cover"
        />
        <View style={styles.labelOverlay}>
          <Text style={styles.labelText} numberOfLines={1}>
            {label}
          </Text>
        </View>
        <View style={styles.expandOverlay}>
          <Ionicons name="expand-outline" size={14} color="#fff" />
        </View>
      </Pressable>
    </View>
  );
}

const createStyles = (c: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    card: {
      borderRadius: 16,
      overflow: 'hidden',
      marginTop: 12,
      backgroundColor: c.cardBackground,
    },
    imageWrapper: {
      position: 'relative',
      width: '100%',
      // Taller than outdoor topo (3:1) — indoor wall shots are usually portrait
      // because a single route only spans one panel of the wall.
      aspectRatio: 4 / 5,
    },
    image: {
      width: '100%',
      height: '100%',
      backgroundColor: c.backgroundSecondary,
    },
    labelOverlay: {
      position: 'absolute',
      top: 10,
      left: 10,
      maxWidth: '80%',
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
      backgroundColor: 'rgba(0,0,0,0.55)',
    },
    labelText: {
      fontFamily: theme.fonts.medium,
      fontSize: 11,
      color: '#fff',
      letterSpacing: 0.8,
    },
    expandOverlay: {
      position: 'absolute',
      right: 10,
      bottom: 10,
      width: 26,
      height: 26,
      borderRadius: 13,
      backgroundColor: 'rgba(0,0,0,0.55)',
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
