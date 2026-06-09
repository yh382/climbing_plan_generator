// src/features/mapscreen/components/outdoor-area-sheet/AreaActions.tsx
// CA Phase 4a — action buttons (Save / Share / Maps / Directions).
// Reuses existing PlaceSheetActions for visual + behavior parity with CragInfoSheet.

import { useMemo } from 'react';
import { Linking, Platform, Share } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useSettings } from '../../../../contexts/SettingsContext';
import {
  PlaceSheetActions,
  type PlaceSheetAction,
} from '../../../../components/shared/placeSheet';
import { sheetLabels } from './shared';

type Props = {
  areaId: string;
  areaName: string;
  lat?: number | null;
  lng?: number | null;
  saved: boolean;
  saveLoading?: boolean;
  /** Optional. When absent the Save action is omitted (parents that don't
   *  own bookmark wiring shouldn't show a no-op button). */
  onToggleSave?: () => void | Promise<void>;
};

export function AreaActions({
  areaId, areaName, lat, lng, saved, saveLoading, onToggleSave,
}: Props) {
  const { tr } = useSettings();

  const actions = useMemo<PlaceSheetAction[]>(() => {
    const list: PlaceSheetAction[] = [];

    if (onToggleSave) {
      list.push({
        icon: saved ? 'bookmark' : 'bookmark-outline',
        label: saved ? sheetLabels.saved(tr) : sheetLabels.save(tr),
        onPress: () => { void onToggleSave(); },
        loading: saveLoading,
        active: saved,
      });
    }

    list.push({
      icon: 'share-outline',
      label: sheetLabels.share(tr),
      onPress: () => {
        void Share.share({
          title: areaName,
          message: tr(
            `${areaName} · ClimMate`,
            `${areaName} on ClimMate`,
          ),
        });
      },
    });

    if (lat != null && lng != null) {
      list.push({
        icon: 'map-outline',
        label: sheetLabels.openInMaps(tr),
        onPress: () => {
          const q = encodeURIComponent(areaName);
          const url = Platform.select({
            ios: `maps://?ll=${lat},${lng}&q=${q}`,
            default: `geo:${lat},${lng}?q=${lat},${lng}(${q})`,
          })!;
          Linking.openURL(url).catch(() => {});
        },
      });
      list.push({
        icon: 'navigate-outline',
        label: sheetLabels.directions(tr),
        onPress: () => {
          const q = encodeURIComponent(areaName);
          const url = Platform.select({
            ios: `maps://?daddr=${lat},${lng}&q=${q}`,
            default: `google.navigation:q=${lat},${lng}`,
          })!;
          Linking.openURL(url).catch(() => {});
        },
      });
    }

    return list;
  }, [areaId, areaName, lat, lng, saved, saveLoading, onToggleSave, tr]);

  return <PlaceSheetActions actions={actions} />;
}
