// src/features/mapscreen/components/GymsSavedSpotsRow.tsx
// Apple-Maps-style "saved spots" strip rendered at the top of the gyms
// sheet content (both overseas MapScreenMapbox and CN GymsScreen). Each
// item = rounded-square cover avatar + name below (single line).
//
// BR Track D Day 6 (PLAN §11 + BR-FU-saved-spots-混合 merge):
//   The strip is now polymorphic. Item types in display order:
//     1. Gym favorites (`useFavoriteGyms`)
//     2. Region favorites (`useFavoriteRegionsStore` — legacy, still
//        backed by `/regions/{id}/favorite` until BR-Track-D-FU-cleanup)
//     3. Outdoor saved spots — area + crag + route (`useSavedSpots`,
//        polymorphic `/outdoor/saved-spots`; we filter out Region entries
//        to avoid duplicates with the legacy region source above)
//   Each tile carries a small icon discriminator so the user can tell
//   gym vs region vs area vs crag vs route at a glance.
//   Tap dispatches per type via callbacks owned by the parent screen.
//
// Sort priority: `highlightAreaId` (from `useMapSavedSpotHighlightStore`,
// set by the home `SavedSpotsCarousel` tap) → favorited → alphabetic.

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useThemeColors } from '../../../lib/useThemeColors';
import { useSettings } from '../../../contexts/SettingsContext';
import { theme } from '../../../lib/theme';
import type { Region, SavedSpot } from '../../outdoor/types';
import useFavoriteRegionsStore from '../../../store/useFavoriteRegionsStore';
import useMapSavedSpotHighlightStore from '../../../store/useMapSavedSpotHighlightStore';
import { useFavoriteGyms } from '../../gyms/hooks';
import { useSavedSpots } from '../../outdoor/useSavedSpots';
import type { GymSummary } from '../../gyms/api';
import SaveAreaHelpSheet, {
  type SaveAreaHelpSheetHandle,
} from './SaveAreaHelpSheet';

const MAX_SPOTS = 16;
const AVATAR_SIZE = 72;
const AVATAR_RADIUS = 18;

/** Unified tile shape for the strip. */
type SpotItem =
  | { kind: 'gym'; gym: GymSummary }
  | { kind: 'region'; region: Region }
  | { kind: 'area' | 'crag' | 'route'; spot: SavedSpot };

interface GymsSavedSpotsRowProps {
  /** Legacy Region-typed callback (kept for backward compat with the
   *  Day 5d API). Fires when the user taps a Region tile. */
  onSelectArea: (region: Region) => void;
  /** Day 6 — tap an Area-typed saved spot. Caller presents AreaInfoSheet. */
  onSelectArea4?: (spot: SavedSpot) => void;
  /** Day 6 — tap a Crag-typed saved spot. Caller presents CragInfoSheet. */
  onSelectCrag?: (spot: SavedSpot) => void;
  /** Day 6 — tap a Route-typed saved spot. Caller navigates to route detail. */
  onSelectRoute?: (spot: SavedSpot) => void;
  /** Day 6 — tap a favorited gym tile. */
  onSelectGym?: (gymId: string, gymName: string) => void;
}

export function GymsSavedSpotsRow({
  onSelectArea,
  onSelectArea4,
  onSelectCrag,
  onSelectRoute,
  onSelectGym,
}: GymsSavedSpotsRowProps) {
  const colors = useThemeColors();
  const { tr } = useSettings();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const highlightAreaId = useMapSavedSpotHighlightStore((s) => s.highlightAreaId);
  // Region source: legacy `/regions/favorites` — kept until the BE
  // dual-write to `/outdoor/saved-spots` lands.
  const regions = useFavoriteRegionsStore((s) => s.regions);
  const hydrateRegions = useFavoriteRegionsStore((s) => s.hydrate);
  // Polymorphic source: outdoor_list_items polymorphic table.
  const { items: spotsRaw } = useSavedSpots();
  // Gym source: legacy `/gyms/favorites` — gyms aren't in the polymorphic
  // saved_spots table.
  const { favorites: gymFavorites } = useFavoriteGyms();

  useEffect(() => {
    void hydrateRegions();
  }, [hydrateRegions]);

  // Combined + sorted strip items.
  const items = useMemo<SpotItem[]>(() => {
    const tiles: SpotItem[] = [];
    for (const g of gymFavorites) {
      tiles.push({ kind: 'gym', gym: g });
    }
    for (const r of regions) {
      tiles.push({ kind: 'region', region: r });
    }
    // Filter polymorphic source to non-region rows so we don't double-list
    // Regions that landed via the legacy /regions/favorite endpoint
    // (still the active write path on RegionInfoSheet — see hook docstring).
    for (const s of spotsRaw) {
      if (s.target_type === 'region') continue;
      tiles.push({ kind: s.target_type, spot: s });
    }
    // Stable sort: highlighted regions float first, otherwise alpha.
    tiles.sort((a, b) => {
      const aName = labelOf(a);
      const bName = labelOf(b);
      if (highlightAreaId) {
        const aHi = a.kind === 'region' && a.region.id === highlightAreaId;
        const bHi = b.kind === 'region' && b.region.id === highlightAreaId;
        if (aHi && !bHi) return -1;
        if (bHi && !aHi) return 1;
      }
      return aName.localeCompare(bName);
    });
    return tiles.slice(0, MAX_SPOTS);
  }, [gymFavorites, regions, spotsRaw, highlightAreaId]);

  const helpRef = useRef<SaveAreaHelpSheetHandle>(null);

  const handlePress = (item: SpotItem) => {
    switch (item.kind) {
      case 'gym':
        onSelectGym?.(item.gym.gym_id, item.gym.name);
        break;
      case 'region':
        onSelectArea(item.region);
        break;
      case 'area':
        onSelectArea4?.(item.spot);
        break;
      case 'crag':
        onSelectCrag?.(item.spot);
        break;
      case 'route':
        onSelectRoute?.(item.spot);
        break;
    }
  };

  return (
    <View style={styles.section}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>{tr('收藏', 'Saved')}</Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {items.length === 0 ? (
          <SaveAreaPlaceholder
            onPress={() => helpRef.current?.present()}
            styles={styles}
            label={tr('收藏', 'Save')}
          />
        ) : (
          items.map((item) => (
            <SpotAvatar
              key={tileKey(item)}
              item={item}
              onPress={() => handlePress(item)}
              styles={styles}
              colors={colors}
            />
          ))
        )}
      </ScrollView>
      <SaveAreaHelpSheet ref={helpRef} />
    </View>
  );
}

