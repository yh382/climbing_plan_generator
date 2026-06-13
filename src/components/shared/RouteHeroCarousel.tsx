// Route detail hero — full-bleed, flush-to-top photo carousel + a
// "View Beta" pill overlay. Shared by the outdoor + indoor-gym route
// detail pages (both previously inlined an identical block).
//
// The whole cover is tappable (onPress → the route's beta viewer). Each
// FlatList item is wrapped in a Pressable (not the outer View) so a
// horizontal swipe still drives carousel paging — Pressable fires only on
// clean taps. Callers pass whatever photo set they want as the hero:
// outdoor merges beta thumbnails + route photos; gym passes route.photos.

import { useMemo } from 'react';
import {
  Dimensions,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

import { useSettings } from '../../contexts/SettingsContext';
import { theme } from '../../lib/theme';
import { useThemeColors } from '../../lib/useThemeColors';

const SCREEN_W = Dimensions.get('window').width;
const PHOTO_H = SCREEN_W * 0.82;

type Props = {
  /** Hero images, in display order. Only `url` is used. */
  photos: Array<{ url: string }>;
  /** Tap target for the whole cover (typically: open the beta viewer). */
  onPress: () => void;
};

export function RouteHeroCarousel({ photos, onPress }: Props) {
  const colors = useThemeColors();
  const { tr } = useSettings();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.photoWrap}>
      {photos.length > 0 ? (
        <FlatList
          horizontal
          pagingEnabled
          data={photos}
          keyExtractor={(_, i) => `photo-${i}`}
          showsHorizontalScrollIndicator={false}
          renderItem={({ item }) => (
            <Pressable onPress={onPress}>
              <Image
                source={{ uri: item.url }}
                style={styles.photo}
                contentFit="cover"
              />
            </Pressable>
          )}
        />
      ) : (
        <Pressable
          onPress={onPress}
          style={[styles.photo, styles.photoPlaceholder]}
        >
          <Ionicons name="image-outline" size={40} color={colors.textTertiary} />
        </Pressable>
      )}
      <View style={styles.viewBetaPill} pointerEvents="none">
        <Ionicons name="videocam" size={14} color="#fff" />
        <Text style={styles.viewBetaText}>{tr('查看 Beta', 'View Beta')}</Text>
      </View>
    </View>
  );
}

const createStyles = (c: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    photoWrap: { position: 'relative' },
    photo: { width: SCREEN_W, height: PHOTO_H },
    photoPlaceholder: {
      backgroundColor: c.backgroundSecondary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    viewBetaPill: {
      position: 'absolute',
      left: 12,
      bottom: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 14,
      backgroundColor: 'rgba(0,0,0,0.5)',
    },
    viewBetaText: {
      color: '#fff',
      fontFamily: theme.fonts.medium,
      fontSize: 12,
    },
  });
