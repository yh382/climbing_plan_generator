import React, { useEffect, useMemo, useState } from "react";
import { View, Text } from "react-native";

import { useClimbsStore, type ClimbItem } from "@/features/profile/store/useClimbsStore";

import AscentsHeaderBar from "../ascentssection/AscentsHeaderBar";
import WeeklyAscentsList, { AscentLogItem } from "../ascentssection/WeeklyAscentsList";

type HeaderViewModel = {
  logStats: {
    maxBoulder: string;
    maxRoute: string;
    maxFlash: string;
    totalLogged: number;
  };
};

export default function AscentsSection({
  user,
  styles,
  ascentType,
  setAscentType,
}: {
  user: HeaderViewModel;
  styles: any;
  ascentType: "bouldering" | "routes";
  setAscentType: (v: "bouldering" | "routes") => void;
}) {
  const climbs = useClimbsStore((s) => s.items);
  const fetchList = useClimbsStore((s) => s.fetchList);

  const [selectedMonth, setSelectedMonth] = useState<Date>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  useEffect(() => {
    const now = new Date();
    const start = startOfMonth(selectedMonth);
    const end = clampToToday(endOfMonth(selectedMonth), now);

    fetchList({
      type: toDiscipline(ascentType),
      from_date: toYMD(start),
      to_date: toYMD(end),
      limit: 300,
    }).catch(() => {});
  }, [selectedMonth, ascentType, fetchList]);

  const monthLabel = useMemo(() => formatMonthLabel(selectedMonth), [selectedMonth]);

  const monthStats = useMemo(() => {
    const computed = computeMonthlyStats(climbs, selectedMonth, ascentType);

    const fallback = {
      totalSends: user.logStats.totalLogged,
      maxGrade: ascentType === "bouldering" ? user.logStats.maxBoulder : user.logStats.maxRoute,
      maxFlash: user.logStats.maxFlash,
    };

    return {
      totalSends: computed.totalSends ?? fallback.totalSends,
      maxGrade: computed.maxGrade ?? fallback.maxGrade,
      maxFlash: computed.maxFlash ?? fallback.maxFlash,
    };
  }, [climbs, selectedMonth, ascentType, user.logStats]);

  const weeklyLogs = useMemo<AscentLogItem[]>(() => {
    return buildDailyLogsFromClimbs(climbs, selectedMonth, ascentType);
  }, [climbs, selectedMonth, ascentType]);

  return (
    <View style={styles.ascentsContainer}>
      <AscentsHeaderBar
        monthLabel={monthLabel}
        selectedMonth={selectedMonth}
        onChangeMonth={setSelectedMonth}
        ascentType={ascentType}
        onChangeAscentType={setAscentType}
      />

      <View style={styles.logStatsRow}>
        <View style={styles.logItem}>
          <Text style={styles.logVal}>{monthStats.totalSends}</Text>
          <Text style={styles.logLabel}>Total Sends</Text>
        </View>

        <View style={styles.logItem}>
          <Text style={styles.logVal}>{monthStats.maxGrade}</Text>
          <Text style={styles.logLabel}>Max Grade</Text>
        </View>

        <View style={styles.logItem}>
          <Text style={styles.logVal}>{monthStats.maxFlash}</Text>
          <Text style={styles.logLabel}>Max Flash</Text>
        </View>
      </View>

      <WeeklyAscentsList selectedMonth={selectedMonth} logs={weeklyLogs} />
    </View>
  );
}

/** ---------------- helpers ---------------- */

function formatMonthLabel(d: Date) {
  const month = d.toLocaleString("en-US", { month: "short" });
  const year = d.getFullYear();
  return `${month} ${year}`;
}

function inSameMonth(d: Date, month: Date) {
  return d.getFullYear() === month.getFullYear() && d.getMonth() === month.getMonth();
}

function toDiscipline(ascentType: "bouldering" | "routes"): "boulder" | "rope" {
  return ascentType === "bouldering" ? "boulder" : "rope";
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}
function clampToToday(end: Date, today: Date) {
  return end.getTime() > today.getTime() ? new Date(today.getFullYear(), today.getMonth(), today.getDate()) : end;
}
function toYMD(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function computeMonthlyStats(items: ClimbItem[], selectedMonth: Date, ascentType: "bouldering" | "routes") {
  const discipline = toDiscipline(ascentType);

  const monthItems = items
    .map((it) => ({ it, d: new Date(it.date) }))
    .filter(({ it, d }) => !isNaN(d.getTime()) && inSameMonth(d, selectedMonth) && it.discipline === discipline);

  if (!monthItems.length) return { totalSends: null as any, maxGrade: null as any, maxFlash: null as any };

  const totalSends = monthItems.reduce((sum, { it }) => sum + (it.sends ?? 0), 0);

  const sent = monthItems.filter(({ it }) => (it.sends ?? 0) > 0);
  const maxGradeItem = (sent.length ? sent : monthItems).reduce((best, cur) =>
    (cur.it.grade_score ?? -Infinity) > (best.it.grade_score ?? -Infinity) ? cur : best
  );
  const maxGrade = maxGradeItem?.it?.grade_value ?? "--";

  const flashed = monthItems.filter(({ it }) => (it.sends ?? 0) > 0 && (it.attempts ?? 0) === 1);
  const maxFlash =
    flashed.length
      ? flashed.reduce((best, cur) =>
          (cur.it.grade_score ?? -Infinity) > (best.it.grade_score ?? -Infinity) ? cur : best
        ).it.grade_value ?? "--"
      : "--";

  return { totalSends, maxGrade, maxFlash };
}

function buildDailyLogsFromClimbs(
  items: (ClimbItem & { gym_name?: string | null })[],
  selectedMonth: Date,
  ascentType: "bouldering" | "routes"
): AscentLogItem[] {
  const discipline = toDiscipline(ascentType);

  const monthItems = items
    .map((it) => ({ it, d: new Date(it.date) }))
    .filter(({ it, d }) => !isNaN(d.getTime()) && inSameMonth(d, selectedMonth) && it.discipline === discipline);

  const map = new Map<string, { date: Date; gymName: string; sends: number; maxGrade: string; maxScore: number }>();

  for (const { it, d } of monthItems) {
    const dayKey = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;

    const gymName =
      it.gym_name?.trim() ||
      it.area?.trim() ||
      (it.gym_id ? `Gym ${String(it.gym_id).slice(0, 4)}` : it.area_id ? `Area ${String(it.area_id).slice(0, 4)}` : "Gym");

    const key = `${dayKey}__${gymName}`;

    const prev = map.get(key);
    const score = it.grade_score ?? -Infinity;

    if (!prev) {
      map.set(key, {
        date: new Date(d.getFullYear(), d.getMonth(), d.getDate()),
        gymName,
        sends: it.sends ?? 0,
        maxGrade: it.grade_value ?? "--",
        maxScore: score,
      });
    } else {
      prev.sends += it.sends ?? 0;
      if (score > prev.maxScore) {
        prev.maxScore = score;
        prev.maxGrade = it.grade_value ?? prev.maxGrade;
      }
    }
  }

  return Array.from(map.values())
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .map((x) => ({ date: x.date, gymName: x.gymName, sends: x.sends, maxGrade: x.maxGrade }));
}
