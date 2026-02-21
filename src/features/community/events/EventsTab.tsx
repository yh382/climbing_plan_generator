// src/features/community/events/EventsTab.tsx
import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import SmartBottomSheet from "../components/SmartBottomSheet";
import { EVENTS_MOCK, EventItem, EventType, EventVenue } from "./mockEvents";
import MineEventChip from "./MineEventChip";
import EventCardRow from "./EventCardRow";

type FilterKey =
  | "all"
  | "nearby"
  | "followed_gyms"
  | "verified_only"
  | EventType
  | EventVenue;

const FILTERS: Array<{ key: FilterKey; label: string }> = [
  { key: "all", label: "All" },
  { key: "nearby", label: "Nearby" },
  { key: "followed_gyms", label: "Followed gyms" },
  { key: "verified_only", label: "Verified only" },

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
  onPressViewAllMine,
  onPressEvent,
}: {
  onPressViewAllMine?: () => void;
  onPressEvent?: (item: EventItem) => void;
}) {
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [sheetVisible, setSheetVisible] = useState(false);

  const filtered = useMemo(() => {
    const kw = search.trim().toLowerCase();
    return EVENTS_MOCK.filter((e) => {
      const matchSearch =
        kw.length === 0
          ? true
          : `${e.title} ${e.gym.name} ${e.gym.city}`.toLowerCase().includes(kw);

      const matchFilter =
        filter === "all"
          ? true
          : filter === "nearby"
            ? typeof e.gym.distanceMiles === "number" && e.gym.distanceMiles <= 10
            : filter === "followed_gyms"
              ? !!e.gym.followed
              : filter === "verified_only"
                ? !!e.gym.verified
                : filter === "indoor" || filter === "outdoor"
                  ? e.venue === filter
                  : e.type === filter;

      return matchSearch && matchFilter;
    });
  }, [search, filter]);

  const myEvents = useMemo(() => filtered.filter((e) => !!e.joined), [filtered]);
  const whatsNew = useMemo(() => filtered, [filtered]);

  const handlePressEvent = (item: EventItem) => {
    // ✅ 如果上层传了 handler，就交给上层；否则 EventsTab 自己导航
    if (onPressEvent) return onPressEvent(item);
    router.push(`/community/events/${item.id}`);
  };

  const handlePressViewAllMine = () => {
    if (onPressViewAllMine) return onPressViewAllMine();
    // 先给个默认行为：跳回 events 列表页顶部（你后续要专门页再加路由）
    router.push("/community/events");
  };

  return (
    <View style={{ paddingBottom: 120 }}>
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color="#9CA3AF" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search gyms or events"
            placeholderTextColor="#9CA3AF"
            style={styles.searchInput}
            returnKeyType="search"
          />
        </View>

        <TouchableOpacity style={styles.filterBtn} onPress={() => setSheetVisible(true)}>
          <Ionicons name="options-outline" size={20} color="#111" />
        </TouchableOpacity>
      </View>

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
            <Text style={{ color: "#9CA3AF", fontWeight: "700" }}>No registered events yet.</Text>
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
        <Text style={styles.sectionTitle}>What’s New</Text>
      </View>

      <View style={{ paddingHorizontal: 16 }}>
        {whatsNew.map((e) => (
          <EventCardRow key={e.id} item={e} onPress={() => handlePressEvent(e)} />
        ))}
      </View>

      <SmartBottomSheet visible={sheetVisible} onClose={() => setSheetVisible(false)} mode="list" title="Filter">
        <View style={{ padding: 16, paddingBottom: 24 }}>
          {FILTERS.map((f) => {
            const active = filter === f.key;
            return (
              <TouchableOpacity
                key={String(f.key)}
                style={styles.sheetRow}
                onPress={() => {
                  setFilter(f.key);
                  setSheetVisible(false);
                }}
              >
                <Text style={styles.sheetLabel}>{f.label}</Text>
                {active ? <Ionicons name="checkmark" size={18} color="#111" /> : null}
              </TouchableOpacity>
            );
          })}
        </View>
      </SmartBottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  searchRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, marginBottom: 14 },
  searchBox: {
    flex: 1,
    height: 40,
    borderRadius: 14,
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  searchInput: { flex: 1, fontSize: 14, color: "#111", marginLeft: 8 },
  filterBtn: { width: 44, height: 40, borderRadius: 14, backgroundColor: "#F3F4F6", alignItems: "center", justifyContent: "center", marginLeft: 10 },

  sectionHeaderRow: {
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  sectionTitle: { fontSize: 16, fontWeight: "900", color: "#111" },
  viewAll: { fontSize: 12, fontWeight: "800", color: "#9CA3AF" },

  rowH: { paddingHorizontal: 16, paddingBottom: 2 },
  hSpacer: { marginLeft: 12 },

  sheetRow: {
    height: 48,
    borderRadius: 12,
    backgroundColor: "#F9FAFB",
    paddingHorizontal: 14,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  sheetLabel: { fontSize: 14, fontWeight: "800", color: "#111" },
});
