// src/features/mapscreen/components/OutdoorAreaFooter.tsx
// CD Phase 1a — glass-union footer for the outdoor area sheet, mirroring
// the gym sheet's GymDetailFooter (Apple Maps `⭐ ⤴` floating capsule).
// Mounted via the primary TrueSheet's `footer` prop so iOS pins it outside
// the scrollable area in every detent — it floats over BOTH the Overview
// and Routes/Areas tabs (plan decision: "actions only in Overview; optional
// header/footer keeps a quick ♡ save").
//
// Owns its own saved state via the polymorphic savedSpotsApi (target_type
// region/area/crag). Share mirrors AreaActions (name + Apple Maps deep link
// when coordinates are known).

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Share } from 'react-native';

import {
  PlaceSheetFooter,
  type PlaceSheetFooterAction,
} from '../../../components/shared/placeSheet';
import { savedSpotsApi } from '../../outdoor/savedSpotsApi';
import { useSavedSpots } from '../../outdoor/useSavedSpots';
import type { DisplayKind, SavedSpotTargetType } from '../../outdoor/types';

export type OutdoorAreaFooterTarget = {
  id: string;
  name: string;
  lat?: number | null;
  lng?: number | null;
  display_kind: DisplayKind;
};

type Props = {
  /** null while the area sheet has no resolved target yet. */
  area: OutdoorAreaFooterTarget | null;
  /** CD 1a — only the Overview tab shows the footer; Routes/Areas hides it.
   *  Kept mounted (saved-spots state survives) and gated here so switching
   *  tabs doesn't re-fetch the saved list or flicker the ♡. */
  visible?: boolean;
};

/** Maps the polymorphic display_kind to the bookmark target_type. Returns
 *  null for kinds that have no saved-spot target (country / state / wall) —
 *  the heart is hidden for those. */
function targetTypeForKind(k: DisplayKind): SavedSpotTargetType | null {
  switch (k) {
    case 'region': return 'region';
    case 'area': return 'area';
    case 'crag': return 'crag';
    default: return null;
  }
}

export function OutdoorAreaFooter({ area, visible = true }: Props) {
  const { items, refresh } = useSavedSpots();

  const targetType = area ? targetTypeForKind(area.display_kind) : null;
  // Match on (target_type, target_id) — SavedSpot is polymorphic, so pair
  // the kind with the id (mirrors GymsSavedSpotsRow). region/area/crag share
  // the unified outdoor_areas UUID space, so this is correctness hygiene.
  const serverSaved =
    !!area &&
    !!targetType &&
    items.some((s) => s.target_type === targetType && s.target_id === area.id);

  // Optimistic flip for instant ♡ feedback; reset to server truth on area
  // change and once refresh() lands.
  const [optimistic, setOptimistic] = useState<boolean | null>(null);
  useEffect(() => {
    setOptimistic(null);
  }, [area?.id]);
  const saved = optimistic ?? serverSaved;

  const handleFavorite = useCallback(async () => {
    if (!area || !targetType) return;
    const next = !saved;
    setOptimistic(next);
    try {
      if (next) await savedSpotsApi.save(targetType, area.id);
      else await savedSpotsApi.unsave(targetType, area.id);
      await refresh();
    } catch {
      // swallow — clearing optimistic falls back to serverSaved (revert)
    } finally {
      setOptimistic(null);
    }
  }, [area, targetType, saved, refresh]);

  const handleShare = useCallback(async () => {
    if (!area) return;
    const mapsUrl =
      area.lat != null && area.lng != null
        ? `https://maps.apple.com/?q=${encodeURIComponent(area.name)}&ll=${area.lat},${area.lng}`
        : undefined;
    try {
      await Share.share({
        title: area.name,
        message: mapsUrl ? `${area.name}\n${mapsUrl}` : area.name,
        ...(mapsUrl ? { url: mapsUrl } : {}),
      });
    } catch {}
  }, [area]);

  const actions = useMemo<PlaceSheetFooterAction[]>(
    () => [
      {
        key: 'share',
        icon: 'square.and.arrow.up',
        onPress: handleShare,
      },
      {
        key: 'favorite',
        icon: saved ? 'heart.fill' : 'heart',
        onPress: handleFavorite,
        // No bookmark target for this kind → hide the heart (footer keeps
        // just Share, capsule renders shorter).
        disabled: !targetType,
      },
    ],
    [saved, targetType, handleShare, handleFavorite],
  );

  if (!area || !visible) return null;

  return <PlaceSheetFooter actions={actions} unionId="outdoor-area-footer" />;
}

export default OutdoorAreaFooter;
