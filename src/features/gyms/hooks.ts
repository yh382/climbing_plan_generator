import { useState, useEffect, useCallback } from 'react';
import { gymCommunityApi, RecentGym, GymSummary } from './api';

// ---- Recent Gym (Home card) ----

export function useRecentGym() {
  const [recentGym, setRecentGym] = useState<RecentGym | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await gymCommunityApi.getRecentGym();
      setRecentGym(data);
    } catch {
      // swallow — no recent gym is fine
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);
  return { recentGym, loading, refresh };
}

// ---- Favorite Gyms ----

export function useFavoriteGyms() {
  const [favorites, setFavorites] = useState<GymSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await gymCommunityApi.getFavoriteGyms();
      setFavorites(data.items);
    } catch {
      // swallow
    } finally {
      setLoading(false);
    }
  }, []);

  const toggleFavorite = useCallback(async (gymId: string, currentlyFav: boolean) => {
    // Optimistic update
    if (currentlyFav) {
      setFavorites(prev => prev.filter(f => f.gym_id !== gymId));
    }
    try {
      if (currentlyFav) {
        await gymCommunityApi.unfavoriteGym(gymId);
      } else {
        await gymCommunityApi.favoriteGym(gymId);
      }
      // Refresh to get accurate data
      await refresh();
    } catch {
      // Revert on error — just refresh
      await refresh();
    }
  }, [refresh]);

  useEffect(() => { refresh(); }, [refresh]);
  return { favorites, loading, refresh, toggleFavorite };
}

// ---- Popular Gyms ----

export function usePopularGyms(limit = 10) {
  const [popularGyms, setPopularGyms] = useState<GymSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await gymCommunityApi.getPopularGyms(limit);
      setPopularGyms(data);
    } catch {
      // swallow
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => { refresh(); }, [refresh]);
  return { popularGyms, loading, refresh };
}

// ---- Standalone favorite toggle (for GymDetailScreen) ----

export function useGymFavoriteToggle() {
  const [favSet, setFavSet] = useState<Set<string>>(new Set());
  const [loaded, setLoaded] = useState(false);

  // Load user's favorites once
  useEffect(() => {
    gymCommunityApi.getFavoriteGyms()
      .then(data => {
        setFavSet(new Set(data.items.map(i => i.gym_id)));
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  const isFavorited = useCallback((gymId: string) => favSet.has(gymId), [favSet]);

  const toggle = useCallback(async (gymId: string, onFavorited?: () => void) => {
    const wasFav = favSet.has(gymId);
    // Optimistic
    setFavSet(prev => {
      const next = new Set(prev);
      if (wasFav) next.delete(gymId);
      else next.add(gymId);
      return next;
    });
    try {
      if (wasFav) await gymCommunityApi.unfavoriteGym(gymId);
      else {
        await gymCommunityApi.favoriteGym(gymId);
        onFavorited?.();
      }
    } catch {
      // Revert
      setFavSet(prev => {
        const next = new Set(prev);
        if (wasFav) next.add(gymId);
        else next.delete(gymId);
        return next;
      });
    }
  }, [favSet]);

  return { isFavorited, toggle, loaded };
}
