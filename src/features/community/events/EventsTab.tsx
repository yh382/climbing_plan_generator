// src/features/community/events/EventsTab.tsx
import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from "react-native";
import { theme } from "@/lib/theme";
import { useThemeColors } from "@/lib/useThemeColors";
import { useRouter } from "expo-router";

import { eventApi } from "./api";
import type { EventOut } from "./types";
import MineEventChip from "./MineEventChip";
import EventCardRow from "./EventCardRow";

export type EventFilterKey = "all" | "competition" | "meetup" | "training" | "route_setting" | "youth" | "community" | "indoor" | "outdoor";

export const EVENT_FILTERS: Array<{ key: EventFilterKey; label: string }> = [
  { key: "all", label: "All" },
  { key: "competition", label: "Competition" },
  { key: "meetup", label: "Meetup" },
  { key: "training", label: "Training" },
  { key: "route_setting", label: "Routesetting" },
  { key: "youth", label: "Youth" },
  { key: "community", label: "Community" },
  { key: "indoor", label: "Indoor" },
  { key: "outdoor", label: "Outdoor" },
];

export default function EventsTab({
  filter = "all",
  onPressViewAllMine,
  onPressEvent,
}: {
  filter?: EventFilterKey;
  onPressViewAllMine?: () => void;
  onPressEvent?: (item: EventOut) => void;
}) {
  const router = useRouter();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [events, setEvents] = useState<EventOut[]>([]);
  const [myEvents, setMyEvents] = useState<EventOut[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([eventApi.getEvents(), eventApi.getMyRegistrations().catch(() => [])])
      .then(([allEvents, registrations]) => {
        setEvents(allEvents);
        setMyEvents(registrations);
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = events.filter((e) => {
    if (filter === "all") return true;
    if (filter === "indoor" || filter === "outdoor") return e.venue_type === filter;
    return e.category === filter;
  });

  const handlePressEvent = (item: EventOut) => {
    if (onPressEvent) return onPressEvent(item);
    router.push(`/community/events/${item.id}`);
  };

  const handlePressViewAllMine = () => {
    if (onPressViewAllMine) return onPressViewAllMine();
    router.push("/community/events");
  };

  if (loading) {
    return (
      <View style={{ paddingVertical: 40, alignItems: "center" }}>
        <ActivityIndicator size="small" color="#9CA3AF" />
      </View>
    );
  }

  return (
    <View style={{ paddingBottom: 120 }}>
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>My Events</Text>
        <TouchableOpacity onPress={handlePressViewAllMine} activeOpacity={0.8}>
          <Text style={styles.viewAll}>View all</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.rowH}
      >
        {myEvents.length === 0 ? (
          <View style={{ paddingHorizontal: 16, paddingVertical: 10 }}>
            <Text style={{ color: colors.textTertiary, fontFamily: theme.fonts.medium }}>No registered events yet.</Text>
          </View>
        ) : (
          myEvents.map((e, idx) => (
            <View key={e.id} style={idx === 0 ? undefined : styles.hSpacer}>
              <MineEventChip item={e} onPress={() => handlePressEvent(e)} />
            </View>
          ))
        )}
      </ScrollView>

      <View style={[styles.sectionHeaderRow, { marginTop: 18 }]}>
        <Text style={styles.sectionTitle}>What's New</Text>
      </View>

      <View style={{ paddingHorizontal: 16 }}>
        {filtered.length === 0 ? (
          <Text style={{ color: colors.textTertiary, fontFamily: theme.fonts.medium, paddingVertical: 10 }}>
            No events found.
          </Text>
        ) : (
          filtered.map((e) => (
            <EventCardRow key={e.id} item={e} onPress={() => handlePressEvent(e)} />
          ))
        )}
      </View>
    </View>
  );
}

const createStyles = (colors: ReturnType<typeof useThemeColors>) => StyleSheet.create({
  sectionHeaderRow: {
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  sectionTitle: { fontSize: 16, fontFamily: theme.fonts.black, color: colors.textPrimary },
  viewAll: { fontSize: 12, fontFamily: theme.fonts.bold, color: colors.textTertiary },
  rowH: { paddingHorizontal: 16, paddingBottom: 2 },
  hSpacer: { marginLeft: 12 },
});
