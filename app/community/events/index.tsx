// app/community/events/index.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { useNavigation } from "@react-navigation/native";
import { NATIVE_HEADER_LARGE } from "@/lib/nativeHeaderOptions";
import { HeaderButton } from "@/components/ui/HeaderButton";
import { useThemeColors } from "@/lib/useThemeColors";
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
  const navigation = useNavigation();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [events, setEvents] = useState<EventOut[]>([]);
  const [myEvents, setMyEvents] = useState<EventOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<EventFilter>("all");

  React.useLayoutEffect(() => {
    navigation.setOptions({
      ...NATIVE_HEADER_LARGE,
      title: "Events",
      headerLeft: () => (
        <HeaderButton icon="chevron.backward" onPress={() => router.back()} />
      ),
    });
  }, [navigation, router]);

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

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ paddingBottom: 40 }}
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
              activeOpacity={0.8}
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
            <ActivityIndicator size="large" color={colors.textTertiary} />
          </View>
        ) : filtered.length === 0 ? (
          <View style={{ padding: 40, alignItems: "center" }}>
            <Text style={{ color: colors.textSecondary }}>No events found.</Text>
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
    </ScrollView>
  );
}

const createStyles = (colors: ReturnType<typeof useThemeColors>) => StyleSheet.create({
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
    borderRadius: 999,
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 0.5,
    borderColor: colors.border,
  },
  filterChipActive: { backgroundColor: colors.pillBackground, borderColor: colors.pillBackground },
  filterChipText: { fontSize: 13, fontWeight: "600", color: colors.textSecondary },
  filterChipTextActive: { color: colors.pillText },

  listContainer: { paddingHorizontal: 16, paddingTop: 12 },
});