function tileKey(item: SpotItem): string {
  switch (item.kind) {
    case 'gym': return `gym:${item.gym.gym_id}`;
    case 'region': return `region:${item.region.id}`;
    case 'area':
    case 'crag':
    case 'route':
      return `${item.kind}:${item.spot.target_id}`;
  }
}

function labelOf(item: SpotItem): string {
  switch (item.kind) {
    case 'gym': return item.gym.name ?? '';
    case 'region': return item.region.name ?? '';
    default: return item.spot.target_name ?? '';
  }
}

function SaveAreaPlaceholder({
  onPress,
  styles,
  label,
}: {
  onPress: () => void;
  styles: ReturnType<typeof createStyles>;
  label: string;
}) {
  return (
    <Pressable style={styles.item} onPress={onPress}>
      <View style={[styles.avatar, styles.placeholderAvatar]}>
        <Ionicons
          name="add"
          size={36}
          color={styles.placeholderIconColor.color}
        />
      </View>
      <Text style={styles.name} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const FALLBACK_COVER = require('../../../../assets/images/placeholders/hero-default.jpg');

/** Type discriminator: icon shown in the bottom-right corner of the
 *  avatar. Region uses the existing "map" iconography; non-region
 *  outdoor types pick the same Ionicons set used by CragMenuSheet's
 *  Browse Up rows so the visual language is consistent. */
function iconForKind(kind: SpotItem['kind']): keyof typeof Ionicons.glyphMap {
  switch (kind) {
    case 'gym': return 'business';
    case 'region': return 'map-outline';
    case 'area': return 'folder-open-outline';
    case 'crag': return 'location-outline';
    case 'route': return 'flag-outline';
  }
}

function SpotAvatar({
  item,
  onPress,
  styles,
  colors,
}: {
  item: SpotItem;
  onPress: () => void;
  styles: ReturnType<typeof createStyles>;
  colors: ReturnType<typeof useThemeColors>;
}) {
  const [remoteFailed, setRemoteFailed] = useState(false);
  const [bundledFailed, setBundledFailed] = useState(false);

  // Pick a remote cover when one exists; the Gym/SavedSpot types
  // don't carry a cover_url yet, so they always fall through to the
  // bundled placeholder. Region is the only kind with `cover_url` today.
  const coverUrl = item.kind === 'region' ? item.region.cover_url : undefined;
  const useRemote = !remoteFailed && !!coverUrl;
  const useBundled = !useRemote && !bundledFailed;
  const name = labelOf(item);
  const initial = name?.[0] ?? '?';

  return (
    <Pressable style={styles.item} onPress={onPress}>
      <View style={styles.avatar}>
        {useRemote ? (
          <Image
            source={{ uri: coverUrl! }}
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
        <View style={styles.kindBadge}>
          <Ionicons
            name={iconForKind(item.kind)}
            size={12}
            color={colors.textPrimary}
          />
        </View>
      </View>
      <Text style={styles.name} numberOfLines={1}>
        {name}
      </Text>
    </Pressable>
  );
}

const createStyles = (c: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    section: {
      paddingTop: 4,
      paddingBottom: 14,
    },
    headerRow: {
      paddingHorizontal: 16,
      marginBottom: 8,
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
      position: 'relative',
    },
    placeholderAvatar: {
      borderWidth: 1.2,
      borderStyle: 'dashed',
      borderColor: c.border,
      backgroundColor: 'transparent',
      alignItems: 'center',
      justifyContent: 'center',
    },
    placeholderIconColor: {
      color: c.textSecondary,
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
    // Day 6 — small type discriminator badge in the bottom-right corner
    // of the avatar. Subtle background so it reads on both light and
    // dark covers without a hard outline.
    kindBadge: {
      position: 'absolute',
      bottom: 4,
      right: 4,
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: c.background,
      alignItems: 'center',
      justifyContent: 'center',
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
