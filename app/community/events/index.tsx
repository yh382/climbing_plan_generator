// app/community/events/index.tsx
import { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import CollapsibleLargeHeader from "../../../src/components/CollapsibleLargeHeader";
import { eventApi } from "@/features/community/events/api";
import type { EventOut } from "@/features/community/events/types";
import EventCardRow from "@/features/community/events/EventCardRow";
import MineEventChip from "@/features/community/events/MineEventChip";

type EventFilter = "all" | "competition" | "meetup" | "workshop" | "other";

const WORKSHOP_CATS = ["workshop", "training", "clinic"];
const OTHER_CATS = ["festival", "route_setting", "other"];

const FILTER_CHIPS: { key: EventFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "competition", label: "Competition" },
  { key: "meetup", label: "Meetup" },
  { key: "workshop", label: "Workshop" },
  { key: "other", label: "Other" },
];

export default function EventsScreen() {
  const router = useRouter();
  const [events, setEvents] = useState<EventOut[]>([]);
  const [myEvents, setMyEvents] = useState<EventOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<EventFilter>("all");

  useEffect(() => {
    setLoading(true);
    Promise.all([
      eventApi.getEvents(),
      eventApi.getMyRegistrations(),
    ])
      .then(([all, my]) => {
        setEvents(all);
        setMyEvents(my);
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    return events.filter((e) => {
      if (filter === "all") return true;
      if (filter === "workshop") return WORKSHOP_CATS.includes(e.category);
      if (filter === "other") return OTHER_CATS.includes(e.category);
      return e.category === filter;
    });
  }, [events, filter]);

  const goToEvent = (id: string) => {
    router.push({
      pathname: "/community/events/[eventId]",
      params: { eventId: id },
    });
  };

  const LeftActions = (
    <TouchableOpacity onPress={() => router.back()} hitSlop={10} style={styles.iconBtn}>
      <Ionicons name="arrow-back" size={24} color="#111" />
    </TouchableOpacity>
  );

  const LargeTitle = <Text style={styles.largeTitle}>Events</Text>;
  const Subtitle = <Text style={styles.largeSubtitle}>Discover local climbing events</Text>;

  return (
    <CollapsibleLargeHeader
      backgroundColor="#FFF"
      smallTitle="Events"
      largeTitle={LargeTitle}
      subtitle={Subtitle}
      leftActions={LeftActions}
      contentContainerStyle={{ paddingBottom: 40 }}
      bottomInsetExtra={28}
    >
      {/* My registered events horizontal scroll */}
      {myEvents.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.myEventsRow}
        >
          {myEvents.map((e) => (
            <MineEventChip key={e.id} item={e} onPress={() => goToEvent(e.id)} />
          ))}
        </ScrollView>
      )}

      {/* Filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
      >
        {FILTER_CHIPS.map((chip) => {
          const active = filter === chip.key;
          return (
            <TouchableOpacity
              key={chip.key}
              style={[styles.filterChip, active && styles.filterChipActive]}
              onPress={() => setFilter(chip.key)}
            >
              <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                {chip.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Event list */}
      <View style={styles.listContainer}>
        {loading ? (
          <View style={{ padding: 40, alignItems: "center" }}>
            <ActivityIndicator size="large" color="#9CA3AF" />
          </View>
        ) : filtered.length === 0 ? (
          <View style={{ padding: 40, alignItems: "center" }}>
            <Text style={{ color: "#9CA3AF" }}>No events found.</Text>
          </View>
        ) : (
          filtered.map((event) => (
            <EventCardRow
              key={event.id}
              item={event}
              onPress={() => goToEvent(event.id)}
            />
          ))
        )}
      </View>
    </CollapsibleLargeHeader>
  );
}

const styles = StyleSheet.create({
  iconBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },

  largeTitle: { fontSize: 32, fontWeight: "800", color: "#111", lineHeight: 38 },
  largeSubtitle: { fontSize: 14, color: "#6B7280", marginTop: 2 },

  myEventsRow: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 6, gap: 10 },

  filterRow: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 6,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
  },
  filterChipActive: { backgroundColor: "#111" },
  filterChipText: { fontSize: 13, fontWeight: "600", color: "#6B7280" },
  filterChipTextActive: { color: "#FFF" },

  listContainer: { paddingHorizontal: 16, paddingTop: 12 },
});
