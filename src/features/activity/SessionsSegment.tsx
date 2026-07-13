// src/features/activity/SessionsSegment.tsx
// Sessions segment of the Activity tab. Hosts the month calendar + time
// filter (MenuPill) + session list. Extracted from the original
// calendar/index.tsx so the parent Activity screen can swap in Training /
// Analysis segments.

import React, { useState, useCallback, useMemo, useRef } from "react";
import { View, StyleSheet, RefreshControl, Text, ScrollView } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { subDays, format, startOfMonth, subMonths } from "date-fns";

import { theme } from "@/lib/theme";
import { useThemeColors } from "../../lib/useThemeColors";
import { MenuPill } from "../../components/ui/MenuPill";
import PressableScale from "../../components/ui/PressableScale";
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
import QuickInsightsRibbon from "./QuickInsightsRibbon";
import { useQuickInsights } from "./useQuickInsights";
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
  const [showStartModal, setShowStartModal] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  // Sessions is the climbing journal. Pure training sessions live on
  // the Training segment. Mixed sessions (template-driven climbing —
  // 4x4, ARC, limit boulder) surface in both feeds so the user doesn't
  // lose them. BE finalize_session promotes climbing-equipment templates
  // to "mixed" automatically (services/sessions.py).
  const ACTIVITY_TYPE_FOR_SESSIONS = "climb" as const;

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

  const dayGroups = useDailyGroupSummaries({
    from: filterDate,
    activityType: ACTIVITY_TYPE_FOR_SESSIONS,
  });

  // TR7 — ribbon cards. Lives inside the segment ScrollView, above the
  // filter row, so first content the user sees is the strategic CSM cell
  // + top grade + volume. Cards push to /analysis?focus=... on tap.
  const insightCards = useQuickInsights({ isZH, segment: "sessions" });

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
      {/* TR4: MonthCalendar above SegmentBar — consistent with
          TrainingSegment so segment switching never feels like it would
          shuffle the shared calendar. */}
      <MonthCalendar onDateSelect={handleDateSelect} activeDate={null} />
      <ActivitySegmentBar />
      <StatusBar style="auto" />

      <QuickInsightsRibbon cards={insightCards} />

      <View style={styles.logSectionHeader}>
        {/* Time filter — native UIMenu via MenuPill (codebase hard rule:
            tap-to-pick-one goes through MenuPill, not a hand-drawn
            dropdown). Chromeless: text + chevron only, no capsule. */}
        <MenuPill
          variant="labeled"
          chromeless
          label={activeFilterLabel}
          accessibilityLabel={tr("筛选时间范围", "Filter time range")}
          options={filterOptions.map((opt) => ({
            label: opt.label,
            onPress: () => setTimeFilter(opt.key),
          }))}
        />

        {activeSession ? (
          <ActiveSessionFloat variant="inline" />
        ) : (
          <PressableScale style={styles.startLogBtn} onPress={() => setShowPrompt(true)}>
            <Ionicons name="add" size={18} color={colors.pillText} />
            <Text style={styles.startLogText}>{tr("开始记录", "Start Log")}</Text>
          </PressableScale>
        )}
      </View>


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
    logSectionHeader: {
      paddingHorizontal: 16,
      paddingTop: 18,
      paddingBottom: 10,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    // DL v1 §2.4 — the screen's single primary capsule.
    startLogBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      backgroundColor: colors.pillBackground,
      borderRadius: theme.borderRadius.pill,
      paddingHorizontal: 16,
      paddingVertical: 11,
    },
    startLogText: {
      color: colors.pillText,
      fontSize: 14.5,
      fontFamily: theme.fonts.bold,
    },
  });
