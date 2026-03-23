// app/training/summary.tsx — SessionSummaryScreen

import React, { useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { useI18N } from "../../lib/i18n";

export default function SessionSummaryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const { isZH, tr } = useI18N();

  const stats = useMemo(() => {
    const duration = Number(params.duration) || 0;
    const completed = Number(params.completedCount) || 0;
    const total = Number(params.totalCount) || 0;
    const rpe = Number(params.rpe) || 0;
    const feeling = Number(params.feeling) || 0;
    return { duration, completed, total, rpe, feeling };
  }, [params]);

  const completionPercent = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    if (m < 60) return `${m} min`;
    const h = Math.floor(m / 60);
    const rm = m % 60;
    return `${h}h ${rm}m`;
  };

  const getFeelingIcon = (_f: number): { name: string; color: string; label: string } => {
    return { name: "checkmark-outline", color: "#306E6F", label: "Complete" };
  };

  const handleDone = () => {
    router.dismissAll();
    router.navigate("/(tabs)/calendar");
  };

  const handleViewPlan = () => {
    router.dismissAll();
    router.navigate("/(tabs)/calendar");
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 20 }]}>
      {/* Celebration */}
      <View style={styles.celebrationSection}>
        <Ionicons name="checkmark-outline" size={48} color="#306E6F" />
        <Text style={styles.celebrationTitle}>
          {tr("训练完成!", "Session Complete!")}
        </Text>
        <Text style={styles.celebrationSub}>
          {tr("干得好，继续保持!", "Great job, keep it up!")}
        </Text>
      </View>

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        <StatCard
          label={tr("总时长", "Duration")}
          value={formatDuration(stats.duration)}
        />
        <StatCard
          label={tr("动作完成", "Exercises")}
          value={`${stats.completed}/${stats.total}`}
        />
        <StatCard
          label={tr("完成度", "Completion")}
          value={`${completionPercent}%`}
        />
        {stats.rpe > 0 && (
          <StatCard
            label="RPE"
            value={`${stats.rpe}/10`}
          />
        )}
      </View>

      {/* Actions */}
      <View style={[styles.actions, { paddingBottom: insets.bottom || 24 }]}>
        <TouchableOpacity style={styles.secondaryBtn} onPress={handleViewPlan}>
          <Text style={styles.secondaryBtnText}>{tr("查看计划", "View Plan")}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.primaryBtn} onPress={handleDone}>
          <Ionicons name="checkmark-circle" size={20} color="#FFF" />
          <Text style={styles.primaryBtnText}>{tr("完成", "Done")}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={statStyles.card}>
      <Text style={statStyles.value}>{value}</Text>
      <Text style={statStyles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF", paddingHorizontal: 20 },
  // Celebration
  celebrationSection: { alignItems: "center", marginBottom: 32, marginTop: 20 },
  celebrationTitle: { fontSize: 24, fontFamily: "DMSans_900Black", color: "#000000", marginTop: 12 },
  celebrationSub: { fontSize: 15, color: "#888888", marginTop: 4, fontFamily: "DMSans_400Regular" },
  // Stats
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    justifyContent: "center",
    marginBottom: 32,
  },
  // Actions
  actions: { marginTop: "auto", gap: 12 },
  secondaryBtn: {
    borderWidth: 1.5,
    borderColor: "rgba(0,0,0,0.08)",
    borderRadius: 28,
    paddingVertical: 16,
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  secondaryBtnText: { fontSize: 16, fontFamily: "DMSans_700Bold", color: "#000000" },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#1C1C1E",
    borderRadius: 28,
    paddingVertical: 16,
  },
  primaryBtnText: { fontSize: 16, fontFamily: "DMSans_700Bold", color: "#FFF" },
});

const statStyles = StyleSheet.create({
  card: {
    width: "46%",
    backgroundColor: "#F7F7F7",
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
  },
  value: { fontSize: 28, fontFamily: "DMMono_500Medium", color: "#000000", marginBottom: 2 },
  label: { fontSize: 11, color: "#888888", fontFamily: "DMSans_400Regular", textTransform: "uppercase", letterSpacing: 0.3 },
});
