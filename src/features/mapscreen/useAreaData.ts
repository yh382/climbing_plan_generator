// src/features/mapscreen/useAreaData.ts
// Region-mode data: top-level Region detail + scoped search.
//
// BR Track A rename: the top-level entity is now `Region` (was `Area`).
// Hook + caller-facing API names kept (`useAreaData`, `areaId` param,
// `area` field) to avoid cascading caller renames — Day 5e simplification
// already removed enough to make a rename feel like dead-weight churn.
//
// BR Track D Day 5e: `pins` + `loadWallsForPin` REMOVED. The legacy
// pre-aggregated `getMapPins` source was the only producer; with that
// gone, callers reach pins via `useViewportPins` (bbox-driven) and Wall
// pin tap → caller-local `focusOnWall`. See PLAN §3.2.

import { useCallback, useEffect, useState } from 'react';

import { outdoorApi } from '../outdoor/api';
import type { Region } from '../outdoor/types';

export interface UseAreaDataResult {
  /** The top-level Region (was Area pre-Track-A). Field name kept as
   *  `area` to avoid cascading caller renames; a future rename to
   *  `useRegionData` is fine but low ROI now. */
  area: Region | null;
  loading: boolean;
  /** Region-scoped search across all 5 levels — kept as a thin wrapper
   *  over `outdoorApi.search(q, regionId)` for now. Day 6 may switch to
   *  `searchOutdoor({ q, region_id })` for the typed-discriminator shape. */
  search: (query: string) => Promise<import('../outdoor/types').OutdoorRoute[]>;
}

export function useAreaData(areaId: string | undefined): UseAreaDataResult {
  // `areaId` is now a `region_id`; param name kept per the docstring above.
  const [area, setArea] = useState<Region | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!areaId) {
      setArea(null);
      return;
    }
    setLoading(true);
    outdoorApi
      .getRegion(areaId)
      .then((regionData) => {
        if (regionData) setArea(regionData);
      })
      .finally(() => setLoading(false));
  }, [areaId]);

  const search = useCallback(
    async (query: string) => {
      if (!areaId || !query.trim()) return [];
      return outdoorApi.search(query.trim(), areaId);
    },
    [areaId],
  );

  return { area, loading, search };
}
