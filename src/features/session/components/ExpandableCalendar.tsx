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
  addDays,
  addMonths,
  subMonths,
  isSameDay,
  isSameMonth,
  isToday as isTodayFn,
} from "date-fns";

import { usePlanStore, toDateString } from "../../../store/usePlanStore";
import useLogsStore from "../../../store/useLogsStore";
import CalendarDayRing from "./CalendarDayRing";

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface ExpandableCalendarProps {
  onDateSelect?: (date: Date) => void;
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
}: ExpandableCalendarProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [expanded, setExpanded] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMonth, setViewMonth] = useState(new Date());

  const { monthMap, buildMonthMap } = usePlanStore();
  const sessions = useLogsStore((s) => s.sessions);
  const logs = useLogsStore((s) => s.logs);

  // Build dayStats: duration from sessions, sends from logs (stays in sync with actual items)
  const dayStats = useMemo(() => {
    const map: Record<string, { durationMin: number; sends: number }> = {};
    for (const s of sessions) {
      const prev = map[s.date] || { durationMin: 0, sends: 0 };
      prev.durationMin += parseDurationToMin(s.duration);
      map[s.date] = prev;
    }
    for (const l of logs) {
      const prev = map[l.date] || { durationMin: 0, sends: 0 };
      prev.sends += l.count;
      map[l.date] = prev;
    }
    return map;
  }, [sessions, logs]);

  useEffect(() => {
    if (expanded) {
      buildMonthMap(viewMonth);
    } else {
      buildMonthMap(selectedDate);
    }
  }, [selectedDate, viewMonth, expanded, buildMonthMap]);

  const toggleExpand = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(!expanded);
    if (!expanded) {
      // When expanding, set viewMonth to selectedDate's month
      setViewMonth(selectedDate);
    }
  };

  const handleDateSelect = useCallback(
    (date: Date) => {
      if (isSameDay(date, selectedDate)) {
        // Same date tapped again — reset calendar to today
        setSelectedDate(new Date());
      } else {
        setSelectedDate(date);
      }
      // Always pass tapped date to parent for its toggle logic
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

  // Compute days array
  const days = useMemo(() => {
    if (expanded) {
      const monthStart = startOfMonth(viewMonth);
      const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
      return Array.from({ length: 42 }).map((_, i) => addDays(calStart, i));
    }
    const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
    return Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i));
  }, [expanded, viewMonth, selectedDate]);

  return (
    <View style={styles.container}>
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
            const dateStr = toDateString(date);
            const planProgress = monthMap[dateStr] || 0;
            const stats = dayStats[dateStr];
            const isCurrentMonth = expanded
              ? isSameMonth(date, viewMonth)
              : true;

            return (
              <CalendarDayRing
                key={i}
                dayLabel={format(date, "d")}
                durationMin={stats?.durationMin ?? 0}
                sendCount={stats?.sends ?? 0}
                planProgress={planProgress}
                isSelected={isSameDay(date, selectedDate)}
                isToday={isTodayFn(date)}
                isCurrentMonth={isCurrentMonth}
                onPress={() => handleDateSelect(date)}
              />
            );
          })}
        </View>
      </View>

      {/* Footer with expand toggle */}
      <View style={styles.footer}>
        <TouchableOpacity onPress={toggleExpand} style={styles.expandBtn}>
          <Ionicons
            name={expanded ? "chevron-up" : "chevron-down"}
            size={20}
            color={colors.textTertiary}
          />
        </TouchableOpacity>
      </View>
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
