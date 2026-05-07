// src/features/activity/SessionsSegment.tsx
// Sessions segment of the Activity tab. Hosts the month calendar + filter
// dropdown + session list. Extracted from the original calendar/index.tsx
// so the parent Activity screen can swap in Training / Analysis segments.

import React, { useState, useCallback, useMemo, useRef } from "react";
import { View, TouchableOpacity, StyleSheet, RefreshControl, Text, ScrollView } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { subDays, format, startOfMonth, subMonths } from "date-fns";

import { theme } from "@/lib/theme";
import { useThemeColors } from "../../lib/useThemeColors";
import MonthCalendar from "./MonthCalendar";
import ActivitySegmentBar from "./ActivitySegmentBar";
import ActivitySubtitle from "./ActivitySubtitle";
import DailyGroupCard from "../dailysummary/DailyGroupCard";
import { useDailyGroupSummaries } from "../dailysummary/useDailyGroupSummaries";
import PreSessionModal from "../session/components/PreSessionModal";
import ActiveSessionFloat from "../journal/ActiveSessionFloat";
import StartLogPrompt, { showQuickLogComingSoonAlert } from "../journal/StartLogPrompt";

import { useI18N } from "../../../lib/i18n";
import { useSettings } from "../../contexts/SettingsContext";
import useLogsStore, { type LogType } from "../../store/useLogsStore";
import { gymCommunityApi } from "../gyms/api";
export default function SessionsSegment() {
  const router = useRouter();
  const { isZH } = useI18N();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const { startSession, activeSession, syncFromBackend, isSyncing } = useLogsStore();
  const { tr } = useSettings();

  const [refreshing, setRefreshing] = useState(false);
  type TimeFilter = "week" | "month" | "last_month" | "3_months" | "6_months";
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("month");
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [showStartModal, setShowStartModal] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);

  const handleDateSelect = useCallback((date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    // Tap any cell → daily-summary. The calendar is a launcher, not a
    // filter — there is no "select date then explore" two-step UX here.
    router.push({ pathname: "/daily-summary", params: { date: dateStr } } as any);
  }, [router]);

  // Throttled 2 min (was 30s) — full sync is heavy; pull-to-refresh below
  // still triggers immediate sync for explicit user intent.
  const lastSyncRef = useRef(0);
  useFocusEffect(
    useCallback(() => {
      const now = Date.now();
      if (!isSyncing && now - lastSyncRef.current > 120_000) {
        lastSyncRef.current = now;
        syncFromBackend();
      }
    }, [isSyncing, syncFromBackend])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await syncFromBackend();
    setRefreshing(false);
  };

  const handleStartSession = async (gymName: string, discipline: LogType, placeId: string | null) => {
    let gymId: string | null = null;
    if (placeId) {
      try {
        const res = await gymCommunityApi.ensureGym(placeId);
        gymId = res.gym_id;
      } catch { /* proceed without gym_id */ }
    }
    startSession(gymName, discipline, gymId);
    setShowStartModal(false);
    router.push("/journal");
  };

  const filterDate = useMemo(() => {
    const now = new Date();
    switch (timeFilter) {
      case "week": return subDays(now, 7);
      case "month": return startOfMonth(now);
      case "last_month": return startOfMonth(subMonths(now, 1));
      case "3_months": return startOfMonth(subMonths(now, 3));
      case "6_months": return startOfMonth(subMonths(now, 6));
    }
  }, [timeFilter]);

  const dayGroups = useDailyGroupSummaries({ from: filterDate });

  const filterOptions: { key: TimeFilter; label: string }[] = [
    { key: "week", label: isZH ? "本周" : "This Week" },
    { key: "month", label: isZH ? "本月" : "This Month" },
    { key: "last_month", label: isZH ? "上月" : "Last Month" },
    { key: "3_months", label: isZH ? "近3个月" : "Last 3 Months" },
    { key: "6_months", label: isZH ? "近6个月" : "Last 6 Months" },
  ];

  const activeFilterLabel = filterOptions.find(o => o.key === timeFilter)?.label ?? "";

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentInsetAdjustmentBehavior="automatic"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      contentContainerStyle={{ paddingBottom: 120 }}
    >
      <ActivitySubtitle />
      <ActivitySegmentBar />
      <StatusBar style="auto" />
      <MonthCalendar onDateSelect={handleDateSelect} activeDate={null} />

      <View style={styles.logSectionHeader}>
        <TouchableOpacity
          style={styles.filterBtn}
          onPress={() => setShowFilterDropdown(!showFilterDropdown)}
        >
          <Text style={styles.sectionTitle}>{activeFilterLabel}</Text>
          <Ionicons name={showFilterDropdown ? "chevron-up" : "chevron-down"} size={16} color={colors.textPrimary} style={{ marginTop: 2 }} />
        </TouchableOpacity>

        {activeSession ? (
          <ActiveSessionFloat variant="inline" />
        ) : (
          <TouchableOpacity style={styles.startLogBtn} onPress={() => setShowPrompt(true)}>
            <Ionicons name="add" size={18} color="#FFF" />
            <Text style={styles.startLogText}>Start Log</Text>
          </TouchableOpacity>
        )}
      </View>

      {showFilterDropdown && (
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

      {dayGroups.length > 0 ? (
        <View style={{ gap: 0 }}>
          {dayGroups.map((grp) => (
            <DailyGroupCard
              key={grp.date}
              summary={grp}
              onPress={() => {
                router.push({ pathname: "/daily-summary", params: { date: grp.date } } as any);
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
      <StartLogPrompt
        visible={showPrompt}
        onClose={() => setShowPrompt(false)}
        onStartTimed={() => {
          setShowPrompt(false);
          setTimeout(() => setShowStartModal(true), 280);
        }}
        onQuickLog={() => {
          setShowPrompt(false);
          showQuickLogComingSoonAlert(tr);
        }}
      />
    </ScrollView>
  );
}

const createStyles = (colors: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    sectionTitle: { fontSize: 20, fontWeight: "800", fontFamily: theme.fonts.black, color: colors.textPrimary },
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
      backgroundColor: colors.cardDark,
      borderRadius: theme.borderRadius.pill,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    startLogText: { color: "#FFF", fontWeight: "800", fontFamily: theme.fonts.bold },
    dropdown: {
      marginHorizontal: 16,
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
    dropdownItemActive: { backgroundColor: colors.backgroundSecondary },
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
