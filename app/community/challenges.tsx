// app/community/challenges.tsx
import { useCallback, useEffect, useMemo, useState } from "react";
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
import { useThemeColors } from "../../src/lib/useThemeColors";

import CollapsibleLargeHeader from "../../src/components/CollapsibleLargeHeader";
import { challengeApi } from "../../src/features/community/challenges/api";
import { getChallengeStatus } from "../../src/features/community/challenges/types";
import type { ChallengeOut } from "../../src/features/community/challenges/types";
import ChallengeCardGrid from "../../src/features/community/challenges/ChallengeCardGrid";
import JoinedChallengeChip from "../../src/features/community/challenges/JoinedChallengeChip";

const FILTERS = [
  { label: "All", discipline: null, category: null },
  { label: "Boulder", discipline: "boulder", category: null },
  { label: "Rope", discipline: "rope", category: null },
  { label: "Lead", discipline: "lead", category: null },
  { label: "Milestone", discipline: null, category: "lifetime" },
] as const;

type FilterIndex = 0 | 1 | 2 | 3 | 4;

export default function ChallengesScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [allChallenges, setAllChallenges] = useState<ChallengeOut[]>([]);
  const [myChallenges, setMyChallenges] = useState<ChallengeOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterIndex>(0);

  const fetchChallenges = useCallback(() => {
    setLoading(true);
    const f = FILTERS[activeFilter];
    const opts: { category?: string; discipline?: string } = {};
    if (f.discipline) opts.discipline = f.discipline;
    if (f.category) opts.category = f.category;

    Promise.all([
      challengeApi.getChallenges(opts),
      challengeApi.getMyChallenges(),
    ])
      .then(([all, my]) => {
        setAllChallenges(all);
        setMyChallenges(my);
      })
      .finally(() => setLoading(false));
  }, [activeFilter]);

  useEffect(() => {
    fetchChallenges();
  }, [fetchChallenges]);

  // Filter out past challenges client-side
  const filtered = useMemo(() => {
    return allChallenges.filter((c) => getChallengeStatus(c) !== "past");
  }, [allChallenges]);

  // N3d: Only show active, non-lifetime/skill joined challenges
  const activeJoinedChallenges = useMemo(() => {
    return myChallenges.filter(
      (c) =>
        getChallengeStatus(c) === "active" &&
        c.category !== "lifetime" &&
        c.category !== "skill"
    );
  }, [myChallenges]);

  const goToChallenge = (id: string) => {
    router.push({
      pathname: "/community/challenges/[challengeId]",
      params: { challengeId: id },
    });
  };

  const LeftActions = (
    <TouchableOpacity onPress={() => router.back()} hitSlop={10} style={styles.iconBtn}>
      <Ionicons name="arrow-back" size={24} color="#111" />
    </TouchableOpacity>
  );

  const LargeTitle = <Text style={styles.largeTitle}>Challenges</Text>;
  const Subtitle = <Text style={styles.largeSubtitle}>Discover & Join</Text>;

  return (
    <CollapsibleLargeHeader
      backgroundColor="#FFF"
      smallTitle="Challenges"
      largeTitle={LargeTitle}
      subtitle={Subtitle}
      leftActions={LeftActions}
      contentContainerStyle={{ paddingBottom: 40 }}
      bottomInsetExtra={28}
    >
      {/* Joined challenges horizontal scroll (N3d: only active, non-lifetime/skill) */}
      {activeJoinedChallenges.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.joinedRow}
        >
          {activeJoinedChallenges.map((c) => (
            <JoinedChallengeChip
              key={c.id}
              title={c.title}
              onPress={() => goToChallenge(c.id)}
            />
          ))}
        </ScrollView>
      )}

      {/* Filter chips: single row (All / Boulder / Rope / Lead / Milestone) */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
      >
        {FILTERS.map((f, idx) => {
          const active = activeFilter === idx;
          return (
            <TouchableOpacity
              key={f.label}
              style={[styles.filterChip, active && styles.filterChipActive]}
              onPress={() => setActiveFilter(idx as FilterIndex)}
            >
              <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Grid content */}
      <View style={styles.gridContainer}>
        {loading ? (
          <View style={{ padding: 40, alignItems: "center" }}>
            <ActivityIndicator size="large" color="#9CA3AF" />
          </View>
        ) : filtered.length === 0 ? (
          <View style={{ padding: 40, alignItems: "center" }}>
            <Text style={{ color: "#9CA3AF" }}>No challenges found.</Text>
          </View>
        ) : (
          <View style={styles.grid}>
            {filtered.map((item) => (
              <ChallengeCardGrid
                key={item.id}
                item={item}
                onPress={() => goToChallenge(item.id)}
              />
            ))}
          </View>
        )}
      </View>
    </CollapsibleLargeHeader>
  );
}

const createStyles = (colors: ReturnType<typeof useThemeColors>) => StyleSheet.create({
  iconBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },

  largeTitle: { fontSize: 32, fontWeight: "800", color: "#111", lineHeight: 38 },
  largeSubtitle: { fontSize: 14, color: "#6B7280", marginTop: 2 },

  joinedRow: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 6, gap: 10 },

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
  filterChipActive: { backgroundColor: "#1C1C1E", borderColor: "#1C1C1E" },
  filterChipText: { fontSize: 13, fontWeight: "600", color: colors.textSecondary },
  filterChipTextActive: { color: "#FFF" },

  gridContainer: { paddingHorizontal: 22, paddingTop: 12 },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
});
