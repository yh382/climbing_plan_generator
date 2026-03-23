// src/features/home/exercises/favoritesApi.ts

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../../../lib/apiClient";

// ---------- API ----------

export async function getFavoriteIds(): Promise<string[]> {
  return api.get<string[]>("/users/me/favorite-exercises/ids");
}

export async function getFavoriteExercises(goal?: string): Promise<any[]> {
  const qs = goal ? `?goal=${encodeURIComponent(goal)}` : "";
  return api.get<any[]>(`/users/me/favorite-exercises${qs}`);
}

export async function addFavorite(exerciseId: string): Promise<void> {
  await api.post("/users/me/favorite-exercises", { exercise_id: exerciseId });
}

export async function removeFavorite(exerciseId: string): Promise<void> {
  await api.del(`/users/me/favorite-exercises/${encodeURIComponent(exerciseId)}`);
}

// ---------- Hook ----------

export function useFavoriteIds() {
  const [ids, setIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    (async () => {
      try {
        const data = await getFavoriteIds();
        if (mountedRef.current) setIds(new Set(data));
      } catch {
        // silent — user may not be logged in
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    })();
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const isFavorite = useCallback((id: string) => ids.has(id), [ids]);

  const toggle = useCallback(
    async (id: string) => {
      const was = ids.has(id);
      // optimistic update
      setIds((prev) => {
        const next = new Set(prev);
        was ? next.delete(id) : next.add(id);
        return next;
      });
      try {
        was ? await removeFavorite(id) : await addFavorite(id);
      } catch {
        // rollback
        setIds((prev) => {
          const next = new Set(prev);
          was ? next.add(id) : next.delete(id);
          return next;
        });
      }
    },
    [ids]
  );

  return { ids, loading, isFavorite, toggle };
}
