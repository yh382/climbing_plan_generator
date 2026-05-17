// src/features/mapscreen/useGymsData.ts
// Gyms-mode data: initial GPS + nearby gym fetching + outdoor area pins.
// Extracted from GymsScreen so the unified MapScreen can share the exact
// same behavior. Keeps writing to useGymsStore for store-backed state
// (gyms, query, userLoc, center, selectedGym) so existing consumers
// (GymList, GymDetailCard) continue to work unchanged.

import { useCallback, useEffect, useMemo, useState } from 'react';
import * as Location from 'expo-location';

import { searchGymsNearby } from '../../../lib/poi';
import type { LatLng } from '../../../lib/poi/types';
import { useGymsStore } from '../../store/useGymsStore';
import { distanceKm } from '../gyms/utils/distance';
import { sortAndFilterGyms } from '../gyms/utils/sortAndFilter';
import { outdoorApi } from '../outdoor/api';
import type { Area } from '../outdoor/types';
import type { CragPin } from '../gyms/components/GymMap';

export interface UseGymsDataResult {
  areas: Area[];
  cragPins: CragPin[];
  areaDistances: Record<string, number>;
  /** defensive: manually refetch nearby after search submit / map idle. */
  fetchNearby: (c: LatLng, q: string) => Promise<void>;
}

export function useGymsData(enabled: boolean): UseGymsDataResult {
  const [areas, setAreas] = useState<Area[]>([]);
  const userLoc = useGymsStore((s) => s.userLoc);

  // defensive: gyms list distance must reflect user → gym, not center → gym.
  // Backend returns distance_m from the request lat/lng (= map center). After
  // the user taps a pin and the camera flies there, any subsequent refetch
  // would silently switch the list to show distances from the tapped gym.
  // We override client-side using real user position. Mirrors GymsScreen.
  const fetchNearby = useCallback(async (c: LatLng, q: string) => {
    const s = useGymsStore.getState();
    s.setLoading(true);
    s.setError(null);
    try {
      const raw = await searchGymsNearby(c, 30, q);
      const uLoc = s.userLoc;
      const normalized = uLoc
        ? raw.map((g) => ({
            ...g,
            distance_m: Math.round(distanceKm(uLoc, g.location) * 1000),
          }))
        : raw;
      const filtered = sortAndFilterGyms(normalized, c);
      s.setGyms(filtered);
    } catch (e: any) {
      s.setError(e?.message ?? '获取附近岩馆失败');
    } finally {
      s.setLoading(false);
    }
  }, []);

  // Initial location fetch + gyms load. Only runs when gyms-mode consumer
  // enables the hook (we don't want to grind GPS if the user deep-linked
  // into area mode and will never return to gyms).
  useEffect(() => {
    if (!enabled) return;
    const store = useGymsStore.getState();
    // Skip if we already have a user location from a previous mount.
    if (store.userLoc && store.gyms.length > 0) return;
    (async () => {
      try {
        store.setError(null);
        // defensive: permission denial is expected — fall back to keyword
        // search from a user-entered city. Text mirrors GymsScreen:174–177.
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          store.setError('未授权定位。你可以在搜索栏输入地址或城市。');
          return;
        }
        // defensive: getCurrentPositionAsync(Balanced) — cold start can take
        // several seconds; caller wraps in try/catch so failure doesn't
        // blank the whole map. Mirrors GymsScreen:179,186–188.
        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        const c = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        store.setUserLoc(c);
        store.setCenter(c);
        await fetchNearby(c, store.query);
      } catch (e: any) {
        store.setError(e?.message ?? '定位失败');
      }
    })();
  }, [enabled, fetchNearby]);

  // Outdoor area pins (fire-and-forget, non-blocking).
  // BK fix: dropped country='CN' hardcode — this hook now serves the
  // overseas MapboxMap as well, so it must return all approved areas
  // regardless of country. CN-only filtering lives in CragMap's own data
  // path; keeping the filter here was a stale assumption from before the
  // map split.
  useEffect(() => {
    if (!enabled) return;
    outdoorApi
      .listAreas({ status: 'approved' })
      .then((data) => {
        if (data) setAreas(data);
      })
      .catch(() => {});
  }, [enabled]);

  const cragPins: CragPin[] = useMemo(
    () =>
      areas
        .filter((a) => a.lat != null && a.lng != null)
        .map((a) => ({
          id: a.id,
          name: a.name,
          lat: a.lat!,
          lng: a.lng!,
          route_count: a.route_count,
          region: a.region,
        })),
    [areas],
  );

  const areaDistances = useMemo<Record<string, number>>(() => {
    if (!userLoc) return {};
    const out: Record<string, number> = {};
    for (const a of areas) {
      if (a.lat != null && a.lng != null) {
        out[a.id] = Math.round(distanceKm(userLoc, { lat: a.lat, lng: a.lng }) * 1000);
      }
    }
    return out;
  }, [areas, userLoc]);

  return { areas, cragPins, areaDistances, fetchNearby };
}
