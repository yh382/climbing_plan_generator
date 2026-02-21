import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";

export type AscentLogItem = {
  date: string | number | Date; // e.g. ISO string
  gymName: string;
  sends: number;
  maxGrade: string; // e.g. "V5" or "5.12a"
  // 可选：你需要的话还能加更多字段
};

export default function WeeklyAscentsList({
  selectedMonth,
  logs,
}: {
  selectedMonth: Date;
  logs: AscentLogItem[];
}) {
  const now = new Date();

  const sections = useMemo(() => {
    const monthStart = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1);
    const monthEnd = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0); // last day of month

    // 只渲染到 “今天” 为止（如果选择的是未来月份，那就是 0 条）
    const renderUntil = new Date(
      Math.min(endOfDay(monthEnd).getTime(), endOfDay(now).getTime())
    );

    if (renderUntil.getTime() < monthStart.getTime()) return [];

    // 本月周段：从包含 monthStart 的周日开始，一段一段到 renderUntil
    const firstWeekStart = startOfWeekSunday(monthStart);

    const weeks: { start: Date; end: Date }[] = [];
    let cursor = firstWeekStart;

    while (cursor.getTime() <= renderUntil.getTime()) {
      const weekStart = cursor;
      const weekEnd = addDays(weekStart, 6);

      // “跨月尾巴归到本月”：weekStart 可能在上个月，但只要这段与本月有交集就算本月内容
      const overlapsThisMonth =
        weekEnd.getTime() >= monthStart.getTime() && weekStart.getTime() <= monthEnd.getTime();

      if (overlapsThisMonth) {
        // 不渲染未来周：weekStart > renderUntil 就 break
        if (weekStart.getTime() > renderUntil.getTime()) break;

        // end 需要截断到 renderUntil（比如今天是周中）
        const clippedEnd = new Date(Math.min(endOfDay(weekEnd).getTime(), renderUntil.getTime()));
        weeks.push({ start: weekStart, end: clippedEnd });
      }

      cursor = addDays(cursor, 7);
    }

    // 把 logs 归到每周（按 log.date）
    const parsedLogs = logs
      .map((l) => ({ ...l, _d: new Date(l.date) }))
      .filter((l) => !isNaN(l._d.getTime()));

    return weeks.map((w) => {
      const weekLogs = parsedLogs.filter(
        (l) => l._d.getTime() >= startOfDay(w.start).getTime() && l._d.getTime() <= endOfDay(w.end).getTime()
      );

      // 你描述的是“一周为单位显示这一周log的次数 + 每条内容显示 gym + sends + grade + 日期”
      // 我这里做：每个 log 一行卡片；标题显示 week range + 本周次数
      return {
        title: `${formatRangeTitle(w.start, w.end)}`,
        count: weekLogs.length,
        items: weekLogs
          .sort((a, b) => b._d.getTime() - a._d.getTime())
          .map((l) => ({
            gymName: l.gymName,
            sends: l.sends,
            maxGrade: l.maxGrade,
            dateLabel: formatDayLabel(l._d),
          })),
      };
    });
  }, [selectedMonth, logs]);

  if (!sections.length) {
    return (
      <View style={s.emptyWrap}>
        <Text style={s.emptyTitle}>No logs yet</Text>
        <Text style={s.emptySub}>This month doesn’t have any ascents to show.</Text>
      </View>
    );
  }

  return (
    <View style={s.wrap}>
      {sections.map((sec) => (
        <View key={sec.title} style={s.section}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>{sec.title}</Text>
            <Text style={s.sectionCount}>{sec.count}</Text>
          </View>

          {sec.items.length ? (
            sec.items.map((it, idx) => (
              <View key={`${it.gymName}-${it.dateLabel}-${idx}`} style={s.row}>
                <Text style={s.gym}>{it.gymName}</Text>
                <Text style={s.meta}>
                  sended: {it.sends}   grade: {it.maxGrade}   {it.dateLabel}
                </Text>
              </View>
            ))
          ) : (
            <View style={s.row}>
              <Text style={s.meta}>No ascents in this week.</Text>
            </View>
          )}
        </View>
      ))}
    </View>
  );
}

/** ---------- date utils (no extra deps) ---------- */

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}
function endOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}
function addDays(d: Date, n: number) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

// Week starts on Sunday
function startOfWeekSunday(d: Date) {
  const day = d.getDay(); // 0=Sun
  return addDays(new Date(d.getFullYear(), d.getMonth(), d.getDate()), -day);
}

function formatRangeTitle(a: Date, b: Date) {
  // "Jan 4 - Jan 10" / "Dec 28 - Jan 3"
  const aM = a.toLocaleString("en-US", { month: "short" });
  const bM = b.toLocaleString("en-US", { month: "short" });
  const aD = a.getDate();
  const bD = b.getDate();
  return `${aM} ${aD} - ${bM} ${bD}`;
}

function formatDayLabel(d: Date) {
  // "Jan 10"
  const m = d.toLocaleString("en-US", { month: "short" });
  return `${m} ${d.getDate()}`;
}

const s = StyleSheet.create({
  wrap: {
    marginTop: 12,
  },

  section: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E9E9E9",
    padding: 12,
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#333",
  },
  sectionCount: {
    fontSize: 12,
    fontWeight: "700",
    color: "#777",
    backgroundColor: "#F2F2F2",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },

  row: {
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#F1F1F1",
  },
  gym: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111",
    marginBottom: 4,
  },
  meta: {
    fontSize: 12,
    color: "#8A8A8A",
    fontWeight: "600",
  },

  emptyWrap: {
    marginTop: 12,
    paddingVertical: 18,
    paddingHorizontal: 12,
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E9E9E9",
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#111",
    marginBottom: 4,
  },
  emptySub: {
    fontSize: 12,
    color: "#777",
    fontWeight: "600",
  },
});
