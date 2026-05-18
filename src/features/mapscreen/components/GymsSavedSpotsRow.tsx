// src/features/mapscreen/components/GymsSavedSpotsRow.tsx
// Apple-Maps-style "saved spots" strip rendered at the top of the gyms
// sheet content (both overseas MapScreenMapbox and CN GymsScreen). Each
// item = rounded-square cover avatar + area name below (single line).
// Tap → `onSelectArea(area)` which is the screen's existing area-entry
// callback:
//   - overseas: `enterArea(area.id, area.name)` swaps `mode` in place
//     on the same MapView (single React tree, no cross-tab handoff)
//   - CN: `router.push('/outdoor/crag-map?areaId=…')` (legacy full-page,
//     Amap adapter for the unified screen isn't ready)
// Both shapes eliminate the cross-Saved-Spot switching bug we had with
// URL-params propagation through NativeTabs — the row hands the area
// straight to a screen-local callback rather than relying on the route
// layer to push a new param set.
//
// Sort priority: `highlightAreaId` (from `useMapSavedSpotHighlightStore`,
// set by the home `SavedSpotsCarousel` tap) → favorited → alphabetic.
// The highlighted area floats to index 0 so the user lands on /map with
// the spot they came from already at the front of the strip.

import { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
} from 'react-native';

import { useThemeColors } from '../../../lib/useThemeColors';
import { useSettings } from '../../../contexts/SettingsContext';
import { theme } from '../../../lib/theme';
import type { Area } from '../../outdoor/types';
import useFavoriteAreasStore from '../../../store/useFavoriteAreasStore';
import useMapSavedSpotHighlightStore from '../../../store/useMapSavedSpotHighlightStore';

const MAX_SPOTS = 12;
const AVATAR_SIZE = 72;
const AVATAR_RADIUS = 18;

interface GymsSavedSpotsRowProps {
  onSelectArea: (area: Area) => void;
}

export function GymsSavedSpotsRow({ onSelectArea }: GymsSavedSpotsRowProps) {
  const colors = useThemeColors();
  const { tr } = useSettings();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const highlightAreaId = useMapSavedSpotHighlightStore((s) => s.highlightAreaId);
  // BK: subscribe to the shared favorites store so the strip reacts when
  // the user toggles favorite in AreaInfoSheet.
  const areas = useFavoriteAreasStore((s) => s.areas);
  const hydrate = useFavoriteAreasStore((s) => s.hydrate);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const sorted = useMemo(() => {
    const list = [...areas];
    list.sort((a, b) => {
      // 1. Highlighted spot first
      if (highlightAreaId) {
        if (a.id === highlightAreaId && b.id !== highlightAreaId) return -1;
        if (b.id === highlightAreaId && a.id !== highlightAreaId) return 1;
      }
      // 2. Alphabetic
      return a.name.localeCompare(b.name);
    });
    return list.slice(0, MAX_SPOTS);
  }, [areas, highlightAreaId]);

  if (sorted.length === 0) return null;

  return (
    <View style={styles.section}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>{tr('收藏区域', 'Saved Areas')}</Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {sorted.map((area) => (
          <SavedAreaAvatar
            key={area.id}
            area={area}
            onPress={() => onSelectArea(area)}
            styles={styles}
          />
        ))}
      </ScrollView>
    </View>
  );
}

// Same bundled placeholder PlaceSheetHero uses — keeps the avatar
// visually consistent with the AreaInfo sheet hero when an area has no
// remote cover_url. Mock data (e.g. Wasatch Range) commonly omits
// cover_url, so falling back to a bundled image avoids showing a bare
// initial-letter chip for half the catalog.
const FALLBACK_COVER = require('../../../../assets/images/placeholders/hero-default.jpg');

// Individual avatar item. Owns its own image-load state so a 404 on
// `cover_url` cleanly downgrades to the bundled placeholder, and if
// THAT somehow fails too, to the initial-letter chip as last resort.
function SavedAreaAvatar({
  area,
  onPress,
  styles,
}: {
  area: Area;
  onPress: () => void;
  styles: ReturnType<typeof createStyles>;
}) {
  const [remoteFailed, setRemoteFailed] = useState(false);
  const [bundledFailed, setBundledFailed] = useState(false);

  // Source priority mirrors PlaceSheetHero: remote URL > bundled
  // placeholder > Ionicons / initial-letter backstop.
  const useRemote = !remoteFailed && !!area.cover_url;
  const useBundled = !useRemote && !bundledFailed;
  const initial = area.name?.[0] ?? '?';

  return (
    <Pressable style={styles.item} onPress={onPress}>
      <View style={styles.avatar}>
        {useRemote ? (
          <Image
            source={{ uri: area.cover_url! }}
            style={styles.avatarImage}
            resizeMode="cover"
            onError={() => setRemoteFailed(true)}
          />
        ) : useBundled ? (
          <Image
            source={FALLBACK_COVER}
            style={styles.avatarImage}
            resizeMode="cover"
            onError={() => setBundledFailed(true)}
          />
        ) : (
          <View style={[styles.avatarImage, styles.avatarFallback]}>
            <Text style={styles.avatarInitial}>{initial}</Text>
          </View>
        )}
      </View>
      <Text style={styles.name} numberOfLines={1}>
        {area.name}
      </Text>
    </Pressable>
  );
}

const createStyles = (c: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    section: {
      paddingTop: 12,
      paddingBottom: 16,
    },
    headerRow: {
      paddingHorizontal: 16,
      marginBottom: 10,
    },
    title: {
      fontFamily: theme.fonts.bold,
      fontSize: 15,
      color: c.textPrimary,
      letterSpacing: -0.2,
    },
    scroll: {
      paddingHorizontal: 16,
      gap: 14,
    },
    item: {
      width: AVATAR_SIZE + 12,
      alignItems: 'center',
    },
    avatar: {
      width: AVATAR_SIZE,
      height: AVATAR_SIZE,
      borderRadius: AVATAR_RADIUS,
      overflow: 'hidden',
      marginBottom: 8,
      backgroundColor: c.backgroundSecondary,
    },
    avatarImage: {
      width: '100%',
      height: '100%',
    },
    avatarFallback: {
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.backgroundSecondary,
    },
    avatarInitial: {
      fontFamily: theme.fonts.bold,
      fontSize: 28,
      color: c.textSecondary,
    },
    name: {
      fontFamily: theme.fonts.medium,
      fontSize: 12,
      color: c.textPrimary,
      textAlign: 'center',
      maxWidth: AVATAR_SIZE + 12,
    },
  });

export default GymsSavedSpotsRow;
