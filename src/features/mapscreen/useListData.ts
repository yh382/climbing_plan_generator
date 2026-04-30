// src/features/mapscreen/useListData.ts
// List-mode data: fetch an OutdoorList and convert its items to MapPins.
// Extracted from app/outdoor/crag-map.tsx list mode.

import { useEffect, useMemo, useState } from 'react';

import { outdoorListsApi } from '../outdoor/listsApi';
import type { MapPin, OutdoorListDetail } from '../outdoor/types';

export interface UseListDataResult {
  listDetail: OutdoorListDetail | null;
  pins: MapPin[];
  loading: boolean;
}

export function useListData(listId: string | undefined): UseListDataResult {
  const [listDetail, setListDetail] = useState<OutdoorListDetail | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!listId) {
      setListDetail(null);
      return;
    }
    setLoading(true);
    outdoorListsApi
      .getDetail(listId)
      .then((d) => setListDetail(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [listId]);

  const pins: MapPin[] = useMemo(() => {
    if (!listDetail) return [];
    return listDetail.items
      .filter((it) => it.wall_lat != null && it.wall_lng != null && it.route)
      .map((it) => ({
        id: it.id,
        name: it.route?.name ?? '',
        lat: it.wall_lat!,
        lng: it.wall_lng!,
        route_count: 1,
        level: 'wall' as const,
      }));
  }, [listDetail]);

  return { listDetail, pins, loading };
}
