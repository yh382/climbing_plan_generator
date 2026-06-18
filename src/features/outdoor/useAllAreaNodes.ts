// src/features/outdoor/useAllAreaNodes.ts
// Window CD Phase 2 — preload + cache the whole-tree all-node pin source.
//
// Same native-standard SWR over AsyncStorage as useAllCrags, but the source
// is GET /outdoor/areas/nodes (EVERY display_kind, ~43k nodes + subtree
// composition) instead of the crag-tier-only /outdoor/areas/crags. The FE
// renders this single stable set client-side, clustering by display_kind +
// subtree_route_count (importance), with NO per-viewport refetch / pin
// pop-in (M3).
//
//   1. cache hit → render immediately (no spinner on warm start)
//   2. background fetch → compare data_version
//   3. version changed → swap in fresh items + persist (Mapbox setData
//      hot-replaces the static source)
//
// The compare relies on the BE returning a DETERMINISTIC hash for the empty
// set (sha1('') — pinned by BE test) so an empty DB doesn't loop refetch.

import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { outdoorApi } from './api';
import type { AreaNode } from './types';

const STORAGE_KEY = 'climmate_all_area_nodes_v1';

type CachedShape = {
  items: AreaNode[];
  data_version: string;
  fetched_at: number;
};

export type UseAllAreaNodesResult = {
  nodes: AreaNode[];
  loading: boolean;
  error: string | null;
};

export function useAllAreaNodes(): UseAllAreaNodesResult {
  const [nodes, setNodes] = useState<AreaNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    (async () => {
      // 1. Read cache, render immediately if hit.
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw && mounted) {
          const cached: CachedShape = JSON.parse(raw);
          setNodes(cached.items);
          setLoading(false);
        }
      } catch {
        /* ignore parse / storage errors — fall through to fetch */
      }

      // 2. Background fetch, compare data_version.
      try {
        const fresh = await outdoorApi.listAllAreaNodes();
        if (!mounted) return;
        const cachedRaw = await AsyncStorage.getItem(STORAGE_KEY);
        const cached: CachedShape | null = cachedRaw
          ? JSON.parse(cachedRaw)
          : null;

        if (!cached || cached.data_version !== fresh.data_version) {
          setNodes(fresh.items); // triggers Mapbox setData hot-replace
          await AsyncStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({
              items: fresh.items,
              data_version: fresh.data_version,
              fetched_at: Date.now(),
            } satisfies CachedShape),
          );
        }
        setLoading(false);
      } catch (e) {
        if (mounted) {
          setError(e instanceof Error ? e.message : 'Failed to load area nodes');
          setLoading(false);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  return { nodes, loading, error };
}
