// src/features/session/components/ExpandableCalendar.tsx
import { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  LayoutAnimation,
  Platform,
  UIManager,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "@/lib/theme";
import { useThemeColors } from "@/lib/useThemeColors";
import {
  format,
  startOfWeek,
  startOfMonth,
  endOfMonth,
  differenceInCalendarWeeks,
  addDays,
  addMonths,
  subMonths,
  isSameDay,
  isSameMonth,
  isToday as isTodayFn,
} from "date-fns";

import { usePlanStore, toDateString } from "../../../store/usePlanStore";
import useLogsStore from "../../../store/useLogsStore";
import { CalendarDayRing } from "../../../../modules/climmate-activity-ring/src";
import { foldActiveSessionMinutes } from "../../dailysummary/foldActiveSession";
import { TIME_ON_WALL_GOAL_MIN } from "../../dailysummary/useDailyData";
import { computeSessionStats } from "../../../services/sessionStats";
import { localDateString } from "../../../lib/localDate";

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface ExpandableCalendarProps {
  onDateSelect?: (date: Date) => void;
  /** Called when user collapses calendar back to week strip */
  onCollapse?: () => void;
  /** The date string (yyyy-MM-dd) actively selected by the parent, or null for month view */
  activeDate?: string | null;
  /** When true, the calendar is always in month view with no expand/collapse toggle. */
  alwaysExpanded?: boolean;
}

/** Parse duration string like "2h 30m" or "45m" to minutes */
function parseDurationToMin(dur: string): number {
  let total = 0;
  const hMatch = dur.match(/(\d+)\s*h/i);
  const mMatch = dur.match(/(\d+)\s*m/i);
  if (hMatch) total += parseInt(hMatch[1], 10) * 60;
  if (mMatch) total += parseInt(mMatch[1], 10);
  return total;
}

export default function ExpandableCalendar({
  onDateSelect,
  onCollapse,
  activeDate,
  alwaysExpanded = false,
}: ExpandableCalendarProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [expandedState, setExpanded] = useState(alwaysExpanded);
  const expanded = alwaysExpanded || expandedState;
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMonth, setViewMonth] = useState(new Date());

  const { monthMap, buildMonthMap } = usePlanStore();
  const sessions = useLogsStore((s) => s.sessions);
  // B2-FU: subscribe to active session so today's cell can fold in live
  // duration + catalog sends without waiting for endSession.
  const activeSession = useLogsStore((s) => s.activeSession);

  // 1s tick — only when an active+unpaused session exists. Drives the today
  // cell's duration ring + refetches active sessionList for live send count.
  // Same pattern as useDailyData (see features/dailysummary/useDailyData).
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!activeSession || activeSession.pausedAt) return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [activeSession]);

  // Live send count for today from the active session's storage buckets
  // (boulder + lead). Refetched on tick and on session start/pause/resume.
  const [activeSends, setActiveSends] = useState(0);
  useEffect(() => {
    if (!activeSession) {
      setActiveSends(0);
      return;
    }
    let cancelled = false;
    const sessionKey = String(activeSession.startTime);
    (async () => {
      const [boulder, lead] = await Promise.all([
        computeSessionStats(sessionKey, "boulder"),
        computeSessionStats(sessionKey, "lead"),
      ]);
      if (cancelled) return;
      setActiveSends(boulder.sends + lead.sends);
    })();
    return () => {
      cancelled = true;
    };
  }, [activeSession, tick]);

  // ── Color palette for CalendarDayRing native view (Window AU). The native
  // module is intentionally theme-unaware: it just renders whichever colors
  // we hand it. We compute the palette once per render (cheap — useThemeColors
  // is referentially stable) and spread it into every cell.
  const dayRingColors = useMemo(() => {
    const isDark = colors.background === "#000000";
    return {
      outerBaseColor: "#A08060",
      outerCompletedColor: "#8B6914",
      innerBaseColor: colors.accent,
      innerCompletedColor: "#265858",
      ringTrackColor: isDark ? "#38383A" : "#E5E7EB",
      selectedBg: colors.accent,
      dayTextColor: isDark ? "#E5E7EB" : "#374151",
      selectedTextColor: "#FFFFFF",
      inactiveTextColor: isDark ? "#48484A" : "#9CA3AF",
      outsideTextColor: isDark ? "#38383A" : "#D1D5DB",
      planDotColorComplete: "#A08060",
      planDotColorInProgress: colors.accent,
      todayDotColor: colors.accent,
    } as const;
  }, [colors]);

  // Build dayStats: completed sessions + (today only) folded active-session
  // duration + live catalog sends. B2-FU: data source now matches daily-summary's
  // big ring so the two never drift while a session is in progress.
  const dayStats = useMemo(() => {
    const map: Record<string, { durationMin: number; sends: number }> = {};
    for (const s of sessions) {
      const prev = map[s.date] || { durationMin: 0, sends: 0 };
      prev.durationMin += parseDurationToMin(s.duration);
      prev.sends += s.sends || 0;
      map[s.date] = prev;
    }
    // Fold active session into today's bucket. `liveMin` is computed from
    // Date.now() each render — the 1s tick above triggers re-renders so
    // the duration ring advances live; activeSends covers catalog sends.
    if (activeSession) {
      const today = localDateString();
      const { liveMin, isToday } = foldActiveSessionMinutes(activeSession, today, today);
      if (isToday) {
        const prev = map[today] || { durationMin: 0, sends: 0 };
        map[today] = {
          durationMin: prev.durationMin + liveMin,
          sends: prev.sends + activeSends,
        };
      }
    }
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessions, activeSession, activeSends, tick]);

  useEffect(() => {
    if (expanded) {
      buildMonthMap(viewMonth);
    } else {
      buildMonthMap(selectedDate);
    }
  }, [selectedDate, viewMonth, expanded, buildMonthMap]);

  const toggleExpand = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    if (expanded) {
      // Collapsing → reset to today's week
      setSelectedDate(new Date());
      setViewMonth(new Date());
      onCollapse?.();
    } else {
      // Expanding → set viewMonth to selectedDate's month
      setViewMonth(selectedDate);
    }
    setExpanded(!expanded);
  };

  const handleDateSelect = useCallback(
    (date: Date) => {
      if (isTodayFn(date)) {
        // Tapping today — reset week view to today
        setSelectedDate(new Date());
      } else if (isSameDay(date, selectedDate)) {
        // Same non-today date tapped again — reset to today
        setSelectedDate(new Date());
      } else {
        setSelectedDate(date);
      }
      onDateSelect?.(date);
    },
    [onDateSelect, selectedDate]
  );

  const navigateMonth = useCallback(
    (direction: 1 | -1) => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setViewMonth((m) =>
        direction === 1 ? addMonths(m, 1) : subMonths(m, 1)
      );
    },
    []
  );

  // Compute days array — only the weeks that actually contain the current
  // month so we never render an entirely-next-month bottom row. Leading/
  // trailing cells from adjacent months are rendered as empty spacers.
  const days = useMemo(() => {
    if (expanded) {
      const monthStart = startOfMonth(viewMonth);
      const monthEnd = endOfMonth(viewMonth);
      const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
      const weeks =
        differenceInCalendarWeeks(monthEnd, monthStart, { weekStartsOn: 1 }) + 1;
      return Array.from({ length: weeks * 7 }).map((_, i) => addDays(calStart, i));
    }
    const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
    return Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i));
  }, [expanded, viewMonth, selectedDate]);

  return (
    <View style={[styles.container, alwaysExpanded && styles.containerTight]}>
      <View style={styles.grid}>
        {/* Month navigation header (expanded only) */}
        {expanded && (
          <View style={styles.monthNav}>
            <TouchableOpacity
              onPress={() => navigateMonth(-1)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="chevron-back" size={20} color={colors.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.monthLabel}>
              {format(viewMonth, "MMMM yyyy")}
            </Text>
            <TouchableOpacity
              onPress={() => navigateMonth(1)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="chevron-forward" size={20} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>
        )}

        {/* Weekday headers */}
        <View style={styles.row}>
          {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
            <Text key={i} style={styles.weekLabel}>
              {d}
            </Text>
          ))}
        </View>

        {/* Date cells */}
        <View style={styles.datesContainer}>
          {days.map((date, i) => {
            const isCurrentMonth = expanded
              ? isSameMonth(date, viewMonth)
              : true;

            // Expanded mode: drop any cell from the previous/next month so
            // users only see the current month's numerals. A blank spacer
            // keeps the 7-column grid intact.
            if (expanded && !isCurrentMonth) {
              return <View key={i} style={styles.emptyCell} />;
            }

            const dateStr = toDateString(date);
            const planProgress = monthMap[dateStr] || 0;
            const stats = dayStats[dateStr];

            return (
              <View key={i} style={styles.cellWrap}>
                <CalendarDayRing
                  dayLabel={format(date, "d")}
                  durationMin={stats?.durationMin ?? 0}
                  durationGoal={TIME_ON_WALL_GOAL_MIN}
                  sendCount={stats?.sends ?? 0}
                  planProgress={planProgress}
                  isSelected={activeDate != null && activeDate === dateStr}
                  isToday={isTodayFn(date)}
                  isCurrentMonth={isCurrentMonth}
                  onPress={() => handleDateSelect(date)}
                  {...dayRingColors}
                />
              </View>
            );
          })}
        </View>
      </View>

      {/* Footer with expand toggle (hidden in alwaysExpanded mode) */}
      {!alwaysExpanded && (
        <View style={styles.footer}>
          <TouchableOpacity onPress={toggleExpand} style={styles.expandBtn}>
            <Ionicons
              name={expanded ? "chevron-up" : "chevron-down"}
              size={20}
              color={colors.textTertiary}
            />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const createStyles = (colors: ReturnType<typeof useThemeColors>) => StyleSheet.create({
  container: {
    backgroundColor: colors.backgroundSecondary,
    margin: theme.spacing.screenPadding,
    borderRadius: theme.borderRadius.card,
    padding: theme.spacing.cardPadding,
  },
  /** Tighter margin when the calendar is a persistent month-view block
   *  under a collapsible large title (Activity tab's Sessions / Training).
   *  Horizontal margin matches iOS native large-title leading (16pt) so
   *  the card aligns with the title and subtitle above. */
  containerTight: {
    marginTop: 2,
    marginBottom: 8,
    marginHorizontal: 16,
  },
  grid: { gap: 8 },
  monthNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingBottom: 4,
  },
  monthLabel: {
    fontSize: 16,
    fontWeight: "700",
    fontFamily: theme.fonts.bold,
    color: colors.textPrimary,
  },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  weekLabel: {
    width: "14%" as any,
    textAlign: "center",
    fontSize: 12,
    fontFamily: theme.fonts.medium,
    color: colors.textTertiary,
    fontWeight: "600",
  },
  datesContainer: { flexDirection: "row", flexWrap: "wrap" },
  /** Wrapper that gives each native CalendarDayRing the 14% column width.
   *  The native view itself is fixed-size (50pt); the wrapper centers it
   *  within the column. */
  cellWrap: { width: "14%" as any, alignItems: "center", marginBottom: 1 },
  /** Empty grid cell matching CalendarDayRing width so leading/trailing
   *  out-of-month days stay invisible without breaking the 7-column layout. */
  emptyCell: { width: "14%" },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
    paddingTop: 2,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  expandBtn: { padding: 2 },
});
