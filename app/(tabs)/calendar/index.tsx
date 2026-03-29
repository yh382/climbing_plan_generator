// app/(tabs)/calendar/index.tsx
import React, { useState, useCallback, useMemo, useLayoutEffect, useRef } from "react";
import { View, TouchableOpacity, StyleSheet, RefreshControl, Text, ScrollView } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Stack } from "expo-router";
import { useSidebar } from "@/contexts/SidebarContext";
import { theme } from "@/lib/theme";
import { useThemeColors } from "../../../src/lib/useThemeColors";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { subDays, parseISO, format } from "date-fns";
import { TrainingPlanCard } from "../../../src/components/plancard";
import { planDetailToTrainingPlan } from "../../../src/features/plans/adapters";

import { NATIVE_HEADER_LARGE, withHeaderTheme } from "@/lib/nativeHeaderOptions";
import ExpandableCalendar from "../../../src/features/session/components/ExpandableCalendar";
import DailyLogCard from "../../../src/features/session/components/DailyLogCard";
import ClimbItemCard from "../../../src/components/shared/ClimbItemCard";
import PreSessionModal from "../../../src/features/session/components/PreSessionModal";
import ActiveSessionFloat from "../../../src/features/journal/ActiveSessionFloat";

import { readDayList } from "../../../src/features/journal/loglist/storage";
import type { LocalDayLogItem } from "../../../src/features/journal/loglist/types";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { useI18N } from "../../../lib/i18n";
import useLogsStore, { type LogType } from "../../../src/store/useLogsStore";
import { usePlanStore } from "../../../src/store/usePlanStore";
import useActiveWorkoutStore from "../../../src/store/useActiveWorkoutStore";

export default function CalendarScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { isZH } = useI18N();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const { toggleSidebar } = useSidebar();

  useLayoutEffect(() => {
    navigation.setOptions({
      ...NATIVE_HEADER_LARGE,
      ...withHeaderTheme(colors),
      headerShown: true,
      title: isZH ? "日程" : "Calendar",
    });
  }, [navigation, isZH, colors]);

  const { sessions, startSession, activeSession, syncFromBackend, isSyncing } = useLogsStore();
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

  const handleCalendarCollapse = useCallback(() => {
    setSelectedDate(null);
    setTimeFilter("month");
  }, []);

  const handleDateSelect = useCallback((date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    const todayStr = format(new Date(), "yyyy-MM-dd");
    // Tap today or tap same date again → back to month view
    if (dateStr === todayStr || dateStr === selectedDate) {
      setSelectedDate(null);
    } else {
      setSelectedDate(dateStr);
    }
  }, [selectedDate]);

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

  // Sync from backend every time the tab gains focus (throttled to 30s)
  const lastSyncRef = useRef(0);
  useFocusEffect(
    useCallback(() => {
      const now = Date.now();
      if (!isSyncing && now - lastSyncRef.current > 30_000) {
        lastSyncRef.current = now;
        syncFromBackend();
      }
    }, [isSyncing, syncFromBackend])
  );

  // Setup Climmate: auto-open PreSessionModal when navigated from Home setup
  useFocusEffect(
    useCallback(() => {
      AsyncStorage.getItem("setup_auto_open_presession").then((val) => {
        if (val === "true") {
          AsyncStorage.removeItem("setup_auto_open_presession");
          setTimeout(() => setShowStartModal(true), 300);
        }
      });
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchActivePlan(), syncFromBackend()]);
    setRefreshing(false);
  };

  const handleStartSession = (gymName: string, discipline: LogType) => {
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
        max: s.best || "—",
        sessionKey: s.sessionKey || "",
        discipline: s.discipline || "boulder",
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

  return (
    <>
      <Stack.Toolbar placement="left">
        <Stack.Toolbar.Button icon="line.3.horizontal" onPress={toggleSidebar} />
      </Stack.Toolbar>
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button icon="chart.line.uptrend.xyaxis" onPress={() => router.push("/analysis")} />
      </Stack.Toolbar>
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentInsetAdjustmentBehavior="automatic"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        <StatusBar style="auto" />
        <ExpandableCalendar onDateSelect={handleDateSelect} onCollapse={handleCalendarCollapse} activeDate={selectedDate} />

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{isZH ? "当前训练" : "Current Training"}</Text>
        </View>

        {activePlan ? (
          <View style={{ paddingHorizontal: theme.spacing.screenPadding }}>
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
              <Ionicons name="chevron-back" size={20} color={colors.textPrimary} />
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
              <Ionicons name={showFilterDropdown ? "chevron-up" : "chevron-down"} size={16} color={colors.textPrimary} style={{ marginTop: 2 }} />
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
                {timeFilter === opt.key && <Ionicons name="checkmark" size={16} color={colors.textPrimary} />}
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
                      mode: log.discipline,
                    },
                  });
                }}
              />
            ))}
          </View>
        ) : (
          <View style={{ padding: 24, alignItems: "center", opacity: 0.5 }}>
            <Ionicons name="document-text-outline" size={32} color={colors.textTertiary} />
            <Text style={{ color: colors.textTertiary, fontFamily: theme.fonts.regular, marginTop: 8 }}>
              {isZH ? "暂无记录" : "No logs yet."}
            </Text>
          </View>
        )}
        <PreSessionModal visible={showStartModal} onClose={() => setShowStartModal(false)} onStart={handleStartSession} />
      </ScrollView>
    </>
  );
}

const createStyles = (colors: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    sectionHeader: { paddingHorizontal: theme.spacing.screenPadding, paddingTop: 10, paddingBottom: 10 },
    sectionTitle: { fontSize: 20, fontWeight: "800", fontFamily: theme.fonts.black, color: colors.textPrimary },

    emptyCard: {
      marginHorizontal: theme.spacing.screenPadding,
      backgroundColor: colors.backgroundSecondary,
      borderRadius: theme.borderRadius.card,
      padding: 16,
    },
    emptyTitle: { fontSize: 16, fontWeight: "800", fontFamily: theme.fonts.bold, color: colors.textPrimary },
    emptySub: { marginTop: 6, fontFamily: theme.fonts.regular, color: colors.textSecondary },
    createBtn: {
      marginTop: 12,
      alignSelf: "flex-start",
      backgroundColor: colors.cardDark,
      borderRadius: theme.borderRadius.pill,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    createBtnText: { color: "#FFF", fontWeight: "800", fontFamily: theme.fonts.bold },

    logSectionHeader: {
      paddingHorizontal: theme.spacing.screenPadding,
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
      backgroundColor: colors.cardDark,
      borderRadius: theme.borderRadius.pill,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    startLogText: { color: "#FFF", fontWeight: "800", fontFamily: theme.fonts.bold },

    dropdown: {
      marginHorizontal: theme.spacing.screenPadding,
      backgroundColor: colors.background,
      borderRadius: theme.borderRadius.cardSmall,
      borderWidth: 1,
      borderColor: colors.border,
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
      backgroundColor: colors.backgroundSecondary,
    },
    dropdownText: {
      fontSize: 15,
      fontWeight: "600",
      fontFamily: theme.fonts.medium,
      color: colors.textSecondary,
    },
    dropdownTextActive: {
      color: colors.textPrimary,
      fontWeight: "800",
      fontFamily: theme.fonts.bold,
    },
  });
