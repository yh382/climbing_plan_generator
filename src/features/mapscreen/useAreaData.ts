// src/features/mapscreen/useAreaData.ts
// Region-mode data: region detail + map pins + lazy wall/route fetching on
// pin tap. Extracted from app/outdoor/crag-map.tsx.
//
// BR Track A rename: the top-level entity is now `Region` (was `Area`).
// Filename + caller-facing API (`useAreaData`, `areaId` param) intentionally
// kept for minimum diff — Track D will rewrite this hook entirely and can
// rename it to `useRegionData` then.

import { useCallback, useEffect, useState } from 'react';

import { outdoorApi } from '../outdoor/api';
import type { Region, MapPin, Wall } from '../outdoor/types';

export interface UseAreaDataResult {
  /** The top-level Region (was Area pre-Track-A). Field name kept as
   *  `area` to avoid cascading caller renames; Track D cleans this up. */
  area: Region | null;
  pins: MapPin[];
  loading: boolean;
  loadWallsForPin: (pin: MapPin) => Promise<Wall[]>;
  search: (query: string) => Promise<import('../outdoor/types').OutdoorRoute[]>;
}

export function useAreaData(areaId: string | undefined): UseAreaDataResult {
  // `areaId` is now a `region_id`; param name kept per the docstring above.
  const [area, setArea] = useState<Region | null>(null);
  const [pins, setPins] = useState<MapPin[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!areaId) {
      setArea(null);
      setPins([]);
      return;
    }
    setLoading(true);
    Promise.all([outdoorApi.getRegion(areaId), outdoorApi.getMapPins(areaId)])
      .then(([regionData, pinData]) => {
        if (regionData) setArea(regionData);
        setPins(pinData ?? []);
      })
      .finally(() => setLoading(false));
  }, [areaId]);

  // Multi-level fetch based on pin kind. Post-rename hierarchy:
  //   Region → Area → Crag → Wall → Route
  const loadWallsForPin = useCallback(async (pin: MapPin): Promise<Wall[]> => {
    // Route-level pin — reconstruct the wall from the route pin's own
    // metadata. BK: synthetic walls aren't in `pins` anymore (they're
    // deduped against parent Crag for visual cleanliness), so we rely
    // on `parent_id` + `parent_name` shipped on the route pin itself
    // rather than looking up a wall pin.
    if (pin.level === 'route') {
      const parentId = pin.parent_id;
      if (!parentId) return [];
      const wallRoutes = await outdoorApi.getRoutes(parentId);
      return [
        {
          id: parentId,
          crag_id: '',
          name: pin.parent_name ?? '',
          lat: pin.lat,
          lng: pin.lng,
          sort_order: 0,
          status: 'approved',
          route_count: wallRoutes.length,
          routes: wallRoutes,
        },
      ];
    }
    if (pin.level === 'wall') {
      const wallRoutes = await outdoorApi.getRoutes(pin.id);
      return [
        {
          id: pin.id,
          crag_id: '',
          name: pin.name,
          lat: pin.lat,
          lng: pin.lng,
          sort_order: 0,
          status: 'approved',
          route_count: wallRoutes.length,
          routes: wallRoutes,
        },
      ];
    }
    if (pin.level === 'crag') {
      const cragWalls = await outdoorApi.getWalls(pin.id);
      return Promise.all(
        cragWalls.map(async (w) => ({ ...w, routes: await outdoorApi.getRoutes(w.id) })),
      );
    }
    // area: expand to all crags → walls → routes
    const crags = await outdoorApi.getCrags(pin.id);
    const allWalls: Wall[] = [];
    for (const crag of crags) {
      const ws = await outdoorApi.getWalls(crag.id);
      const wsWithRoutes = await Promise.all(
        ws.map(async (w) => ({ ...w, routes: await outdoorApi.getRoutes(w.id) })),
      );
      allWalls.push(...wsWithRoutes);
    }
    return allWalls;
  }, [pins]);

  const search = useCallback(
    async (query: string) => {
      if (!areaId || !query.trim()) return [];
      return outdoorApi.search(query.trim(), areaId);
    },
    [areaId],
  );

  return { area, pins, loading, loadWallsForPin, search };
}
