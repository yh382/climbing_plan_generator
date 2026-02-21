// app/library/plans.tsx
import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import PlanCard, { PlanProps } from "../../components/PlanCard";
import TrendingPlansEntryCard from "./TrendingPlansEntryCard";
import { TrainingIntent, TRAINING_INTENTS } from "../../src/components/plancard";
import CollapsibleLargeHeaderFlatList from "../../src/components/CollapsibleLargeHeaderFlatList";

type PlanPropsWithDate = PlanProps & { createdAt: string };

const MOCK_DATA: PlanPropsWithDate[] = [
  {
    id: "p1",
    title: "Finger Strength 101",
    author: "Lattice",
    level: "V4-V7",
    duration: "6 Wks",
    users: 1240,
    type: "Strength",
    rating: 4.8,
    color: "#4F46E5",
    image:
      "https://images.unsplash.com/photo-1564769662533-4f00a87b4056?auto=format&fit=crop&w=800&q=80",
    createdAt: "2026-01-10T10:00:00Z",
  },
  {
    id: "p2",
    title: "Endurance Beast",
    author: "Adam Ondra",
    level: "5.12+",
    duration: "8 Wks",
    users: 3500,
    type: "Endurance",
    rating: 4.9,
    color: "#059669",
    image:
      "https://images.unsplash.com/photo-1601925348897-4c7595fe1423?auto=format&fit=crop&w=800&q=80",
    createdAt: "2026-01-06T10:00:00Z",
  },
];

const SIDE_PAD = 16;

