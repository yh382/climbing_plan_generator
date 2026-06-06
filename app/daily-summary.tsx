// app/daily-summary.tsx
// Day-scoped summary page: persistent analysis dashboard + active session
// card (if any) + completed session groups + quick logs.
//
// Window AY — accepts an optional `userId` query param. When present and
// not equal to the current user's id, the page enters other-mode: it
// fetches the target user's public daily via `/users/{userId}/daily/{date}`,
// shows a username/avatar header, and disables edit/active-session affordances.

import React, { useCallback, useLayoutEffect, useMemo } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useNavigation } from "@react-navigation/native";
import { format, addDays, subDays, parseISO } from "date-fns";

import { NATIVE_HEADER_LARGE, withHeaderTheme, HEADER_TRANSPARENT } from "@/lib/nativeHeaderOptions";
import { theme } from "@/lib/theme";
import { useThemeColors } from "../src/lib/useThemeColors";
import { useSettings } from "../src/contexts/SettingsContext";
import { HeaderButton } from "../src/components/ui/HeaderButton";
import { Avatar } from "../src/components/ui/Avatar";

import { useDailyData } from "../src/features/dailysummary/useDailyData";
import { localDateString } from "../src/lib/localDate";
import DailyDashboardCarousel from "../src/features/dailysummary/DailyDashboardCarousel";
import DailyDateNavBar from "../src/features/dailysummary/DailyDateNavBar";
import ActiveSessionCard from "../src/features/dailysummary/ActiveSessionCard";
import SessionGroupHeader from "../src/features/dailysummary/SessionGroupHeader";
import useSettingsStore from "../src/store/useSettingsStore";
import { useUserStore } from "../src/store/useUserStore";
import ClimbItemCard from "../src/components/shared/ClimbItemCard";
function resolveDateParam(raw: string | string[] | undefined): string {
  const v = Array.isArray(raw) ? raw[0] : raw;
  if (!v || v === "today") return localDateString();
  // Expect YYYY-MM-DD; fall back to today on invalid input.
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  return localDateString();
}

function resolveStringParam(raw: string | string[] | undefined): string | undefined {
  const v = Array.isArray(raw) ? raw[0] : raw;
  return v && v.length > 0 ? v : undefined;
}

export default function DailySummaryScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const params = useLocalSearchParams<{ date?: string; userId?: string }>();
  const colors = useThemeColors();
  const { tr } = useSettings();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const date = resolveDateParam(params.date);
  const userIdParam = resolveStringParam(params.userId);
  const currentUserId = useUserStore((s) => s.user?.id);
  const isSelf = !userIdParam || userIdParam === currentUserId;

  const data = useDailyData(date, userIdParam);

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
      headerTransparent: HEADER_TRANSPARENT,
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
      <View>
        {!isSelf && data.meta && (
          <View style={styles.userHeader}>
            <Avatar
              uri={data.meta.avatarUrl}
              fallbackName={data.meta.username}
              size={32}
            />
            <Text style={styles.username}>{data.meta.username}</Text>
          </View>
        )}
        <DailyDateNavBar
          date={date}
          onPrev={() => navigateDays(-1)}
          onNext={() => navigateDays(1)}
        />
      </View>
      <DailyDashboardCarousel data={data} />

      {/* B2 #3: active session is folded into data.sessions as an in-progress
          group with `inProgress`-styled header. ActiveSessionCard (timer +
          END SESSION button) is rendered inside that group between the
          header and the items, replacing the previous top-of-page card so
          users still have a tappable end-session affordance. */}

      {data.sessions.map((group, idx) => {
        // The virtual in-progress entry uses id "active_<startMs>" — see
        // useLocalDailyData. Detect it to flip header styling + render the
        // active card inline.
        const isInProgress = group.session.id.startsWith("active_");
        return (
        <View key={group.session.id}>
          <SessionGroupHeader
            index={idx + 1}
            startTime={group.session.startTime}
            endTime={group.session.endTime}
            duration={group.session.duration}
            inProgress={isInProgress}
          />
          {isInProgress && isSelf && data.activeSession && (
            <ActiveSessionCard
              startTime={data.activeSession.startTime}
              gymName={data.activeSession.gymName}
              pausedAt={data.activeSession.pausedAt ?? null}
            />
          )}
          {group.aggregatedItems.length > 0 ? (
            group.aggregatedItems.map((agg) => (
              <ClimbItemCard
                key={agg.routeKey}
                item={agg}
                readOnly={!isSelf}
                onPress={() => {
                  // INDOOR_A: catalog-bound logs jump to their detail page;
                  // free-form logs keep the legacy /library/route-detail
                  // path, using `latestId` as the row id.
                  if (agg.outdoor_route_id) {
                    router.push({
                      pathname: "/outdoor/outdoor-route-detail",
                      params: { id: agg.outdoor_route_id },
                    });
                    return;
                  }
                  if (agg.gym_route_id) {
                    router.push({
                      pathname: "/gym/route/[routeId]",
                      params: { routeId: agg.gym_route_id },
                    });
                    return;
                  }
                  router.push({
                    pathname: "/library/route-detail",
                    params: { date, itemId: agg.latestId, type: agg.type },
                  });
                }}
              />
            ))
          ) : (
            <Text style={styles.placeholder}>{tr("本次 session 暂无记录", "No climbs in this session")}</Text>
          )}
        </View>
      );
      })}

      {data.aggregatedQuickLogs.length > 0 && (
        <View>
          <View style={styles.quickLogsHeader}>
            <View style={styles.rule} />
            <Text style={styles.quickLogsLabel}>{tr("快速记录", "Quick Logs")}</Text>
            <View style={styles.rule} />
          </View>
          {data.aggregatedQuickLogs.map((agg) => (
            <ClimbItemCard
              key={agg.routeKey}
              item={agg}
              readOnly={!isSelf}
              onPress={() => {
                if (agg.outdoor_route_id) {
                  router.push({
                    pathname: "/outdoor/outdoor-route-detail",
                    params: { id: agg.outdoor_route_id },
                  });
                  return;
                }
                if (agg.gym_route_id) {
                  router.push({
                    pathname: "/gym/route/[routeId]",
                    params: { routeId: agg.gym_route_id },
                  });
                  return;
                }
                router.push({
                  pathname: "/library/route-detail",
                  params: { date, itemId: agg.latestId, type: agg.type },
                });
              }}
            />
          ))}
        </View>
      )}

      {!hasAnyContent && (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyText}>
            {isSelf
              ? tr("这一天没有记录", "Nothing logged on this day")
              : tr(
                  `${data.meta?.username ?? "该用户"} 当日无公开记录`,
                  `${data.meta?.username ?? "This user"} has no public activity on this day`
                )}
          </Text>
        </View>
      )}

      {isSelf && (
        <TouchableOpacity
          style={styles.viewAllBtn}
          activeOpacity={0.85}
          onPress={() => {
            // TR7 — Analysis lives at the full-screen route now.
            router.push("/analysis" as any);
          }}
        >
          <Text style={styles.viewAllText}>{tr("查看完整分析 →", "View full analysis →")}</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const createStyles = (colors: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    userHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 4,
      backgroundColor: colors.background,
    },
    username: {
      fontSize: 15,
      fontFamily: theme.fonts.medium,
      color: colors.textPrimary,
    },
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
