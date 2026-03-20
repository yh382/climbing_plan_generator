// app/library/plans.tsx
import { useMemo, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Alert } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { TrainingPlanCard, TrainingIntent, TRAINING_INTENTS } from "../../src/components/plancard";
import TrendingPlansEntryCard from "./TrendingPlansEntryCard";
import CollapsibleLargeHeaderFlatList from "../../src/components/CollapsibleLargeHeaderFlatList";
import { usePublicPlans, useMyPlans } from "../../src/features/plans/hooks";
import { planSummaryToTrainingPlan } from "../../src/features/plans/adapters";

const SIDE_PAD = 16;

type TabKey = "MyPlans" | "Official" | "Plaza";

export default function PlansHubScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [activeTab, setActiveTab] = useState<TabKey>("MyPlans");

  // Search
  const [query, setQuery] = useState("");

  // Filter State
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortType, setSortType] = useState<"Newest" | "Highest">("Newest");
  const [selectedIntents, setSelectedIntents] = useState<TrainingIntent[]>([]);

  // FAB (My Plans tab)
  const [fabOpen, setFabOpen] = useState(false);

  // API data
  const { plans: publicPlans, loading: publicLoading } = usePublicPlans();
  const { plans: myPlans, loading: myLoading } = useMyPlans();

  const toggleFilter = () => setFilterOpen((v) => !v);

  const toggleIntent = (intent: TrainingIntent) => {
    setSelectedIntents((prev) => {
      if (prev.includes(intent)) return prev.filter((i) => i !== intent);
      return [...prev, intent];
    });
  };

  const handleFabAction = (action: "AI" | "Custom") => {
    setFabOpen(false);
    if (action === "AI") {
      Alert.alert("Coming Soon", "AI plan generation will be available with Coach AI");
      return;
    }
    if (action === "Custom") {
      router.push("/library/plan-builder" as any);
    }
  };

  // My Plans data
  const myPlansData = useMemo(() => {
    const list = myPlans.map(planSummaryToTrainingPlan);
    const q = query.trim().toLowerCase();
    if (q.length > 0) {
      return list.filter((p) => (p.title ?? "").toLowerCase().includes(q));
    }
    return list;
  }, [myPlans, query]);

  // Public plans data (Plaza + Official)
  const displayedData = useMemo(() => {
    let list = publicPlans.map(planSummaryToTrainingPlan);

    // Official tab: filter official source
    if (activeTab === "Official") {
      list = list.filter((p) => p.source === "official");
    }

    const q = query.trim().toLowerCase();
    if (q.length > 0) {
      list = list.filter((p) => {
        const title = (p.title ?? "").toLowerCase();
        const author = (p.author?.authorName ?? "").toLowerCase();
        return title.includes(q) || author.includes(q);
      });
    }

    if (selectedIntents.length > 0) {
      list = list.filter((p) => selectedIntents.includes(p.trainingType as TrainingIntent));
    }

    if (sortType === "Highest") {
      list.sort((a, b) => {
        const ra = a.market?.ratingAvg ?? -1;
        const rb = b.market?.ratingAvg ?? -1;
        if (rb !== ra) return rb - ra;
        const ua = a.market?.followerCount ?? -1;
        const ub = b.market?.followerCount ?? -1;
        return ub - ua;
      });
    }

    return list;
  }, [publicPlans, activeTab, query, selectedIntents, sortType]);

  // Determine which dataset is active
  const isMyPlansTab = activeTab === "MyPlans";
  const activeData = isMyPlansTab ? myPlansData : displayedData;
  const activeLoading = isMyPlansTab ? myLoading : publicLoading;

  const LargeTitle = <Text style={styles.largeTitle}>Plans</Text>;
  const Subtitle = (
    <Text style={styles.largeSubtitle}>
      {activeTab === "MyPlans" ? "My Plans" : activeTab === "Official" ? "Official" : "Plaza"}
    </Text>
  );

  const LeftActions = (
    <TouchableOpacity onPress={() => router.back()} hitSlop={10} style={styles.iconBtn}>
      <Ionicons name="arrow-back" size={25} color="#111" />
    </TouchableOpacity>
  );

  const ListHeader = (
    <View>
      {/* Search */}
      <View style={{ paddingHorizontal: SIDE_PAD }}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#9CA3AF" />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search plans..."
            placeholderTextColor="#9CA3AF"
            style={{ flex: 1, marginLeft: 8, fontSize: 15, color: "#111" }}
          />
        </View>
      </View>

      {/* 3 Tabs */}
      <View style={styles.tabContainer}>
        {([
          { key: "MyPlans" as const, label: "My Plans" },
          { key: "Official" as const, label: "Official" },
          { key: "Plaza" as const, label: "Plaza" },
        ]).map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tabItem, activeTab === tab.key && styles.tabItemActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Filter — only for Plaza/Official */}
      {!isMyPlansTab ? (
        <>
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

          {/* Trending card */}
          {activeTab === "Plaza" ? (
            <View style={{ paddingHorizontal: SIDE_PAD }}>
              <TrendingPlansEntryCard />
            </View>
          ) : null}
        </>
      ) : null}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: "#FFF" }}>
      <CollapsibleLargeHeaderFlatList
        backgroundColor="#FFF"
        smallTitle="Plans"
        largeTitle={LargeTitle}
        subtitle={Subtitle}
        leftActions={LeftActions}
        data={activeData}
        keyExtractor={(item: any) => item.id}
        renderItem={({ item }: any) => (
          <View style={{ paddingHorizontal: SIDE_PAD }}>
            <TrainingPlanCard
              plan={item}
              variant={isMyPlansTab ? "compact" : "market"}
              context={isMyPlansTab ? "personal" : "public"}
              handlers={{
                onPress: () =>
                  router.push({
                    pathname: "/library/plan-overview",
                    params: {
                      planId: item.id,
                      source: isMyPlansTab ? "user" : "market",
                    },
                  }),
              }}
              display={{
                showAuthor: !isMyPlansTab,
                showSourceBadge: true,
              }}
            />
          </View>
        )}
        listHeader={
          <View>
            {ListHeader}
            {activeLoading && activeData.length === 0 ? (
              <View style={styles.emptyContainer}>
                <ActivityIndicator size="large" color="#111" />
              </View>
            ) : null}
            {!activeLoading && activeData.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name={isMyPlansTab ? "albums-outline" : "search-outline"} size={44} color="#E5E7EB" />
                <Text style={styles.emptyTitle}>
                  {isMyPlansTab ? "No plans yet" : "No plans found"}
                </Text>
                <Text style={styles.emptySub}>
                  {isMyPlansTab
                    ? "Create your first custom plan."
                    : "Try adjusting your filters."}
                </Text>
              </View>
            ) : null}
          </View>
        }
        contentContainerStyle={{ paddingBottom: 8 }}
        bottomInsetExtra={28}
        showsVerticalScrollIndicator={false}
      />

      {/* FAB — only on My Plans tab */}
      {isMyPlansTab ? (
        <>
          {fabOpen ? (
            <TouchableOpacity
              style={styles.fabOverlay}
              activeOpacity={1}
              onPress={() => setFabOpen(false)}
            >
              <View style={[styles.fabActions, { bottom: insets.bottom + 80 }]}>
                <TouchableOpacity style={styles.actionBtn} onPress={() => handleFabAction("Custom")}>
                  <Text style={styles.actionText}>Customize</Text>
                  <View style={[styles.miniFab, { backgroundColor: "#4F46E5" }]}>
                    <Ionicons name="construct" size={20} color="#FFF" />
                  </View>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionBtn} onPress={() => handleFabAction("AI")}>
                  <Text style={styles.actionText}>AI Pick</Text>
                  <View style={[styles.miniFab, { backgroundColor: "#10B981" }]}>
                    <Ionicons name="sparkles" size={20} color="#FFF" />
                  </View>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity
            style={[styles.fab, { bottom: insets.bottom + 20 }]}
            activeOpacity={0.8}
            onPress={() => setFabOpen((v) => !v)}
          >
            <Ionicons name={fabOpen ? "close" : "add"} size={32} color="#FFF" />
          </TouchableOpacity>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  iconBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },

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

  emptyContainer: { alignItems: "center", justifyContent: "center", marginTop: 90, paddingHorizontal: 24 },
  emptyTitle: { marginTop: 10, fontSize: 15, fontWeight: "900", color: "#111" },
  emptySub: { marginTop: 6, fontSize: 13, fontWeight: "600", color: "#9CA3AF", textAlign: "center" },

  // FAB
  fab: {
    position: "absolute",
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#111",
    alignItems: "center",
    justifyContent: "center",
    elevation: 5,
    zIndex: 100,
  },
  fabOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(255,255,255,0.8)", zIndex: 90 },
  fabActions: { position: "absolute", right: 24, alignItems: "flex-end", gap: 16 },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: 12 },
  actionText: { fontSize: 14, fontWeight: "700", color: "#111" },
  miniFab: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
});
