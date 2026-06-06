// src/features/mapscreen/useCragsOverview.ts
// BR Track D Day 7 follow-up — tier-1 Crag overview source.
//
// Loads ~15k crags (NA prod scale) **once** per app session via
// `outdoorApi.listCragsOverview()` and caches in module-level memory
// so re-mounts (e.g. navigating away from /map and back) reuse the
// cache without re-fetching.
//
// PLAN §3.2 redesign rationale (from 2026-06-06 dogfood feedback):
//   - Region-level (911 dots) had low climber recognition
//   - Bbox-driven RoutePinCluster in explore mode had jankiness — clusters
//     shifting on every pan because source data changed each refetch
//   - Industry standard (Apple Maps, Strava, AllTrails) = stable
//     pre-loaded source + `cluster:true` for visual aggregation
//   - Crag is the natural climber mental anchor ("Indian Creek" /
//     "Red Rocks" / "Yosemite Valley" — all are Crags in OpenBeta)
//
// Memory: ~2MB for 15k crags (JSON parsed in-place). Acceptable.
// Cold load: ~1-2s on 4G; subsequent mounts instant.

import { useEffect, useState } from 'react';

import { outdoorApi } from '../outdoor/api';
import type { CragOverview } from '../outdoor/types';

let _cache: CragOverview[] | null = null;
let _inflight: Promise<CragOverview[]> | null = null;

export interface UseCragsOverviewResult {
  crags: CragOverview[];
  loading: boolean;
  error: string | null;
}

export function useCragsOverview(enabled: boolean): UseCragsOverviewResult {
  const [crags, setCrags] = useState<CragOverview[]>(_cache ?? []);
  const [loading, setLoading] = useState(!_cache && enabled);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    if (_cache) {
      setCrags(_cache);
      setLoading(false);
      return;
    }
    if (_inflight) {
      // Another hook instance already started the fetch — piggyback
      _inflight
        .then((data) => {
          setCrags(data);
          setLoading(false);
        })
        .catch((e) => {
          setError(e?.message ?? 'Failed to load crags');
          setLoading(false);
        });
      return;
    }
    setLoading(true);
    setError(null);
    _inflight = outdoorApi
      .listCragsOverview({ status: 'approved', min_routes: 1 })
      .then((data) => {
        _cache = data;
        _inflight = null;
        return data;
      })
      .catch((e) => {
        _inflight = null;
        throw e;
      });
    _inflight
      .then((data) => {
        setCrags(data);
        setLoading(false);
      })
      .catch((e) => {
        setError(e?.message ?? 'Failed to load crags');
        setLoading(false);
      });
  }, [enabled]);

  return { crags, loading, error };
}
