// app/library/trending-plans.tsx

import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, FlatList, SafeAreaView } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { TRAINING_INTENTS, TrainingIntent } from "../../src/components/plancard";

import { TrainingPlanCard, TrainingPlan } from "../../src/components/plancard";

/**
 * TODO: replace with API/store
 * 这里用 TrainingPlan 类型，保证与你的统一卡片组件兼容
 */
const mockPlans: TrainingPlan[] = [
  {
    id: "p1",
    title: "Finger Strength 101",
    source: "official",
    visibility: "public",
    status: "paused",
    trainingType: "strength",
    coverImageUri: "https://images.unsplash.com/photo-1526401485004-2fda9f6a1b5f?auto=format&fit=crop&w=1400&q=60",
    durationWeeks: 6,
    estSessionMinutes: 45,
    levelRange: { min: "V4", max: "V7" },
    author: { authorName: "ClimMate" },
    market: { ratingAvg: 4.8, followerCount: 1240 },
    tags: ["strength"],
  },
  {
    id: "p2",
    title: "Endurance Beast",
    source: "custom",
    visibility: "public",
    status: "paused",
    trainingType: "endurance",
    coverImageUri: "https://images.unsplash.com/photo-1520975661595-6453be3f7070?auto=format&fit=crop&w=1400&q=60",
    durationWeeks: 8,
    estSessionMinutes: 60,
    levelRange: { min: "5.12+", max: undefined },
    author: { authorName: "Adam Ondra" },
    market: { ratingAvg: 4.9, followerCount: 3500 },
    tags: ["endurance"],
  },
  {
    id: "p3",
    title: "Coordination Power Cycle",
    source: "ai",
    visibility: "public",
    status: "paused",
    trainingType: "power",
    coverImageUri: "https://images.unsplash.com/photo-1526401281623-3428e0b5b2a4?auto=format&fit=crop&w=1400&q=60",
    durationWeeks: 4,
    estSessionMinutes: 40,
    levelRange: { min: "V3", max: "V6" },
    author: { authorName: "ClimMate AI" },
    market: { ratingAvg: 4.6, followerCount: 980 },
    tags: ["power"],
  },
  {
    id: "p4",
    title: "Footwork & Efficiency",
    source: "official",
    visibility: "public",
    status: "paused",
    trainingType: "technique",
    coverImageUri: "https://images.unsplash.com/photo-1551524164-687a55dd1126?auto=format&fit=crop&w=1400&q=60",
    durationWeeks: 4,
    estSessionMinutes: 30,
    levelRange: { label: "All Levels" },
    author: { authorName: "ClimMate" },
    market: { ratingAvg: 4.7, followerCount: 2100 },
    tags: ["technique"],
  },
  {
    id: "p5",
    title: "Finger Rehab (Safe Return)",
    source: "official",
    visibility: "public",
    status: "paused",
    trainingType: "recovery",
    coverImageUri: "https://images.unsplash.com/photo-1552674605-db6ffd4facb5?auto=format&fit=crop&w=1400&q=60",
    durationWeeks: 4,
    estSessionMinutes: 25,
    levelRange: { label: "All Levels" },
    author: { authorName: "ClimMate" },
    market: { ratingAvg: 4.9, followerCount: 1900 },
    tags: ["recovery"],
  },
];

export default function TrendingPlansScreen() {
  const router = useRouter();
  const [intent, setIntent] = useState<TrainingIntent>("all");

  const data = useMemo(() => {
    if (intent === "all") return mockPlans;
    // 简单用 tags/trainingType 过滤；后续可换成后端返回的 intent 字段
    return mockPlans.filter((p) => p.trainingType === intent || p.tags?.includes(intent));
  }, [intent]);

  return (
    <SafeAreaView style={styles.safe}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="chevron-back" size={24} color="#111" />
        </TouchableOpacity>

        <Text style={styles.topTitle}>Trending Plans</Text>

        <View style={styles.iconBtn} />
      </View>

      {/* Intent chips */}
      <View style={styles.chipsWrap}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={TRAINING_INTENTS}
          keyExtractor={(i) => i.key}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}
          renderItem={({ item }) => {
            const selected = item.key === intent;
            return (
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => setIntent(item.key)}
                style={[styles.chip, selected ? styles.chipOn : styles.chipOff]}
              >
                <Text style={[styles.chipText, selected ? styles.chipTextOn : styles.chipTextOff]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* List */}
      <FlatList
        data={data}
        keyExtractor={(p) => p.id}
        contentContainerStyle={{ paddingBottom: 28 }}
        renderItem={({ item }) => (
          <TrainingPlanCard
            plan={item}
            variant="market"
            context="public"
            handlers={{
              onPress: () => {
                // TODO: 你后续有 plan detail 路由的话改这里
                // e.g. router.push({ pathname: "/library/plan-detail", params: { id: item.id } })
                router.push("/library/plan-overview");
              },
            }}
            display={{
              showAuthor: true,
              showSourceBadge: true,
            }}
          />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No plans</Text>
            <Text style={styles.emptySub}>Try another category.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#FFFFFF" },

  topBar: {
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#EEF2F7",
  },
  iconBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  topTitle: { fontSize: 17, fontWeight: "800", color: "#111" },

  chipsWrap: { paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#EEF2F7" },
  chip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999 },
  chipOn: { backgroundColor: "#111827" },
  chipOff: { backgroundColor: "#F3F4F6" },
  chipText: { fontSize: 13, fontWeight: "800" },
  chipTextOn: { color: "#FFFFFF" },
  chipTextOff: { color: "#111827" },

  empty: { padding: 24, alignItems: "center" },
  emptyTitle: { fontSize: 16, fontWeight: "800", color: "#111" },
  emptySub: { marginTop: 6, fontSize: 13, color: "#6B7280", fontWeight: "600" },
});
