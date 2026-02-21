// src/features/community/challenges/ChallengesTab.tsx
import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import SmartBottomSheet from "../components/SmartBottomSheet";
import ChallengeCardRow from "./ChallengeCardRow";
import JoinedChallengeChip from "./JoinedChallengeChip";
import { CHALLENGES_MOCK, ChallengeCategory, ChallengeItem } from "./mockChallenges";

type FilterKey = "all" | "joined" | ChallengeCategory;

const FILTERS: Array<{ key: FilterKey; label: string }> = [
  { key: "all", label: "All" },
  { key: "joined", label: "Joined" },
  { key: "boulder", label: "Boulder" },
  { key: "toprope", label: "Top Rope" },
  { key: "indoor", label: "Indoor" },
  { key: "outdoor", label: "Outdoor" },
];

export default function ChallengesTab({
  onPressViewAllActive,
  onPressChallenge,
}: {
  onPressViewAllActive?: () => void;
  onPressChallenge?: (item: ChallengeItem) => void;
}) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [sheetVisible, setSheetVisible] = useState(false);

  const filtered = useMemo(() => {
    const kw = search.trim().toLowerCase();
    return CHALLENGES_MOCK.filter((c) => {
      const matchSearch =
        kw.length === 0 ? true : `${c.title} ${c.description}`.toLowerCase().includes(kw);

      const matchFilter =
        filter === "all"
          ? true
          : filter === "joined"
            ? !!c.joined
            : c.categories.includes(filter);

      return matchSearch && matchFilter;
    });
  }, [search, filter]);

  const joinedActive = useMemo(
    () => filtered.filter((c) => c.joined && (c.status ?? "active") === "active"),
    [filtered]
  );

  const whatsNew = useMemo(() => {
    // “What's New” 先用 active + upcoming 混合，后续你可以换成后台的推荐/最新字段
    return filtered.filter((c) => (c.status ?? "active") !== "past");
  }, [filtered]);

  return (
    <View style={{ paddingBottom: 120 }}>
      {/* Search + Filter (same as Post) */}
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color="#9CA3AF" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search"
            placeholderTextColor="#9CA3AF"
            style={styles.searchInput}
            returnKeyType="search"
          />
        </View>

        <TouchableOpacity style={styles.filterBtn} onPress={() => setSheetVisible(true)}>
          <Ionicons name="options-outline" size={20} color="#111" />
        </TouchableOpacity>
      </View>

      {/* Active Challenges header */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>Active Challenges</Text>
        <TouchableOpacity onPress={onPressViewAllActive} activeOpacity={0.8}>
          <Text style={styles.viewAll}>View all</Text>
        </TouchableOpacity>
      </View>

      {/* Joined challenges horizontal */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.joinedRow}>
        {joinedActive.length === 0 ? (
          <View style={{ paddingHorizontal: 16, paddingVertical: 10 }}>
            <Text style={{ color: "#9CA3AF", fontWeight: "700" }}>No joined active challenges.</Text>
          </View>
        ) : (
          joinedActive.map((c) => (
            <JoinedChallengeChip
              key={c.id}
              title={c.title}
              color={c.color}
              onPress={() => onPressChallenge?.(c)}
            />
          ))
        )}
      </ScrollView>

      {/* What's New */}
      <View style={[styles.sectionHeaderRow, { marginTop: 18 }]}>
        <Text style={styles.sectionTitle}>What’s New</Text>
      </View>

      <View style={{ paddingHorizontal: 16 }}>
        {whatsNew.map((c) => (
          <ChallengeCardRow key={c.id} item={c} onPress={() => onPressChallenge?.(c)} />
        ))}
      </View>

      {/* Filter sheet */}
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
  // Search row
  searchRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, gap: 10, marginBottom: 14 },
  searchBox: {
    flex: 1,
    height: 40,
    borderRadius: 14,
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 14, color: "#111" },
  filterBtn: { width: 44, height: 40, borderRadius: 14, backgroundColor: "#F3F4F6", alignItems: "center", justifyContent: "center" },

  // Section headers
  sectionHeaderRow: {
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  sectionTitle: { fontSize: 16, fontWeight: "900", color: "#111" },
  viewAll: { fontSize: 12, fontWeight: "800", color: "#9CA3AF" },

  joinedRow: { paddingHorizontal: 16, gap: 12, paddingBottom: 2 },

  // Sheet rows
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
