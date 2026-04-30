// app/daily-summary.tsx
// Day-scoped summary page: persistent analysis dashboard + active session
// card (if any) + completed session groups + quick logs. Replaces the old
// session-detail page; Live Activity tap and endSession all land here.

import React, { useCallback, useLayoutEffect, useMemo } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useNavigation } from "@react-navigation/native";
import { format, addDays, subDays, parseISO } from "date-fns";

import { NATIVE_HEADER_LARGE, withHeaderTheme } from "@/lib/nativeHeaderOptions";
import { theme } from "@/lib/theme";
import { useThemeColors } from "../src/lib/useThemeColors";
import { useSettings } from "../src/contexts/SettingsContext";
import { HeaderButton } from "../src/components/ui/HeaderButton";

import { useDailyData } from "../src/features/dailysummary/useDailyData";
import DailyDashboardCarousel from "../src/features/dailysummary/DailyDashboardCarousel";
import DailyDateNavBar from "../src/features/dailysummary/DailyDateNavBar";
import ActiveSessionCard from "../src/features/dailysummary/ActiveSessionCard";
import SessionGroupHeader from "../src/features/dailysummary/SessionGroupHeader";
import useSettingsStore from "../src/store/useSettingsStore";
import ClimbItemCard from "../src/components/shared/ClimbItemCard";

function resolveDateParam(raw: string | string[] | undefined): string {
  const v = Array.isArray(raw) ? raw[0] : raw;
  if (!v || v === "today") return new Date().toISOString().slice(0, 10);
  // Expect YYYY-MM-DD; fall back to today on invalid input.
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  return new Date().toISOString().slice(0, 10);
}

export default function DailySummaryScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const params = useLocalSearchParams<{ date?: string }>();
  const colors = useThemeColors();
  const { tr } = useSettings();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const date = resolveDateParam(params.date);

  const data = useDailyData(date);

  const navigateDays = useCallback(
    (delta: number) => {
      const next = delta > 0 ? addDays(parseISO(date), delta) : subDays(parseISO(date), -delta);
      router.setParams({ date: format(next, "yyyy-MM-dd") });
    },
    [date, router]
  );

  useLayoutEffect(() => {
    navigation.setOptions({
      ...NATIVE_HEADER_LARGE,
      ...withHeaderTheme(colors),
      headerShown: true,
      headerTransparent: true,
      scrollEdgeEffects: { top: "soft" },
      title: tr("总结", "Summary"),
      headerLeft: () => (
        <HeaderButton icon="chevron.backward" onPress={() => router.back()} />
      ),
      headerRight: undefined,
    });
  }, [navigation, router, tr, colors]);

  const setSegment = useSettingsStore((s) => s.setActivitySegment);

  const hasAnyContent =
    !!data.activeSession || data.sessions.length > 0 || data.quickLogs.length > 0;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentInsetAdjustmentBehavior="automatic"
      stickyHeaderIndices={[0]}
      contentContainerStyle={{ paddingBottom: 140 }}
    >
      <DailyDateNavBar
        date={date}
        onPrev={() => navigateDays(-1)}
        onNext={() => navigateDays(1)}
      />
      <DailyDashboardCarousel data={data} />

      {data.activeSession && (
        <ActiveSessionCard
          startTime={data.activeSession.startTime}
          gymName={data.activeSession.gymName}
          discipline={data.activeSession.discipline}
        />
      )}

      {data.sessions.map((group, idx) => (
        <View key={group.session.id}>
          <SessionGroupHeader
            index={idx + 1}
            startTime={group.session.startTime}
            endTime={group.session.endTime}
            duration={group.session.duration}
          />
          {group.items.length > 0 ? (
            group.items.map((item) => (
              <ClimbItemCard
                key={item.id}
                item={item}
                onPress={() => {
                  router.push({
                    pathname: "/library/route-detail",
                    params: { date, itemId: item.id, type: item.type },
                  });
                }}
              />
            ))
          ) : (
            <Text style={styles.placeholder}>{tr("本次 session 暂无记录", "No climbs in this session")}</Text>
          )}
        </View>
      ))}

      {data.quickLogs.length > 0 && (
        <View>
          <View style={styles.quickLogsHeader}>
            <View style={styles.rule} />
            <Text style={styles.quickLogsLabel}>{tr("快速记录", "Quick Logs")}</Text>
            <View style={styles.rule} />
          </View>
          {data.quickLogs.map((item) => (
            <ClimbItemCard
              key={item.id}
              item={item}
              onPress={() => {
                router.push({
                  pathname: "/library/route-detail",
                  params: { date, itemId: item.id, type: item.type },
                });
              }}
            />
          ))}
        </View>
      )}

      {!hasAnyContent && (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyText}>{tr("这一天没有记录", "Nothing logged on this day")}</Text>
        </View>
      )}

      <TouchableOpacity
        style={styles.viewAllBtn}
        activeOpacity={0.85}
        onPress={() => {
          setSegment("analysis");
          router.push("/(drawer)/(tabs)/activity" as any);
        }}
      >
        <Text style={styles.viewAllText}>{tr("查看完整分析 →", "View full analysis →")}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const createStyles = (colors: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    placeholder: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      fontSize: 13,
      fontFamily: theme.fonts.regular,
      color: colors.textTertiary,
    },
    quickLogsHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingHorizontal: 16,
      paddingTop: 24,
      paddingBottom: 8,
    },
    rule: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
    quickLogsLabel: {
      fontSize: 12,
      fontFamily: theme.fonts.medium,
      color: colors.textSecondary,
      letterSpacing: 0.3,
    },
    emptyWrap: {
      alignItems: "center",
      paddingTop: 40,
      paddingBottom: 20,
    },
    emptyText: {
      fontSize: 13,
      fontFamily: theme.fonts.regular,
      color: colors.textTertiary,
    },
    viewAllBtn: {
      marginTop: 24,
      marginHorizontal: 16,
      alignItems: "center",
      paddingVertical: 14,
      borderRadius: 12,
      backgroundColor: colors.backgroundSecondary,
    },
    viewAllText: {
      fontSize: 14,
      fontFamily: theme.fonts.bold,
      color: colors.accent,
    },
  });
