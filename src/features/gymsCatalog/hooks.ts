// Hooks wrapping gymsCatalogApi. Keep them small + cancel-safe — the
// indoor map screen mounts/unmounts a lot during navigation, so a stale
// fetch landing after unmount must not setState.

import { useCallback, useEffect, useRef, useState } from 'react';
import { gymsCatalogApi } from './api';
import type {
  Gym,
  GymRoute,
  GymRouteListParams,
  WallSection,
} from './types';

export function useGymWithSections(gymId: string | null | undefined) {
  const [gym, setGym] = useState<Gym | null>(null);
  const [wallSections, setWallSections] = useState<WallSection[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const aliveRef = useRef(true);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  const reload = useCallback(async () => {
    if (!gymId) return;
    setLoading(true);
    setError(null);
    try {
      const [g, ws] = await Promise.all([
        gymsCatalogApi.getGym(gymId),
        gymsCatalogApi.listWallSections(gymId),
      ]);
      if (!aliveRef.current) return;
      setGym(g);
      setWallSections(ws);
    } catch (e) {
      if (!aliveRef.current) return;
      setError(e as Error);
    } finally {
      if (aliveRef.current) setLoading(false);
    }
  }, [gymId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { gym, wallSections, loading, error, reload };
}

export function useRoutesInGym(
  gymId: string | null | undefined,
  params?: GymRouteListParams,
) {
  const [routes, setRoutes] = useState<GymRoute[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const aliveRef = useRef(true);

  // Stringify params so the dep array is stable (object identity changes
  // on every parent render even when contents are equal).
  const paramsKey = JSON.stringify(params ?? {});

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!gymId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    gymsCatalogApi
      .listRoutesInGym(gymId, params)
      .then((rs) => {
        if (cancelled || !aliveRef.current) return;
        setRoutes(rs);
      })
      .catch((e) => {
        if (cancelled || !aliveRef.current) return;
        setError(e as Error);
      })
      .finally(() => {
        if (!cancelled && aliveRef.current) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gymId, paramsKey]);

  return { routes, loading, error };
}

export function useGymRoute(routeId: string | null | undefined) {
  const [route, setRoute] = useState<GymRoute | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!routeId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    gymsCatalogApi
      .getRoute(routeId)
      .then((r) => {
        if (!cancelled) setRoute(r);
      })
      .catch((e) => {
        if (!cancelled) setError(e as Error);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [routeId]);

  return { route, loading, error };
}
