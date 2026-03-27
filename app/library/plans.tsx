// app/library/plans.tsx
import { useMemo, useState, useLayoutEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Alert, FlatList } from "react-native";
import { NativeSegmentedControl } from "../../src/components/ui";
import { useRouter, Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { HeaderButton } from "../../src/components/ui/HeaderButton";

import { TrainingPlanCard, TrainingIntent, TRAINING_INTENTS } from "../../src/components/plancard";
import TrendingPlansEntryCard from "./TrendingPlansEntryCard";
import { usePublicPlans, useMyPlans } from "../../src/features/plans/hooks";
import { planSummaryToTrainingPlan } from "../../src/features/plans/adapters";

import { useThemeColors } from "../../src/lib/useThemeColors";
import { NATIVE_HEADER_LARGE, withHeaderTheme } from "../../src/lib/nativeHeaderOptions";

const SIDE_PAD = 16;

type TabKey = "MyPlans" | "Official" | "Plaza";
const TAB_KEYS: TabKey[] = ["MyPlans", "Official", "Plaza"];
const TAB_LABELS = ["My Plans", "Official", "Plaza"];

export default function PlansHubScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  // --- Native large title header with back button ---
  useLayoutEffect(() => {
    navigation.setOptions({
      ...NATIVE_HEADER_LARGE,
      ...withHeaderTheme(colors),
      headerShown: true,
      title: "Plans",
      headerLeft: () => <HeaderButton icon="chevron.backward" onPress={() => router.back()} />,
    });
  }, [navigation, colors, router]);

  const [activeTab, setActiveTab] = useState<TabKey>("MyPlans");

  // Search
  const [query, setQuery] = useState("");

  // Filter State
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortType, setSortType] = useState<"Newest" | "Highest">("Newest");
  const [selectedIntents, setSelectedIntents] = useState<TrainingIntent[]>([]);


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

  const handleCreateCustom = () => {
    router.push("/library/plan-builder" as any);
  };

  const handleCreateAI = () => {
    Alert.alert("Coming Soon", "AI plan generation will be available with Coach AI");
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

  const ListHeader = (
    <View>
      {/* Search */}
      <View style={{ paddingHorizontal: SIDE_PAD }}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color={colors.textSecondary} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search plans..."
            placeholderTextColor={colors.textSecondary}
            style={[styles.searchInput, { color: colors.textPrimary }]}
          />
        </View>
      </View>

      {/* 3 Tabs — native segmented control */}
      <View style={{ paddingHorizontal: SIDE_PAD, paddingVertical: 10 }}>
        <NativeSegmentedControl
          options={TAB_LABELS}
          selectedIndex={TAB_KEYS.indexOf(activeTab)}
          onSelect={(i) => setActiveTab(TAB_KEYS[i])}
        />
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
            <Ionicons name={filterOpen ? "chevron-up" : "chevron-down"} size={16} color={colors.textSecondary} />
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
    <View style={styles.container}>
      <FlatList
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
        ListHeaderComponent={
          <View>
            {ListHeader}
            {activeLoading && activeData.length === 0 ? (
              <View style={styles.emptyContainer}>
                <ActivityIndicator size="large" color={colors.textPrimary} />
              </View>
            ) : null}
            {!activeLoading && activeData.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name={isMyPlansTab ? "albums-outline" : "search-outline"} size={44} color={colors.textTertiary} />
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
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
      />

      {/* Native toolbar menu — create plan actions */}
      {isMyPlansTab ? (
        <Stack.Toolbar placement="right">
          <Stack.Toolbar.Menu icon="plus">
            <Stack.Toolbar.MenuAction
              icon="hammer"
              onPress={handleCreateCustom}
            >
              Customize
            </Stack.Toolbar.MenuAction>
            <Stack.Toolbar.MenuAction
              icon="sparkles"
              onPress={handleCreateAI}
            >
              AI Pick
            </Stack.Toolbar.MenuAction>
          </Stack.Toolbar.Menu>
        </Stack.Toolbar>
      ) : null}
    </View>
  );
}

type Colors = ReturnType<typeof useThemeColors>;

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },

    searchBar: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.inputBackground,
      marginBottom: 12,
      paddingHorizontal: 12,
      height: 44,
      borderRadius: 12,
    },
    searchInput: { flex: 1, marginLeft: 8, fontSize: 15 },

    filterHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      paddingHorizontal: SIDE_PAD,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.divider,
    },
    filterTitle: { fontSize: 13, fontWeight: "700", color: colors.textPrimary },
    filterBody: {
      padding: SIDE_PAD,
      backgroundColor: colors.backgroundSecondary,
      borderBottomWidth: 1,
      borderBottomColor: colors.divider,
    },
    filterRow: { flexDirection: "row", alignItems: "center" },
    filterLabel: { width: 60, fontSize: 13, color: colors.textSecondary, marginTop: 2, fontWeight: "600" },

    radioBtn: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
      backgroundColor: colors.cardBackground,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    radioBtnActive: { backgroundColor: colors.pillBackground, borderColor: colors.pillBackground },
    radioText: { fontSize: 12, color: colors.textSecondary, fontWeight: "600" },
    radioTextActive: { color: colors.pillText, fontWeight: "800" },

    tagBtn: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: colors.cardBackground,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    tagBtnActive: { backgroundColor: colors.accent + '1A', borderColor: colors.accent },
    tagText: { fontSize: 12, color: colors.textSecondary, fontWeight: "700" },
    tagTextActive: { color: colors.accent, fontWeight: "800" },

    emptyContainer: { alignItems: "center", justifyContent: "center", marginTop: 90, paddingHorizontal: 24 },
    emptyTitle: { marginTop: 10, fontSize: 15, fontWeight: "900", color: colors.textPrimary },
    emptySub: { marginTop: 6, fontSize: 13, fontWeight: "600", color: colors.textSecondary, textAlign: "center" },

  });
