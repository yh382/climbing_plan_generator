import { useState } from 'react';
import {
  Image,
  StyleSheet,
  View,
  useWindowDimensions,
  type ImageSourcePropType,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useThemeColors } from '../../../lib/useThemeColors';

type Props = {
  imageUrl?: string | null;
  fallbackIcon: keyof typeof Ionicons.glyphMap;
  /** Static `require()`'d image used when `imageUrl` is empty. Lets
   *  callers ship a bundled placeholder (e.g. a generic gym/area
   *  cover) so the sheet never shows a bare icon. The Ionicons
   *  fallback is only used as a final backstop if neither imageUrl
   *  nor placeholderSource is provided. */
  placeholderSource?: ImageSourcePropType;
  /** Optional fixed pixel height. When omitted, height is computed
   *  from `aspectRatio` × the on-screen width minus side margins. */
  height?: number;
  /** Width-to-height ratio. Ignored when `height` is set. Default 16:7
   *  keeps the hero compact on a sheet. Image defaults to `cover` so
   *  wider uploads crop top/bottom rather than stretch. */
  aspectRatio?: number;
};

const SIDE_MARGIN = 12;
const TOP_MARGIN = 12;

/**
 * Cover card at the top of a place sheet (gym / area).
 *
 * Width and height are derived from `useWindowDimensions` rather than
 * RN's `aspectRatio` style — `aspectRatio` inside a column flex
 * parent (ScrollView contentContainer here) intermittently
 * mis-computes the cross-axis size, which manifests as asymmetric
 * left/right margins. Hard-coded `width: screenWidth - 2 × side` +
 * matching `height` sidesteps that quirk and guarantees a centered
 * card on every device.
 */
export function PlaceSheetHero({
  imageUrl,
  fallbackIcon,
  placeholderSource,
  height,
  aspectRatio = 16 / 7,
}: Props) {
  const colors = useThemeColors();
  const { width: screenWidth } = useWindowDimensions();
  const [failed, setFailed] = useState(false);

  const cardWidth = screenWidth - SIDE_MARGIN * 2;
  const cardHeight = height != null ? height : cardWidth / aspectRatio;

  // Source priority: remote URL > bundled placeholder > Ionicons icon.
  // `failed` flips to true when a remote URL fails to load — we then
  // try the bundled placeholder before the icon backstop.
  const useRemote = !!imageUrl && !failed;
  const useBundledPlaceholder = !useRemote && !!placeholderSource;
  const useIconFallback = !useRemote && !useBundledPlaceholder;

  return (
    <View
      style={[
        styles.wrap,
        {
          width: cardWidth,
          height: cardHeight,
          backgroundColor: useIconFallback
            ? colors.sheetCardBackground
            : undefined,
        },
      ]}
    >
      {useRemote ? (
        <Image
          source={{ uri: imageUrl! }}
          style={styles.image}
          resizeMode="cover"
          onError={() => setFailed(true)}
        />
      ) : useBundledPlaceholder ? (
        <Image
          source={placeholderSource!}
          style={styles.image}
          resizeMode="cover"
        />
      ) : (
        <View style={styles.fallback}>
          <Ionicons name={fallbackIcon} size={44} color={colors.accent} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    // alignSelf: 'center' centers the explicit-width card inside any
    // flex parent, so the same 12pt gap shows on both sides
    // regardless of the parent's alignItems setting.
    alignSelf: 'center',
    marginTop: TOP_MARGIN,
    // Concentric corner: sheet outer radius (iOS 26 ≈ 38) minus the
    // 12pt margin reads as ~26-28 for the inner card.
    borderRadius: 28,
    overflow: 'hidden',
  },
  fallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
});
