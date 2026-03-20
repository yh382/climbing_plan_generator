// app/community/challenges.tsx
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

import CollapsibleLargeHeader from "../../src/components/CollapsibleLargeHeader";
import { challengeApi } from "../../src/features/community/challenges/api";
import { getChallengeStatus } from "../../src/features/community/challenges/types";
import type { ChallengeOut } from "../../src/features/community/challenges/types";
import ChallengeCardGrid from "../../src/features/community/challenges/ChallengeCardGrid";
import JoinedChallengeChip from "../../src/features/community/challenges/JoinedChallengeChip";

type DisciplineFilter = "all" | "boulder" | "rope" | "lead" | "indoor" | "outdoor";
type KindFilter = "all" | "monthly" | "weekly" | "seasonal" | "one-off";

const DISCIPLINE_CHIPS: { key: DisciplineFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "boulder", label: "Boulder" },
  { key: "rope", label: "Rope" },
  { key: "lead", label: "Lead" },
  { key: "indoor", label: "Indoor" },
  { key: "outdoor", label: "Outdoor" },
];

const KIND_CHIPS: { key: KindFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "monthly", label: "Monthly" },
  { key: "weekly", label: "Weekly" },
  { key: "seasonal", label: "Seasonal" },
  { key: "one-off", label: "One-off" },
];

export default function ChallengesScreen() {
  const router = useRouter();
  const [allChallenges, setAllChallenges] = useState<ChallengeOut[]>([]);
  const [myChallenges, setMyChallenges] = useState<ChallengeOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [disciplineFilter, setDisciplineFilter] = useState<DisciplineFilter>("all");
  const [kindFilter, setKindFilter] = useState<KindFilter>("all");

  useEffect(() => {
    setLoading(true);
    Promise.all([
      challengeApi.getChallenges(),
      challengeApi.getMyChallenges(),
    ])
      .then(([all, my]) => {
        setAllChallenges(all);
        setMyChallenges(my);
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    return allChallenges.filter((c) => {
      if (getChallengeStatus(c) === "past") return false;

      if (disciplineFilter !== "all") {
        if (["boulder", "rope", "lead"].includes(disciplineFilter)) {
          if (c.discipline !== disciplineFilter) return false;
        } else {
          if (c.venueType !== disciplineFilter) return false;
        }
      }

      if (kindFilter !== "all" && c.challengeKind !== kindFilter) return false;

      return true;
    });
  }, [allChallenges, disciplineFilter, kindFilter]);

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
      {/* Joined challenges horizontal scroll */}
      {myChallenges.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.joinedRow}
        >
          {myChallenges.map((c) => (
            <JoinedChallengeChip
              key={c.id}
              title={c.title}
              onPress={() => goToChallenge(c.id)}
            />
          ))}
        </ScrollView>
      )}

      {/* Filter chips row 1: discipline / venue */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
      >
        {DISCIPLINE_CHIPS.map((chip) => {
          const active = disciplineFilter === chip.key;
          return (
            <TouchableOpacity
              key={chip.key}
              style={[styles.filterChip, active && styles.filterChipActive]}
              onPress={() => setDisciplineFilter(chip.key)}
            >
              <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                {chip.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Filter chips row 2: kind */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.filterRow, { paddingTop: 0 }]}
      >
        {KIND_CHIPS.map((chip) => {
          const active = kindFilter === chip.key;
          return (
            <TouchableOpacity
              key={chip.key}
              style={[styles.filterChip, active && styles.filterChipActive]}
              onPress={() => setKindFilter(chip.key)}
            >
              <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                {chip.label}
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

const styles = StyleSheet.create({
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
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
  },
  filterChipActive: { backgroundColor: "#111" },
  filterChipText: { fontSize: 13, fontWeight: "600", color: "#6B7280" },
  filterChipTextActive: { color: "#FFF" },

  gridContainer: { paddingHorizontal: 16, paddingTop: 12 },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
  },
});
