// app/(tabs)/calendar.tsx
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { AppState, FlatList, SafeAreaView, Text, TextInput, TouchableOpacity, View } from "react-native";

// ✅ 从 SettingsContext 获取语言（zh/en）
import { I18N, useI18N } from "../lib/i18n";

type PlanItem = { label: I18N; target: I18N };
type PlanDay = { title: I18N; items: PlanItem[] };
type WeekDaysKey = "Sun" | "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat";
type Plan = {
  meta?: {
    cycle_weeks?: number;
    freq_per_week?: number;
    start_date?: string;
    progression?: number[];
    source?: string;
    refined?: boolean;
  };
  days: Record<WeekDaysKey, PlanDay>;
  weeks?: Array<{ week: number; days: Record<WeekDaysKey, PlanDay> }>;
  notes?: I18N[];
};

const weekdayKey: WeekDaysKey[] = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const weekdayCN = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
const weekdayEN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const PROGRESS_KEY_PREFIX = "@progress_"; // 勾选完成度（布尔数组）
const NOTES_KEY = "@daily_notes"; // 各日期备注 { [date]: string }

function pad(n: number) {
  return n < 10 ? `0${n}` : `${n}`;
}
function toDateString(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function parseISO(s?: string) {
  if (!s) return null;
  const [y, m, dd] = s.split("-");
  const d = new Date(Number(y), Number(m) - 1, Number(dd));
  return isNaN(d.getTime()) ? null : d;
}
function diffInWeeks(start: Date, target: Date) {
  const ms = 1000 * 60 * 60 * 24;
  const diffDays = Math.floor((target.getTime() - start.getTime()) / ms);
  return Math.floor(diffDays / 7);
}

export default function CalendarTab() {
  // ✅ 语言（一定要第一位 Hook）
  const { tt, tr, isZH } = useI18N();

  const [plan, setPlan] = useState<Plan | null>(null);
  const [selected, setSelected] = useState<string>(() => toDateString(new Date()));
  const [progress, setProgress] = useState<boolean[]>([]);

  // 备注数据：整库 + 当前日期文本
  const [notesMap, setNotesMap] = useState<Record<string, string>>({});
  const [note, setNote] = useState<string>("");

  const loadPlan = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem("@plan_json");
      setPlan(raw ? (JSON.parse(raw) as Plan) : null);
    } catch {
      setPlan(null);
    }
  }, []);

  const loadNotesMap = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(NOTES_KEY);
      const m = raw ? (JSON.parse(raw) as Record<string, string>) : {};
      setNotesMap(m);
      // 同步当前选中日期
      setNote(m[selected] || "");
    } catch {
      setNotesMap({});
      setNote("");
    }
  }, [selected]);

  useEffect(() => {
    loadPlan();
  }, [loadPlan]);
  useEffect(() => {
    loadNotesMap();
  }, [loadNotesMap]);
  useFocusEffect(
    useCallback(() => {
      loadPlan();
      loadNotesMap();
    }, [loadPlan, loadNotesMap])
  );

  // 当前选中日期的数据
  const dayData = useMemo(() => {
    if (!plan) return null;
    const date = parseISO(selected) ?? new Date();
    const wd = weekdayKey[date.getDay()];
    let dayObj: PlanDay | undefined;

    if (plan.weeks && plan.weeks.length && plan.meta?.start_date) {
      const start = parseISO(plan.meta.start_date)!;
      const wIdx = diffInWeeks(start, date);
      if (wIdx >= 0 && wIdx < plan.weeks.length) {
        dayObj = plan.weeks[wIdx]?.days?.[wd];
      }
    }
    if (!dayObj) dayObj = plan.days?.[wd];
    return dayObj ? { wd, ...dayObj } : null;
  }, [plan, selected]);

  // 勾选完成度：读/写
  const loadProgressForDate = useCallback(async (dateStr: string, count: number) => {
    try {
      const raw = await AsyncStorage.getItem(PROGRESS_KEY_PREFIX + dateStr);
      let arr: boolean[] = [];
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) arr = parsed.map((v) => !!v);
        } catch {}
      }
      if (arr.length < count) arr = [...arr, ...Array(count - arr.length).fill(false)];
      if (arr.length > count) arr = arr.slice(0, count);
      setProgress(arr);
    } catch {
      setProgress(Array(count).fill(false));
    }
  }, []);

  const saveProgressForDate = useCallback(async (dateStr: string, arr: boolean[]) => {
    try {
      await AsyncStorage.setItem(PROGRESS_KEY_PREFIX + dateStr, JSON.stringify(arr));
    } catch {}
  }, []);

  useEffect(() => {
    const count = dayData?.items?.length || 0;
    if (count > 0) loadProgressForDate(selected, count);
    else setProgress([]);
  }, [selected, dayData?.items, loadProgressForDate]);

  // 自动跨天对齐
  useEffect(() => {
    let last = toDateString(new Date());
    const id = setInterval(() => {
      const nowStr = toDateString(new Date());
      if (nowStr !== last) {
        last = nowStr;
        setSelected(nowStr);
        loadPlan();
        loadNotesMap();
      }
    }, 60 * 1000);
    return () => clearInterval(id);
  }, [loadPlan, loadNotesMap]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") {
        const nowStr = toDateString(new Date());
        if (nowStr !== selected) {
          setSelected(nowStr);
          loadPlan();
          loadNotesMap();
        }
      }
    });
    return () => sub.remove();
  }, [selected, loadPlan, loadNotesMap]);

  // 勾选
  const toggleProgress = useCallback(
    (idx: number) => {
      setProgress((prev) => {
        const next = [...prev];
        next[idx] = !next[idx];
        saveProgressForDate(selected, next);
        return next;
      });
    },
    [saveProgressForDate, selected]
  );

  // 完成度
  const dayCompletion = useMemo(() => {
    if (!dayData?.items?.length) return 0;
    const done = progress.slice(0, dayData.items.length).filter(Boolean).length;
    return Math.round((done / dayData.items.length) * 100);
  }, [dayData?.items, progress]);

  // 顶部简单日期导航
  const weekIndex = useMemo(() => {
    if (!plan?.meta?.start_date) return null;
    const start = parseISO(plan.meta.start_date)!;
    const cur = parseISO(selected) ?? new Date();
    return diffInWeeks(start, cur) + 1;
  }, [plan?.meta?.start_date, selected]);

  const shiftDay = (delta: number) => {
    const cur = parseISO(selected) ?? new Date();
    const next = new Date(cur);
    next.setDate(cur.getDate() + delta);
    const s = toDateString(next);
    setSelected(s);
    // 切日同步备注
    setNote(notesMap[s] || "");
  };

  // ✅ 顶部标题：中英文星期 + 周序号
  const selectedDateObj = parseISO(selected) ?? new Date();
  const weekdayDisplay = isZH ? weekdayCN : weekdayEN;
  const headerTitle = isZH
    ? `${selected}（${weekdayDisplay[selectedDateObj.getDay()]}）${weekIndex ? ` · 第 ${weekIndex} 周` : ""}`
    : `${selected} (${weekdayDisplay[selectedDateObj.getDay()]})${weekIndex ? ` · Week ${weekIndex}` : ""}`;

  // 备注保存（轻量防抖）
  useEffect(() => {
    const t = setTimeout(() => {
      setNotesMap((prev) => {
        const next = { ...prev, [selected]: note };
        AsyncStorage.setItem(NOTES_KEY, JSON.stringify(next)).catch(() => {});
        return next;
      });
    }, 400);
    return () => clearTimeout(t);
  }, [note, selected]);

  const renderItem = ({ item, index }: { item: PlanItem; index: number }) => {
    const done = progress[index] ?? false;
    return (
      <View
        style={{
          paddingVertical: 12,
          paddingHorizontal: 16,
          borderBottomWidth: 1,
          borderColor: "#eee",
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
        }}
      >
        {/* 勾选圆圈 */}
        <TouchableOpacity
          onPress={() => toggleProgress(index)}
          activeOpacity={0.8}
          style={{
            width: 24,
            height: 24,
            borderRadius: 12,
            borderWidth: 2,
            borderColor: done ? "#16a34a" : "#d1d5db",
            backgroundColor: done ? "#16a34a" : "white",
          }}
        />
        {/* 文案（注意用 tt() 取当前语言） */}
        <View style={{ flex: 1 }}>
          <Text style={{ fontWeight: "600", marginBottom: 4, color: done ? "#16a34a" : "#111827" }}>
            {tt(item.label)}
          </Text>
          <Text style={{ color: "#374151" }}>{tt(item.target)}</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      {/* 顶部简化：左右切换日期 */}
      <View
        style={{
          paddingHorizontal: 12,
          paddingVertical: 10,
          borderBottomWidth: 1,
          borderColor: "#eee",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <TouchableOpacity onPress={() => shiftDay(-1)} style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: "#f3f4f6" }}>
          <Text style={{ fontSize: 16 }}>‹</Text>
        </TouchableOpacity>
        <Text style={{ fontSize: 16, fontWeight: "700" }}>{headerTitle}</Text>
        <TouchableOpacity onPress={() => shiftDay(1)} style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: "#f3f4f6" }}>
          <Text style={{ fontSize: 16 }}>›</Text>
        </TouchableOpacity>
      </View>

      {/* 完成度 + 进度条 */}
      <View style={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 6 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <Text style={{ fontWeight: "700" }}>
            {dayData?.title ? tt(dayData.title) : tr("无训练项目", "No workouts")}
          </Text>
          <Text style={{ color: "#4f46e5", fontWeight: "700" }}>
            {dayData?.items?.length ? tr(`完成度 ${dayCompletion}%`, `Completion ${dayCompletion}%`) : ""}
          </Text>
        </View>
        {dayData?.items?.length ? (
          <View style={{ height: 10, backgroundColor: "#e5e7eb", borderRadius: 999, overflow: "hidden" }}>
            <View style={{ height: "100%", width: `${dayCompletion}%`, backgroundColor: "#16a34a" }} />
          </View>
        ) : null}
      </View>

      {/* 训练词条列表 */}
      {dayData?.items && dayData.items.length > 0 ? (
        <FlatList data={dayData.items} renderItem={renderItem} keyExtractor={(it, idx) => `${idx}-${tt(it.label)}`} extraData={progress} />
      ) : (
        <View style={{ padding: 16 }}>
          <Text style={{ color: "#9ca3af" }}>
            {tr("今天没有训练项目（休息日或未安排）。", "No workouts today (rest day or not scheduled).")}
          </Text>
        </View>
      )}

      {/* 今日备注（可编辑，将自动同步到记录中心） */}
      <View style={{ padding: 16, borderTopWidth: 1, borderColor: "#eee" }}>
        <Text style={{ fontWeight: "bold", marginBottom: 6 }}>
          {tr("今日备注（会同步到记录中心）", "Today's Notes (syncs to Journal)")}
        </Text>
        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder={tr("写下今天的训练感受、完成情况、身体反馈、疼痛点等…", "Write today's reflections, completion, body feedback, pain points…")}
          multiline
          textAlignVertical="top"
          style={{ minHeight: 100, borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 10, padding: 12, backgroundColor: "white" }}
        />
      </View>
    </SafeAreaView>
  );
}




