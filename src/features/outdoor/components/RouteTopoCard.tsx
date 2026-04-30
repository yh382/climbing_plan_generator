import { useMemo, useState } from 'react';
import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ImageViewer from '../../../components/shared/ImageViewer';
import { useThemeColors } from '../../../lib/useThemeColors';
import { useSettings } from '../../../contexts/SettingsContext';
import { theme } from '../../../lib/theme';

type Props = {
  topoUrl: string | null | undefined;
};

export function RouteTopoCard({ topoUrl }: Props) {
  const [viewerOpen, setViewerOpen] = useState(false);
  const colors = useThemeColors();
  const { tr } = useSettings();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const hasTopo = !!topoUrl;

  return (
    <View style={styles.card}>
      {hasTopo ? (
        <>
          <Pressable onPress={() => setViewerOpen(true)} style={styles.imageWrapper}>
            <Image source={{ uri: topoUrl! }} style={styles.topoImage} resizeMode="cover" />
            <View style={styles.labelOverlay}>
              <Text style={styles.labelText}>TOPO</Text>
            </View>
            <View style={styles.expandOverlay}>
              <Ionicons name="expand-outline" size={14} color="#fff" />
            </View>
          </Pressable>
          <ImageViewer
            visible={viewerOpen}
            onClose={() => setViewerOpen(false)}
            media={[{ url: topoUrl!, type: 'image' }]}
          />
        </>
      ) : (
        <View style={[styles.imageWrapper, styles.placeholder]}>
          <View style={styles.labelOverlay}>
            <Text style={styles.labelText}>TOPO</Text>
          </View>
          <Ionicons name="image-outline" size={24} color={colors.textTertiary} />
          <Text style={styles.placeholderText}>{tr('暂无 TOPO', 'No topo yet')}</Text>
        </View>
      )}
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
      aspectRatio: 3 / 1,
    },
    topoImage: {
      width: '100%',
      height: '100%',
      backgroundColor: c.backgroundSecondary,
    },
    placeholder: {
      backgroundColor: c.backgroundSecondary,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
    },
    labelOverlay: {
      position: 'absolute',
      top: 10,
      left: 10,
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
    placeholderText: {
      fontFamily: theme.fonts.regular,
      fontSize: 12,
      color: c.textTertiary,
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
