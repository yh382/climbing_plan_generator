// app/(tabs)/calendar.tsx
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  AppState,
  FlatList,
  SafeAreaView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

// ✅ UI 组件（相对路径，不依赖别名）
import { Card } from "../../components/ui/Card";
import { ProgressBar } from "../../components/ui/ProgressBar";
import { Button } from "../../components/ui/Button";
import { H1, Caption } from "../../components/ui/Text";
import { tokens } from "../../components/ui/Theme";

// ✅ 从 Settings / i18n 获取语言（zh/en）
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
  const doneCount = useMemo(() => {
    if (!dayData?.items?.length) return 0;
    return progress.slice(0, dayData.items.length).filter(Boolean).length;
  }, [dayData?.items, progress]);

  const totalCount = dayData?.items?.length || 0;
  const dayCompletion = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  // 顶部简单日期导航/周序号
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

  // 底部操作
  const completeAll = useCallback(() => {
    if (!totalCount) return;
    const next = Array(totalCount).fill(true);
    setProgress(next);
    saveProgressForDate(selected, next);
  }, [totalCount, saveProgressForDate, selected]);

  const resetToday = useCallback(() => {
    if (!totalCount) return;
    const next = Array(totalCount).fill(false);
    setProgress(next);
    saveProgressForDate(selected, next);
  }, [totalCount, saveProgressForDate, selected]);

  const renderItem = ({ item, index }: { item: PlanItem; index: number }) => {
    const done = progress[index] ?? false;
    return (
      <View
        style={{
          paddingVertical: 12,
          paddingHorizontal: 16,
          borderBottomWidth: 1,
          borderColor: tokens.color.border,
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          backgroundColor: "#fff",
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
            borderColor: done ? tokens.color.success : "#d1d5db",
            backgroundColor: done ? tokens.color.success : "white",
          }}
        />
        {/* 文案（注意用 tt() 取当前语言） */}
        <View style={{ flex: 1 }}>
          <Text style={{ fontWeight: "600", marginBottom: 4, color: done ? tokens.color.success : tokens.color.text }}>
            {tt(item.label)}
          </Text>
          <Text style={{ color: "#374151" }}>{tt(item.target)}</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: tokens.color.bg }}>
      {/* 顶部信息卡：日期 + 完成度 */}
      <Card style={{ marginHorizontal: 16, marginTop: 12, marginBottom: 8 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <H1 style={{ flexShrink: 1, paddingRight: 12 }}>{headerTitle}</H1>
          {/* 左右切日 */}
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Button title={isZH ? "前一天" : "Prev"} variant="ghost" onPress={() => shiftDay(-1)} />
            <Button title={isZH ? "后一天" : "Next"} variant="ghost" onPress={() => shiftDay(1)} />
          </View>
        </View>

        <ProgressBar value={dayCompletion} />
        <Caption style={{ marginTop: 6 }}>
          {isZH
            ? `今日完成度 ${dayCompletion}% · 已完成 ${doneCount}/${totalCount} 项`
            : `Completion ${dayCompletion}% · ${doneCount}/${totalCount} done`}
        </Caption>
      </Card>

      {/* 今日备注 */}
      <Card style={{ marginHorizontal: 16, marginBottom: 8 }}>
        <Caption style={{ marginBottom: 6 }}>
          {isZH ? "今日备注" : "Notes"}
        </Caption>
        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder={isZH ? "输入你的训练感受、状态或临时调整…" : "Write how you feel or any adjustment…"}
          multiline
          style={{
            minHeight: 64,
            padding: 12,
            borderWidth: 1,
            borderColor: tokens.color.border,
            borderRadius: tokens.radius.md,
            backgroundColor: "#fff",
            textAlignVertical: "top",
          }}
        />
      </Card>

      {/* 列表 */}
      <Card style={{ marginHorizontal: 16, marginBottom: 100, padding: 0 /* 让每行自带 padding 生效 */ }}>
        {dayData?.items?.length ? (
          <FlatList
            data={dayData.items}
            renderItem={renderItem}
            keyExtractor={(_, i) => `${selected}_${i}`}
            ItemSeparatorComponent={() => null}
            scrollEnabled={true}
          />
        ) : (
          <View style={{ padding: 16 }}>
            <Text style={{ color: tokens.color.muted }}>
              {isZH ? "今日暂无训练项目" : "No items for today"}
            </Text>
          </View>
        )}
      </Card>

      {/* 底部吸附操作条 */}
      <View
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          paddingBottom: 12,
          paddingTop: 8,
          backgroundColor: "transparent",
        }}
      >
        <Card style={{ marginHorizontal: 16, paddingVertical: 10 }}>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <Button
              title={isZH ? "全部完成" : "Mark all done"}
              onPress={completeAll}
              variant="primary"
              style={{ flex: 1 }}
            />
            <Button
              title={isZH ? "重置今日" : "Reset"}
              onPress={resetToday}
              variant="ghost"
              style={{ flex: 1 }}
            />
          </View>
        </Card>
      </View>
    </SafeAreaView>
  );
}





