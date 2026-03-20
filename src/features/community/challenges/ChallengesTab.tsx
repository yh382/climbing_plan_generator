// src/features/community/challenges/ChallengesTab.tsx
import { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from "react-native";
import ChallengeCardRow from "./ChallengeCardRow";
import JoinedChallengeChip from "./JoinedChallengeChip";
import { challengeApi } from "./api";
import { getChallengeStatus } from "./types";
import type { ChallengeOut } from "./types";

export default function ChallengesTab({
  onPressViewAllActive,
  onPressChallenge,
}: {
  onPressViewAllActive?: () => void;
  onPressChallenge?: (item: ChallengeOut) => void;
}) {
  const [allChallenges, setAllChallenges] = useState<ChallengeOut[]>([]);
  const [myChallenges, setMyChallenges] = useState<ChallengeOut[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      challengeApi.getChallenges(),
      challengeApi.getMyChallenges(),
    ]).then(([all, my]) => {
      setAllChallenges(all);
      setMyChallenges(my);
    }).finally(() => setLoading(false));
  }, []);

  const joinedActive = useMemo(
    () => myChallenges.filter((c) => getChallengeStatus(c) === "active"),
    [myChallenges]
  );

  // Category-based grouping
  const monthlyChallenges = useMemo(
    () => allChallenges.filter((c) => c.category === "monthly" && getChallengeStatus(c) !== "past"),
    [allChallenges]
  );

  const achievementChallenges = useMemo(
    () => allChallenges.filter(
      (c) => (c.category === "skill" || c.category === "lifetime") && getChallengeStatus(c) !== "past"
    ),
    [allChallenges]
  );

  const specialChallenges = useMemo(
    () => allChallenges.filter((c) => c.category === "special" && getChallengeStatus(c) !== "past"),
    [allChallenges]
  );

  const customChallenges = useMemo(
    () => allChallenges.filter((c) => c.category === "custom" && getChallengeStatus(c) !== "past"),
    [allChallenges]
  );

  if (loading) {
    return (
      <View style={{ padding: 40, alignItems: "center" }}>
        <ActivityIndicator size="large" color="#9CA3AF" />
      </View>
    );
  }

  return (
    <View style={{ paddingBottom: 120 }}>
      {/* My Active Challenges */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>My Challenges</Text>
        <TouchableOpacity onPress={onPressViewAllActive} activeOpacity={0.8}>
          <Text style={styles.viewAll}>View all</Text>
        </TouchableOpacity>
      </View>

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
              onPress={() => onPressChallenge?.(c)}
            />
          ))
        )}
      </ScrollView>

      {/* Monthly Challenges */}
      {monthlyChallenges.length > 0 && (
        <>
          <SectionHeader title="Monthly Challenges" />
          <View style={styles.cardList}>
            {monthlyChallenges.map((c) => (
              <ChallengeCardRow key={c.id} item={c} onPress={() => onPressChallenge?.(c)} />
            ))}
          </View>
        </>
      )}

      {/* Achievements (Skill + Lifetime) */}
      {achievementChallenges.length > 0 && (
        <>
          <SectionHeader title="Achievements" />
          <View style={styles.cardList}>
            {achievementChallenges.map((c) => (
              <ChallengeCardRow key={c.id} item={c} onPress={() => onPressChallenge?.(c)} />
            ))}
          </View>
        </>
      )}

      {/* Special */}
      {specialChallenges.length > 0 && (
        <>
          <SectionHeader title="Special" />
          <View style={styles.cardList}>
            {specialChallenges.map((c) => (
              <ChallengeCardRow key={c.id} item={c} onPress={() => onPressChallenge?.(c)} />
            ))}
          </View>
        </>
      )}

      {/* Custom / Community (org-created) */}
      {customChallenges.length > 0 && (
        <>
          <SectionHeader title="Community Challenges" />
          <View style={styles.cardList}>
            {customChallenges.map((c) => (
              <ChallengeCardRow key={c.id} item={c} onPress={() => onPressChallenge?.(c)} />
            ))}
          </View>
        </>
      )}
    </View>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <View style={[styles.sectionHeaderRow, { marginTop: 18 }]}>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
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
  cardList: { paddingHorizontal: 16 },
});