export default function PlansHubScreen() {
  const router = useRouter();

  // Tabs
  const [activeTab, setActiveTab] = useState<"Plaza" | "Library">("Plaza");

  // Search
  const [query, setQuery] = useState("");

  // Filter State
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortType, setSortType] = useState<"Newest" | "Highest">("Newest");
  const [selectedIntents, setSelectedIntents] = useState<TrainingIntent[]>([]);

  const toggleFilter = () => setFilterOpen((v) => !v);

  const toggleIntent = (intent: TrainingIntent) => {
    setSelectedIntents((prev) => {
      if (prev.includes(intent)) return prev.filter((i) => i !== intent);
      return [...prev, intent];
    });
  };

  const displayedData = useMemo(() => {
    let list = [...MOCK_DATA];

    const q = query.trim().toLowerCase();
    if (q.length > 0) {
      list = list.filter((p) => {
        const title = (p.title ?? "").toLowerCase();
        const author = ((p as any).author ?? "").toLowerCase();
        return title.includes(q) || author.includes(q);
      });
    }

    if (activeTab === "Plaza" && selectedIntents.length > 0) {
      const normalized = (t?: string) =>
        (t ? (t.toLowerCase() as TrainingIntent) : undefined);
      list = list.filter((p) => {
        const it = normalized((p as any).type);
        return it ? selectedIntents.includes(it) : false;
      });
    }

    if (sortType === "Newest") {
      list.sort((a, b) => {
        const ta = Date.parse((a as any).createdAt || "");
        const tb = Date.parse((b as any).createdAt || "");
        return (isNaN(tb) ? 0 : tb) - (isNaN(ta) ? 0 : ta);
      });
    } else {
      list.sort((a, b) => {
        const ra =
          typeof (a as any).rating === "number" ? (a as any).rating : -1;
        const rb =
          typeof (b as any).rating === "number" ? (b as any).rating : -1;
        if (rb !== ra) return rb - ra;

        const ua = typeof (a as any).users === "number" ? (a as any).users : -1;
        const ub = typeof (b as any).users === "number" ? (b as any).users : -1;
        return ub - ua;
      });
    }

    return list;
  }, [activeTab, query, selectedIntents, sortType]);

  const LargeTitle = <Text style={styles.largeTitle}>Plans</Text>;

  const Subtitle = (
    <Text style={styles.largeSubtitle}>
      {activeTab === "Plaza" ? "Plaza" : "Library"}
    </Text>
  );

  const LeftActions = (
    <TouchableOpacity onPress={() => router.back()} hitSlop={10} style={styles.iconBtn}>
      <Ionicons name="arrow-back" size={25} color="#111" />
    </TouchableOpacity>
  );

  const RightActions = (
    <TouchableOpacity
      onPress={() => router.push("/library/my-plans")}
      activeOpacity={0.7}
      style={styles.rightBtn}
    >
      <Ionicons name="bookmark-outline" size={25} color="#111" />
    </TouchableOpacity>
  );

  const ListHeader = (
    <View>
      {/* Search (独立边距 16) */}
      <View style={{ paddingHorizontal: SIDE_PAD }}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#9CA3AF" />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search plans, authors..."
            placeholderTextColor="#9CA3AF"
            style={{ flex: 1, marginLeft: 8, fontSize: 15, color: "#111" }}
          />
        </View>
      </View>

      {/* Tabs（全宽，保持你原样） */}
      <View style={styles.tabContainer}>
        {(["Plaza", "Library"] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tabItem, activeTab === tab && styles.tabItemActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              Plan {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Filter Toggle（全宽，内部已经 paddingHorizontal: 16） */}
      <TouchableOpacity style={styles.filterHeader} onPress={toggleFilter} activeOpacity={0.7}>
        <Text style={styles.filterTitle}>
          Filter:{" "}
          <Text style={{ fontWeight: "400" }}>
            {sortType}
            {activeTab === "Plaza"
              ? `, ${selectedIntents.length > 0 ? `${selectedIntents.length} types` : "All"}`
              : ""}
          </Text>
        </Text>
        <Ionicons name={filterOpen ? "chevron-up" : "chevron-down"} size={16} color="#6B7280" />
      </TouchableOpacity>

      {/* Filter Body（内部 padding 16） */}
      {filterOpen ? (
        <View style={styles.filterBody}>
          <View style={styles.filterRow}>
            <Text style={styles.filterLabel}>Sort:</Text>
            <View style={{ flexDirection: "row", gap: 12 }}>
              {(["Newest", "Highest"] as const).map((opt) => (
                <TouchableOpacity
                  key={opt}
                  style={[styles.radioBtn, sortType === opt && styles.radioBtnActive]}
                  onPress={() => setSortType(opt)}
                >
                  <Text style={[styles.radioText, sortType === opt && styles.radioTextActive]}>
                    {opt}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {activeTab === "Plaza" ? (
            <View style={[styles.filterRow, { marginTop: 12, alignItems: "flex-start" }]}>
              <Text style={styles.filterLabel}>Type:</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, flex: 1 }}>
                {TRAINING_INTENTS.filter((i) => i.key !== "all").map(({ key, label }) => {
                  const isSelected = selectedIntents.includes(key);
                  return (
                    <TouchableOpacity
                      key={key}
                      style={[styles.tagBtn, isSelected && styles.tagBtnActive]}
                      onPress={() => toggleIntent(key)}
                    >
                      <Text style={[styles.tagText, isSelected && styles.tagTextActive]}>{label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ) : null}
        </View>
      ) : null}

      {/* Trending card（独立边距 16） */}
      {activeTab === "Plaza" ? (
        <View style={{ paddingHorizontal: SIDE_PAD }}>
          <TrendingPlansEntryCard />
        </View>
      ) : null}
    </View>
  );

  return (
    <CollapsibleLargeHeaderFlatList
      backgroundColor="#FFF"
      smallTitle="Plans"
      largeTitle={LargeTitle}
      subtitle={Subtitle}
      leftActions={LeftActions}
      rightActions={RightActions}
      data={displayedData}
      keyExtractor={(item) => item.id}
      renderItem={({ item }: any) => (
        <View style={{ paddingHorizontal: SIDE_PAD }}>
          <PlanCard
            item={item}
            onPress={() =>
              router.push({
                pathname: "/library/plan-overview",
                params: { planId: item.id, source: "market" },
              })
            }
          />
        </View>
      )}
      listHeader={ListHeader}
      // ✅ 不要再传 paddingHorizontal，避免大标题被叠加缩进
      contentContainerStyle={{ paddingBottom: 8 }}
      bottomInsetExtra={28}
      showsVerticalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create({
  iconBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  rightBtn: {
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },

  largeTitle: { fontSize: 32, fontWeight: "800", color: "#111", lineHeight: 38 },
  largeSubtitle: { fontSize: 14, color: "#6B7280", marginTop: 2 },

  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    marginBottom: 12,
    paddingHorizontal: 12,
    height: 44,
    borderRadius: 12,
  },

  tabContainer: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
  tabItem: { flex: 1, paddingVertical: 14, alignItems: "center", borderBottomWidth: 2, borderBottomColor: "transparent" },
  tabItemActive: { borderBottomColor: "#111" },
  tabText: { fontSize: 15, fontWeight: "600", color: "#9CA3AF" },
  tabTextActive: { color: "#111", fontWeight: "800" },

  filterHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: SIDE_PAD,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F9FAFB",
  },
  filterTitle: { fontSize: 13, fontWeight: "700", color: "#374151" },
  filterBody: {
    padding: SIDE_PAD,
    backgroundColor: "#FAFAFA",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  filterRow: { flexDirection: "row", alignItems: "center" },
  filterLabel: { width: 60, fontSize: 13, color: "#9CA3AF", marginTop: 2, fontWeight: "600" },

  radioBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  radioBtnActive: { backgroundColor: "#111", borderColor: "#111" },
  radioText: { fontSize: 12, color: "#4B5563", fontWeight: "600" },
  radioTextActive: { color: "#FFF", fontWeight: "800" },

  tagBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  tagBtnActive: { backgroundColor: "#EEF2FF", borderColor: "#4F46E5" },
  tagText: { fontSize: 12, color: "#4B5563", fontWeight: "700" },
  tagTextActive: { color: "#4F46E5", fontWeight: "800" },
});
