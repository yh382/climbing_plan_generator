// src/features/outdoor/useAllCrags.ts
// CA-FU Phase C — preload + cache the full crag-tier pin source.
//
// Native-standard SWR over AsyncStorage:
//   1. cache hit → render immediately (no spinner on warm start)
//   2. background fetch /outdoor/areas/crags → compare data_version
//   3. version changed → swap in fresh items + persist (Mapbox setData
//      hot-replaces the static cluster source)
//
// The compare relies on the BE returning a DETERMINISTIC hash for the empty
// set (sha1('') — pinned by BE test). Without it an empty DB would loop
// refetch forever. The 16-char truncation is cache-validation only, not
// security (birthday collision ~2^32 ≫ a client's version churn).

import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { outdoorApi } from './api';
import type { CragPin } from './types';

const STORAGE_KEY = 'climmate_all_crags_v1';

type CachedShape = {
  items: CragPin[];
  data_version: string;
  fetched_at: number;
};

export type UseAllCragsResult = {
  crags: CragPin[];
  loading: boolean;
  error: string | null;
};

export function useAllCrags(): UseAllCragsResult {
  const [crags, setCrags] = useState<CragPin[]>([]);
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
          setCrags(cached.items);
          setLoading(false);
        }
      } catch {
        /* ignore parse / storage errors — fall through to fetch */
      }

      // 2. Background fetch, compare data_version.
      try {
        const fresh = await outdoorApi.listAllCrags();
        if (!mounted) return;
        const cachedRaw = await AsyncStorage.getItem(STORAGE_KEY);
        const cached: CachedShape | null = cachedRaw
          ? JSON.parse(cachedRaw)
          : null;

        if (!cached || cached.data_version !== fresh.data_version) {
          setCrags(fresh.items); // triggers Mapbox setData hot-replace
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
          setError(e instanceof Error ? e.message : 'Failed to load crags');
          setLoading(false);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  return { crags, loading, error };
}
