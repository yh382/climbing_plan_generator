// src/features/profile/hooks/useUserAscents.ts
//
// Window D1 — fetch the user's historical ascents from
// /users/{userId}/ascents and keep paginated state in memory. Maps the
// snake_case wire shape to the FE camelCase ``AggregatedClimbItem`` so
// pages can render with ``ClimbItemCard`` directly.

import { useCallback, useEffect, useRef, useState } from "react";

import { getUserAscents } from "../api";
import type {
  AscentsLocationFilter,
  AscentsWallFilter,
  UserAscentsApiItem,
} from "../types";
import type {
  AggregatedClimbItem,
  Feel,
  LocalDayLogItem,
} from "../../journal/loglist/types";

type UserAscentsState = {
  ascents: AggregatedClimbItem[];
  loading: boolean;
  refreshing: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  error: string | null;
};

const PAGE_SIZE = 20;

function wallTypeToLogType(wallType: string): LocalDayLogItem["type"] {
  if (wallType === "toprope" || wallType === "lead") return wallType;
  return "boulder";
}

function mapItem(remote: UserAscentsApiItem): AggregatedClimbItem {
  return {
    routeKey: remote.route_key,
    name: remote.name,
    grade: remote.grade,
    type: wallTypeToLogType(remote.wall_type),
    attemptsTotal: remote.attempts_total,
    sendCount: remote.send_count,
    style: remote.style,
    feel: ((remote.feel as Feel | null) ?? "solid") as Feel,
    note: remote.note ?? undefined,
    media: undefined,
    outdoor_route_id: remote.outdoor_route_id,
    gym_route_id: remote.gym_route_id,
    latestId: remote.latest_id,
    rawIds: remote.raw_ids,
    createdAt: new Date(remote.created_at).getTime(),
  };
}

export type UseUserAscentsOptions = {
  locationType: AscentsLocationFilter;
  wallType: AscentsWallFilter;
};

export function useUserAscents(
  userId: string | undefined,
  options: UseUserAscentsOptions,
) {
  const { locationType, wallType } = options;

  const [state, setState] = useState<UserAscentsState>({
    ascents: [],
    loading: true,
    refreshing: false,
    loadingMore: false,
    hasMore: false,
    error: null,
  });

  const cursorRef = useRef<string | null>(null);

  // Cancel late responses when filters change in quick succession.
  const requestIdRef = useRef(0);

  const fetchPage = useCallback(
    async (cursor: string | null, reqId: number) => {
      if (!userId) return null;
      try {
        const res = await getUserAscents(userId, {
          location_type: locationType,
          wall_type: wallType,
          limit: PAGE_SIZE,
          cursor: cursor ?? undefined,
        });
        if (reqId !== requestIdRef.current) return null;
        return res;
      } catch (err: any) {
        if (reqId !== requestIdRef.current) return null;
        setState((s) => ({ ...s, error: err?.message ?? "Failed to load" }));
        return null;
      }
    },
    [userId, locationType, wallType],
  );

  const loadFirstPage = useCallback(async () => {
    const reqId = ++requestIdRef.current;
    cursorRef.current = null;
    setState((s) => ({ ...s, loading: true, error: null }));
    const res = await fetchPage(null, reqId);
    if (res === null) {
      if (reqId === requestIdRef.current) {
        setState((s) => ({ ...s, loading: false }));
      }
      return;
    }
    cursorRef.current = res.next_cursor ?? null;
    setState({
      ascents: res.ascents.map(mapItem),
      loading: false,
      refreshing: false,
      loadingMore: false,
      hasMore: !!res.next_cursor,
      error: null,
    });
  }, [fetchPage]);

  const refresh = useCallback(async () => {
    const reqId = ++requestIdRef.current;
    cursorRef.current = null;
    setState((s) => ({ ...s, refreshing: true, error: null }));
    const res = await fetchPage(null, reqId);
    if (res === null) {
      if (reqId === requestIdRef.current) {
        setState((s) => ({ ...s, refreshing: false }));
      }
      return;
    }
    cursorRef.current = res.next_cursor ?? null;
    setState({
      ascents: res.ascents.map(mapItem),
      loading: false,
      refreshing: false,
      loadingMore: false,
      hasMore: !!res.next_cursor,
      error: null,
    });
  }, [fetchPage]);

  const loadMore = useCallback(async () => {
    if (!cursorRef.current) return;
    const reqId = requestIdRef.current; // don't bump; pagination piggybacks
    setState((s) => ({ ...s, loadingMore: true }));
    const cursor = cursorRef.current;
    const res = await fetchPage(cursor, reqId);
    if (res === null) {
      setState((s) => ({ ...s, loadingMore: false }));
      return;
    }
    cursorRef.current = res.next_cursor ?? null;
    setState((s) => ({
      ...s,
      ascents: [...s.ascents, ...res.ascents.map(mapItem)],
      loadingMore: false,
      hasMore: !!res.next_cursor,
    }));
  }, [fetchPage]);

  useEffect(() => {
    if (!userId) return;
    loadFirstPage();
  }, [userId, loadFirstPage]);

  return {
    ...state,
    refresh,
    loadMore,
  };
}
