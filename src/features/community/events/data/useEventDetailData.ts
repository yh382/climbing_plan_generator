import { useEffect, useState, useCallback } from "react";
import { useLocalSearchParams } from "expo-router";
import { eventApi } from "../api";
import { eventOutToDetailModel } from "../types";
import type { EventOut } from "../types";
import type { EventDetailModel } from "./types";

export function useEventDetailData(): {
  event: EventDetailModel | null;
  eventRaw: EventOut | null;
  joined: boolean;
  loading: boolean;
  onToggleJoin: () => void;
} {
  const params = useLocalSearchParams<{ eventId?: string }>();
  const eventId = params.eventId;

  const [eventRaw, setEventRaw] = useState<EventOut | null>(null);
  const [loading, setLoading] = useState(true);
  const [joined, setJoined] = useState(false);

  useEffect(() => {
    if (!eventId) return;
    setLoading(true);
    eventApi
      .getDetail(eventId)
      .then((e) => {
        setEventRaw(e);
        setJoined(e.is_registered);
      })
      .finally(() => setLoading(false));
  }, [eventId]);

  const onToggleJoin = useCallback(async () => {
    if (!eventId) return;
    if (joined) {
      await eventApi.unregister(eventId);
      setJoined(false);
    } else {
      await eventApi.register(eventId);
      setJoined(true);
    }
  }, [eventId, joined]);

  const event = eventRaw ? eventOutToDetailModel(eventRaw) : null;

  return { event, eventRaw, joined, loading, onToggleJoin };
}
