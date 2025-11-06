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
import { I18N, useI18N } from "../../lib/i18n";
import CollapsibleCalendarOverlay from "../../components/CollapsibleCalendarOverlay";
import useLogsStore from "../store/useLogsStore";
// 顶部 import 区域加入
import { useColorScheme } from "react-native";
import TopBar from "../../components/TopBar";
import { useLayoutEffect } from "react";
import { useNavigation } from "@react-navigation/native";
import DualMiniRings from "../../components/DualMiniRings";
import { usePlanStore, toDateString } from "../store/usePlanStore"; // ← 路径按你的实际层级改



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
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const { monthMap, buildMonthMap, toggleProgressAt, setProgressAt } = usePlanStore();
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

  // 读取全局 store 的两个选择器
  const countByDateType = useLogsStore((s) => s.countByDateType);
  const scheme = useColorScheme();
  const pageBg = scheme === "dark" ? "#0B1220" : "#FFFFFF";
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
        // ✅ 让全局 monthMap 即时刷新“当日外环”
        const selectedDateObj = parseISO(selected) ?? new Date();
        toggleProgressAt(selectedDateObj, idx);
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
    const dayKey = toDateString(selectedDateObj);
    const climbCount = React.useMemo(
    () => countByDateType(dayKey, "boulder") + countByDateType(dayKey, "yds"),
    [dayKey, countByDateType]
  );
    // ✅ 仅月日 + 星期（不显示年份）；周次用紧凑 "Wn"
  const dateObjForBar = parseISO(selected) ?? new Date();
  const mm = pad(dateObjForBar.getMonth() + 1);
  const dd = pad(dateObjForBar.getDate());
  const weekdayShort = (isZH ? weekdayCN : weekdayEN)[dateObjForBar.getDay()];
  const barDateLabel = isZH ? `${mm}/${dd} · ${weekdayShort}` : `${weekdayShort}, ${mm}/${dd}`;
  const barWeekCompact = weekIndex ? `W${weekIndex}` : undefined;
  const weekLabel = isZH ? `第 ${weekIndex} 周` : `W${weekIndex}`;
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

  // —— 状态 —— 
  const [overlayMonthAnchor, setOverlayMonthAnchor] = useState<Date | null>(null);

  useEffect(() => {
    if (!calendarOpen) return;
    const anchor = overlayMonthAnchor ?? selectedDateObj;
    buildMonthMap(anchor);
  }, [calendarOpen, overlayMonthAnchor, selected, buildMonthMap]);


  // —— 每日叠加渲染器：右上角画双层环 —— 
  const renderDayExtra = (d: Date) => {
    const k = toDateString(d);
    const outer = monthMap[k] ?? 0;

    return (
      <DualMiniRings
        size={28}                 // 更大
        outerValue={outer}        // 外环=训练完成度（绿色）
        innerKind="journal"       // 内环=journal 彩色分段
        dateKey={k}               // 传入日期 key
        journalType="boulder"     // 如需切换 rope/yds，改这里
        outerThickness={2.4}
        innerThickness={2}
        gap={1.5}
      />
    );
  };

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

  const navigation = useNavigation();

  useLayoutEffect(() => {
    navigation.setOptions({
      header: () => (
        <TopBar
          routeName="calendar"
          titleZH="训练日历"
          titleEN="Calendar"
          rightControls={{
            mode: "date",
            dateLabel: barDateLabel,         // 你已在文件里算好的“仅月日+星期”
            onPrevDate: () => shiftDay(-1),
            onNextDate: () => shiftDay(1),
            onOpenPicker: () => setCalendarOpen((v) => !v),
            maxWidthRatio: 0.60,
          }}
        />
      ),
    });
  }, [
    barDateLabel,         // 依赖：日期变化时刷新头部
    barWeekCompact,
    shiftDay,
    setCalendarOpen,
    navigation,
  ]);

  const renderItem = ({ item, index }: { item: PlanItem; index: number }) => {
    const done = progress[index] ?? false;
    return (
        <TouchableOpacity
          onPress={() => toggleProgress(index)}
          activeOpacity={0.9}
          style={{
            // 卡片外观
            marginHorizontal: 16,
            marginBottom: 12,
            paddingVertical: 16,
            paddingHorizontal: 16,
            backgroundColor: "#FFFFFF",
            borderRadius: 20,
            borderWidth: 0.6,
            borderColor: "#E5E7EB",

            // 阴影
            shadowColor: "#000",
            shadowOpacity: 0.06,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: 4 },
            elevation: 4,

            // 行内布局
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
            borderWidth: 1,
            borderColor: done ? "#A5D23D" : "#d1d5db",
            backgroundColor: done ? "#A5D23D" : "#FFFFFF",
          }}
        />
        {/* 文案（注意用 tt() 取当前语言） */}
        <View style={{ flex: 1 }}>
          <Text style={{ fontWeight: "600", marginBottom: 4, color: tokens.color.text }}>
            {tt(item.label)}
          </Text>
          <Text style={{ color: tokens.color.text }}>{tt(item.target)}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: pageBg }}>


      <CollapsibleCalendarOverlay
        visible={calendarOpen}
        onClose={() => setCalendarOpen(false)}
        date={selectedDateObj}
        onSelect={(d) => {
          setSelected(toDateString(d));
          setCalendarOpen(false);
        }}
        lang={isZH ? "zh" : "en"}
        firstDay={1}
        topOffset={56}
        renderDayExtra={renderDayExtra}
        onMonthChange={(anyDayInMonth: Date) => setOverlayMonthAnchor(anyDayInMonth)}
      />


      {/* 完成度卡片（仅进度与说明） */}
      <Card style={{ marginHorizontal: 16, marginTop: 12, marginBottom: 8, borderWidth: 0.6 }}>
        <ProgressBar value={dayCompletion} />
        <Caption style={{ marginTop: 6 }}>
          {isZH
            ? `今日完成度 ${dayCompletion}% · 已完成 ${doneCount}/${totalCount} 项${weekLabel ? ` · ${weekLabel}` : ""}`
            : `Completion ${dayCompletion}% · ${doneCount}/${totalCount} done${weekLabel ? ` · ${weekLabel}` : ""}`}
        </Caption>
        <Caption style={{ marginTop: 2 }}>
          {isZH ? `今日记录 ${climbCount} 次` : `Today's logs: ${climbCount}`}
        </Caption>

      </Card>


      {/* 今日备注 */}
      <Card style={{ marginHorizontal: 16, marginBottom: 8, borderWidth: 0.6 }}>
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
        {dayData?.items?.length ? (
          <FlatList
            data={dayData.items}
            renderItem={renderItem}
            keyExtractor={(_, i) => `${selected}_${i}`}
            ItemSeparatorComponent={() => null}
            scrollEnabled={true}
            contentContainerStyle={{ paddingTop: 8, paddingBottom: 24 }}
          />
        ) : (
          <View style={{ padding: 16 }}>
            <Text style={{ color: tokens.color.muted }}>
              {isZH ? "今日暂无训练项目" : "No items for today"}
            </Text>
          </View>
        )}

    </SafeAreaView>
  );
}
