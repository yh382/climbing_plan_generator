// app/(tabs)/calendar.tsx
import React, { useState, useCallback, useMemo } from "react";
import { View, TouchableOpacity, StyleSheet, RefreshControl, Text } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { startOfWeek, startOfMonth, isAfter, parseISO, format } from "date-fns";
import { TrainingPlanCard } from "../../src/components/plancard";
import { planV3ToTrainingPlan } from "../../src/components/plancard/adapters/planV3ToTrainingPlan";

import CollapsibleLargeHeader from "../../src/components/CollapsibleLargeHeader";
import ExpandableCalendar from "../../src/features/session/components/ExpandableCalendar";
import DailyLogCard from "../../src/features/session/components/DailyLogCard";
import PreSessionModal from "../../src/features/session/components/PreSessionModal";
import ActiveSessionFloat from "../../src/features/journal/ActiveSessionFloat";

import { useI18N } from "../../lib/i18n";
import { PlanV3 } from "../../src/types/plan";
import useLogsStore from "../../src/store/useLogsStore";

export default function CalendarScreen() {
  const router = useRouter();
  const { isZH } = useI18N();

  const { sessions, startSession, activeSession } = useLogsStore();

  const [refreshing, setRefreshing] = useState(false);
  const [planV3, setPlanV3] = useState<PlanV3 | null>(null);
  const [timeFilter, setTimeFilter] = useState<"week" | "month">("week");
  const [showStartModal, setShowStartModal] = useState(false);

  const loadPlan = useCallback(async () => {
    try {
      const rawV3 = await AsyncStorage.getItem("@current_plan_v3");
      setPlanV3(rawV3 ? JSON.parse(rawV3) : null);
    } catch {
      setPlanV3(null);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadPlan();
    }, [loadPlan])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPlan();
    setRefreshing(false);
  };

  const handleStartSession = (gymName: string) => {
    startSession(gymName);
    setShowStartModal(false);
    router.push("/journal");
  };

  const activePlan = useMemo(() => {
    if (!planV3) return null;
    return planV3ToTrainingPlan(planV3, {
      source: "ai",
      visibility: "private",
      status: "active",
    });
  }, [planV3]);

  const historyList = useMemo(() => {
    if (!sessions || sessions.length === 0) return [];

    const now = new Date();
    const startDate = timeFilter === "week" ? startOfWeek(now, { weekStartsOn: 1 }) : startOfMonth(now);

    return sessions
      .filter((s: any) => {
        const d = parseISO(s.date);
        return isAfter(d, startDate) || format(d, "yyyy-MM-dd") === format(startDate, "yyyy-MM-dd");
      })
      .sort((a: any, b: any) => b.startTime.localeCompare(a.startTime))
      .map((s: any) => ({
        id: s.id,
        dateLabel: format(parseISO(s.date), "EEE · MMM dd"),
        rawDate: s.date,
        duration: s.duration,
        sends: typeof s.sends === "number" ? s.sends : 0,
        max: s.best || "V?",
        sessionKey: s.sessionKey || "",
      }));
  }, [sessions, timeFilter]);

  const largeTitle = <Text style={styles.largeTitle}>{isZH ? "日程" : "Calendar"}</Text>;
  const subtitle = <Text style={styles.largeSubtitle}>{isZH ? "安排训练与记录" : "Plan your sessions & logs"}</Text>;

  return (
    <View style={{ flex: 1 }}>
      <CollapsibleLargeHeader
        backgroundColor="#ffffffff"
        largeTitle={largeTitle}
        subtitle={subtitle}
        smallTitle={isZH ? "日程" : "Calendar"}
        rightActions={
          <TouchableOpacity style={styles.iconBtn} onPress={() => router.push("/analysis")}>
            <Ionicons name="stats-chart" size={24} color="#111" />
          </TouchableOpacity>
        }
        scrollViewProps={{
          refreshControl: <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />,
        }}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        <ExpandableCalendar />

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{isZH ? "当前训练" : "Current Training"}</Text>
        </View>

        {activePlan ? (
          <View style={{ paddingHorizontal: 16 }}>
            <TrainingPlanCard
              plan={activePlan}
              variant="active"
              context="personal"
              handlers={{
                onPress: () => router.push("/library/plan-overview"),
                primaryAction: {
                  action: { type: "continue", label: isZH ? "查看计划" : "View Plan" },
                  onAction: () => router.push("/library/plan-overview"),
                },
              }}
              display={{ showSourceBadge: true, showVisibilityBadge: false }}
            />
          </View>
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No Active Plan</Text>
            <Text style={styles.emptySub}>Create a plan to start training!</Text>
            <TouchableOpacity style={styles.createBtn} onPress={() => router.push("/library/plan-overview")}>
              <Text style={styles.createBtnText}>Generate Plan</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.logSectionHeader}>
          <TouchableOpacity
            style={styles.filterBtn}
            onPress={() => setTimeFilter((prev) => (prev === "week" ? "month" : "week"))}
          >
            <Text style={styles.sectionTitle}>
              {timeFilter === "week"
                ? isZH
                  ? "本周攀爬"
                  : "This Week's Climbing"
                : isZH
                  ? "本月攀爬"
                  : "This Month's Climbing"}
            </Text>
            <Ionicons name="chevron-down" size={16} color="#111" style={{ marginTop: 2 }} />
          </TouchableOpacity>

          {activeSession ? (
            <ActiveSessionFloat variant="inline" />
          ) : (
            <TouchableOpacity style={styles.startLogBtn} onPress={() => setShowStartModal(true)}>
              <Ionicons name="add" size={18} color="#FFF" />
              <Text style={styles.startLogText}>Start Log</Text>
            </TouchableOpacity>
          )}
        </View>

        {historyList.length > 0 ? (
          <View style={{ gap: 0 }}>
            {historyList.map((log) => (
              <DailyLogCard
                key={log.id}
                dateLabel={log.dateLabel}
                duration={log.duration}
                sends={log.sends}
                maxGrade={log.max}
                onPress={() => {
                  router.push({
                    pathname: "/library/log-detail",
                    params: {
                      date: log.rawDate,
                      sessionKey: log.sessionKey, // ✅ per-session detail
                    },
                  });
                }}
              />
            ))}
          </View>
        ) : (
          <View style={{ padding: 24, alignItems: "center", opacity: 0.5 }}>
            <Ionicons name="document-text-outline" size={32} color="#9CA3AF" />
            <Text style={{ color: "#9CA3AF", marginTop: 8 }}>{isZH ? "暂无记录" : "No logs yet."}</Text>
          </View>
        )}
      </CollapsibleLargeHeader>

      <PreSessionModal visible={showStartModal} onClose={() => setShowStartModal(false)} onStart={handleStartSession} />
    </View>
  );
}

const styles = StyleSheet.create({
  iconBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  largeTitle: { fontSize: 32, fontWeight: "800", color: "#111", lineHeight: 38 },
  largeSubtitle: { fontSize: 14, color: "#6B7280", marginTop: 2 },

  sectionHeader: { paddingHorizontal: 16, paddingTop: 18, paddingBottom: 10 },
  sectionTitle: { fontSize: 22, fontWeight: "800", color: "#111" },

  emptyCard: {
    marginHorizontal: 16,
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  emptyTitle: { fontSize: 16, fontWeight: "800", color: "#111" },
  emptySub: { marginTop: 6, color: "#6B7280" },
  createBtn: {
    marginTop: 12,
    alignSelf: "flex-start",
    backgroundColor: "#111",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  createBtnText: { color: "#FFF", fontWeight: "800" },

  logSectionHeader: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  filterBtn: { flexDirection: "row", alignItems: "center", gap: 8 },

  startLogBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#111",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  startLogText: { color: "#FFF", fontWeight: "800" },
});
