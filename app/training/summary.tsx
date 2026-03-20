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

  const getFeelingIcon = (f: number): { name: string; color: string; label: string } => {
    switch (f) {
      case 1: return { name: "battery-dead-outline", color: "#EF4444", label: "Exhausted" };
      case 2: return { name: "remove-circle-outline", color: "#F59E0B", label: "Okay" };
      case 3: return { name: "happy-outline", color: "#10B981", label: "Good" };
      case 4: return { name: "flame-outline", color: "#F97316", label: "Great" };
      default: return { name: "happy-outline", color: "#10B981", label: "Good" };
    }
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
        <View style={[styles.celebrationIconWrap, { backgroundColor: getFeelingIcon(stats.feeling).color + "15" }]}>
          <Ionicons
            name={getFeelingIcon(stats.feeling).name as any}
            size={40}
            color={getFeelingIcon(stats.feeling).color}
          />
        </View>
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
          icon="time-outline"
          label={tr("总时长", "Duration")}
          value={formatDuration(stats.duration)}
          color="#3B82F6"
        />
        <StatCard
          icon="barbell-outline"
          label={tr("动作完成", "Exercises")}
          value={`${stats.completed}/${stats.total}`}
          color="#10B981"
        />
        <StatCard
          icon="speedometer-outline"
          label={tr("完成度", "Completion")}
          value={`${completionPercent}%`}
          color="#F59E0B"
        />
        {stats.rpe > 0 && (
          <StatCard
            icon="flash-outline"
            label="RPE"
            value={`${stats.rpe}/10`}
            color="#EF4444"
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

function StatCard({ icon, label, value, color }: { icon: string; label: string; value: string; color: string }) {
  return (
    <View style={statStyles.card}>
      <View style={[statStyles.iconCircle, { backgroundColor: color + "15" }]}>
        <Ionicons name={icon as any} size={22} color={color} />
      </View>
      <Text style={statStyles.value}>{value}</Text>
      <Text style={statStyles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FAFAFA", paddingHorizontal: 20 },
  // Celebration
  celebrationSection: { alignItems: "center", marginBottom: 32, marginTop: 20 },
  celebrationIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  celebrationTitle: { fontSize: 24, fontWeight: "800", color: "#111" },
  celebrationSub: { fontSize: 15, color: "#6B7280", marginTop: 4 },
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
    borderColor: "#E5E7EB",
    borderRadius: 28,
    paddingVertical: 16,
    alignItems: "center",
    backgroundColor: "#FFF",
  },
  secondaryBtnText: { fontSize: 16, fontWeight: "700", color: "#374151" },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#111827",
    borderRadius: 28,
    paddingVertical: 16,
  },
  primaryBtnText: { fontSize: 16, fontWeight: "700", color: "#FFF" },
});

const statStyles = StyleSheet.create({
  card: {
    width: "46%",
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  value: { fontSize: 22, fontWeight: "800", color: "#111", marginBottom: 2 },
  label: { fontSize: 12, color: "#6B7280", fontWeight: "500" },
});
