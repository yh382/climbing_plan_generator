// app/(tabs)/calendar.tsx
import { useState, useCallback, useMemo } from "react";
import { View, TouchableOpacity, StyleSheet, RefreshControl, Text } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { subDays, parseISO, format } from "date-fns";
import { TrainingPlanCard } from "../../src/components/plancard";
import { planDetailToTrainingPlan } from "../../src/features/plans/adapters";

import CollapsibleLargeHeader from "../../src/components/CollapsibleLargeHeader";
import ExpandableCalendar from "../../src/features/session/components/ExpandableCalendar";
import DailyLogCard from "../../src/features/session/components/DailyLogCard";
import ClimbItemCard from "../../src/components/shared/ClimbItemCard";
import PreSessionModal from "../../src/features/session/components/PreSessionModal";
import ActiveSessionFloat from "../../src/features/journal/ActiveSessionFloat";

import { readDayList } from "../../src/features/journal/loglist/storage";
import type { LocalDayLogItem } from "../../src/features/journal/loglist/types";

import { useI18N } from "../../lib/i18n";
import useLogsStore from "../../src/store/useLogsStore";
import { usePlanStore } from "../../src/store/usePlanStore";
import useActiveWorkoutStore from "../../src/store/useActiveWorkoutStore";

export default function CalendarScreen() {
  const router = useRouter();
  const { isZH } = useI18N();

  const { sessions, startSession, activeSession } = useLogsStore();
  const { activePlan: activePlanData, fetchActivePlan } = usePlanStore();
  const { isActive: workoutActive, isMinimized: workoutMinimized, seconds: workoutSeconds, sessionJson: workoutSessionJson } = useActiveWorkoutStore();

  const [refreshing, setRefreshing] = useState(false);
  type TimeFilter = "week" | "month" | "last_month" | "3_months" | "6_months";
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("month");
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [showStartModal, setShowStartModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Climb items for selected date (inline detail)
  const [climbItems, setClimbItems] = useState<LocalDayLogItem[]>([]);

  const handleDateSelect = useCallback((date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    setSelectedDate((prev) => (prev === dateStr ? null : dateStr));
  }, []);

  // Load climb items when date is selected or screen regains focus (e.g. after delete)
  useFocusEffect(
    useCallback(() => {
      if (!selectedDate) {
        setClimbItems([]);
        return;
      }
      let cancelled = false;

      const load = async () => {
        const [b, tr, l] = await Promise.all([
          readDayList(selectedDate, "boulder"),
          readDayList(selectedDate, "toprope"),
          readDayList(selectedDate, "lead"),
        ]);
        if (cancelled) return;
        setClimbItems([...(b || []), ...(tr || []), ...(l || [])]);
      };

      load();
      return () => {
        cancelled = true;
      };
    }, [selectedDate])
  );

  useFocusEffect(
    useCallback(() => {
      fetchActivePlan();
    }, [fetchActivePlan])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchActivePlan();
    setRefreshing(false);
  };

  const handleStartSession = (gymName: string, discipline: "boulder" | "rope") => {
    startSession(gymName, discipline);
    setShowStartModal(false);
    router.push("/journal");
  };

  const activePlan = useMemo(() => {
    if (!activePlanData) return null;
    return planDetailToTrainingPlan(activePlanData);
  }, [activePlanData]);

  const filterDate = useMemo(() => {
    const now = new Date();
    switch (timeFilter) {
      case "week": return subDays(now, 7);
      case "month": return subDays(now, 30);
      case "last_month": return subDays(now, 60);
      case "3_months": return subDays(now, 90);
      case "6_months": return subDays(now, 180);
    }
  }, [timeFilter]);

  const historyList = useMemo(() => {
    if (!sessions || sessions.length === 0) return [];

    let filtered = sessions;

    if (selectedDate) {
      filtered = sessions.filter((s: any) => s.date === selectedDate);
    } else {
      filtered = sessions.filter((s: any) => new Date(s.date) >= filterDate);
    }

    return filtered
      .sort((a: any, b: any) => b.startTime.localeCompare(a.startTime))
      .map((s: any) => ({
        id: s.id,
        dateLabel: format(parseISO(s.date), "EEE · M.dd"),
        rawDate: s.date,
        duration: s.duration,
        climbs: typeof s.climbs === "number" ? s.climbs : 0,
        sends: typeof s.sends === "number" ? s.sends : 0,
        max: s.best || "V?",
        sessionKey: s.sessionKey || "",
      }));
  }, [sessions, filterDate, selectedDate]);

  const filterOptions: { key: TimeFilter; label: string }[] = [
    { key: "week", label: isZH ? "本周" : "This Week" },
    { key: "month", label: isZH ? "本月" : "This Month" },
    { key: "last_month", label: isZH ? "上月" : "Last Month" },
    { key: "3_months", label: isZH ? "近3个月" : "Last 3 Months" },
    { key: "6_months", label: isZH ? "近6个月" : "Last 6 Months" },
  ];

  const activeFilterLabel = filterOptions.find(o => o.key === timeFilter)?.label ?? "";

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
        <ExpandableCalendar onDateSelect={handleDateSelect} />

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{isZH ? "当前训练" : "Current Training"}</Text>
        </View>

        {activePlan ? (
          <View style={{ paddingHorizontal: 16 }}>
            <TrainingPlanCard
              plan={activePlan}
              variant="active"
              context="personal"
              workoutTimer={workoutActive && workoutMinimized ? `${String(Math.floor(workoutSeconds / 60)).padStart(2, "0")}:${String(workoutSeconds % 60).padStart(2, "0")}` : undefined}
              handlers={{
                onPress: () => router.push({ pathname: "/library/plan-overview", params: { planId: activePlanData?.id, source: "user" } } as any),
                primaryAction: {
                  action: { type: "continue", label: isZH ? "查看计划" : "View Plan" },
                  onAction: () => router.push({ pathname: "/library/plan-overview", params: { planId: activePlanData?.id, source: "user" } } as any),
                },
                onResumeWorkout: workoutSessionJson ? () => router.push({ pathname: "/library/plan-view", params: { sessionJson: workoutSessionJson } } as any) : undefined,
              }}
              display={{ showSourceBadge: true, showVisibilityBadge: false }}
            />
          </View>
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>{isZH ? "暂无训练计划" : "No Active Plan"}</Text>
            <Text style={styles.emptySub}>{isZH ? "创建计划开始训练！" : "Create a plan to start training!"}</Text>
            <TouchableOpacity style={styles.createBtn} onPress={() => router.push("/library/plans")}>
              <Text style={styles.createBtnText}>{isZH ? "浏览计划" : "Browse Plans"}</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.logSectionHeader}>
          {selectedDate ? (
            <TouchableOpacity style={styles.filterBtn} onPress={() => setSelectedDate(null)}>
              <Ionicons name="chevron-back" size={20} color="#111" />
              <Text style={styles.sectionTitle}>
                {format(parseISO(selectedDate), "MMM dd")}
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.filterBtn}
              onPress={() => setShowFilterDropdown(!showFilterDropdown)}
            >
              <Text style={styles.sectionTitle}>{activeFilterLabel}</Text>
              <Ionicons name={showFilterDropdown ? "chevron-up" : "chevron-down"} size={16} color="#111" style={{ marginTop: 2 }} />
            </TouchableOpacity>
          )}

          {activeSession ? (
            <ActiveSessionFloat variant="inline" />
          ) : (
            <TouchableOpacity style={styles.startLogBtn} onPress={() => setShowStartModal(true)}>
              <Ionicons name="add" size={18} color="#FFF" />
              <Text style={styles.startLogText}>Start Log</Text>
            </TouchableOpacity>
          )}
        </View>

        {showFilterDropdown && !selectedDate && (
          <View style={styles.dropdown}>
            {filterOptions.map(opt => (
              <TouchableOpacity
                key={opt.key}
                onPress={() => { setTimeFilter(opt.key); setShowFilterDropdown(false); }}
                style={[styles.dropdownItem, timeFilter === opt.key && styles.dropdownItemActive]}
              >
                <Text style={[styles.dropdownText, timeFilter === opt.key && styles.dropdownTextActive]}>{opt.label}</Text>
                {timeFilter === opt.key && <Ionicons name="checkmark" size={16} color="#111" />}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Content area: inline climb items when date selected, otherwise session cards */}
        {selectedDate && climbItems.length > 0 ? (
          <View style={{ gap: 0 }}>
            {climbItems.map((item) => (
              <ClimbItemCard
                key={item.id}
                item={item}
                onPress={() => {
                  router.push({
                    pathname: "/library/route-detail",
                    params: {
                      date: selectedDate,
                      itemId: item.id,
                      type: item.type,
                    },
                  });
                }}
              />
            ))}
          </View>
        ) : historyList.length > 0 && !selectedDate ? (
          <View style={{ gap: 0 }}>
            {historyList.map((log) => (
              <DailyLogCard
                key={log.id}
                dateLabel={log.dateLabel}
                duration={log.duration}
                climbs={log.climbs}
                sends={log.sends}
                maxGrade={log.max}
                onPress={() => {
                  router.push({
                    pathname: "/library/log-detail",
                    params: {
                      date: log.rawDate,
                      sessionKey: log.sessionKey,
                    },
                  });
                }}
              />
            ))}
          </View>
        ) : (
          <View style={{ padding: 24, alignItems: "center", opacity: 0.5 }}>
            <Ionicons name="document-text-outline" size={32} color="#9CA3AF" />
            <Text style={{ color: "#9CA3AF", marginTop: 8 }}>
              {isZH ? "暂无记录" : "No logs yet."}
            </Text>
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
  sectionTitle: { fontSize: 20, fontWeight: "800", color: "#111" },

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

  dropdown: {
    marginHorizontal: 16,
    backgroundColor: "#FFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    overflow: "hidden",
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  dropdownItemActive: {
    backgroundColor: "#F3F4F6",
  },
  dropdownText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#374151",
  },
  dropdownTextActive: {
    color: "#111",
    fontWeight: "800",
  },
});
