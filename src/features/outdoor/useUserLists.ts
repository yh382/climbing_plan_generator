// src/features/outdoor/useUserLists.ts
// Optimistic + rollback hook for the current user's outdoor route lists.

import { useCallback, useEffect, useRef, useState } from "react";
import { outdoorListsApi, type CreateListInput } from "./listsApi";
import type { OutdoorList, RouteContainment } from "./types";

type ContainmentMap = Map<string, string>; // listId → itemId (for a specific route)

export function useMyLists() {
  const [lists, setLists] = useState<OutdoorList[]>([]);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);

  const refresh = useCallback(async () => {
    try {
      const data = await outdoorListsApi.listMine();
      if (mountedRef.current) setLists(data);
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    (async () => {
      await refresh();
      if (mountedRef.current) setLoading(false);
    })();
    return () => {
      mountedRef.current = false;
    };
  }, [refresh]);

  const create = useCallback(async (body: CreateListInput): Promise<OutdoorList> => {
    const created = await outdoorListsApi.create(body);
    if (mountedRef.current) setLists((prev) => [created, ...prev]);
    return created;
  }, []);

  const remove = useCallback(async (listId: string) => {
    const prev = lists;
    setLists((p) => p.filter((l) => l.id !== listId));
    try {
      await outdoorListsApi.delete(listId);
    } catch {
      setLists(prev);
    }
  }, [lists]);

  return { lists, loading, refresh, create, remove };
}

/**
 * Returns which of the current user's lists already contain `routeId`,
 * and a `toggle(listId)` that adds/removes the route optimistically.
 * Used by AddToListSheet.
 */
export function useRouteContainment(routeId: string | undefined) {
  const [map, setMap] = useState<ContainmentMap>(new Map());
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    if (!routeId) {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const data: RouteContainment[] = await outdoorListsApi.listsContainingRoute(routeId);
        if (mountedRef.current) {
          setMap(new Map(data.map((c) => [c.list_id, c.item_id])));
        }
      } catch {
        // silent
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    })();
    return () => {
      mountedRef.current = false;
    };
  }, [routeId]);

  const contains = useCallback((listId: string) => map.has(listId), [map]);

  const toggle = useCallback(
    async (listId: string): Promise<"added" | "removed"> => {
      if (!routeId) throw new Error("routeId missing");
      const existingItemId = map.get(listId);
      const was = existingItemId !== undefined;

      // optimistic
      setMap((prev) => {
        const next = new Map(prev);
        if (was) next.delete(listId);
        else next.set(listId, "__optimistic__");
        return next;
      });

      try {
        if (was) {
          await outdoorListsApi.removeItem(listId, existingItemId!);
          return "removed";
        } else {
          const item = await outdoorListsApi.addItem(listId, routeId);
          setMap((prev) => {
            const next = new Map(prev);
            next.set(listId, item.id);
            return next;
          });
          return "added";
        }
      } catch (err) {
        // rollback
        setMap((prev) => {
          const next = new Map(prev);
          if (was) next.set(listId, existingItemId!);
          else next.delete(listId);
          return next;
        });
        throw err;
      }
    },
    [routeId, map]
  );

  return { contains, toggle, loading };
}
