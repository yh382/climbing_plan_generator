// app/(tabs)/journal.tsx
import React, { useEffect, useMemo, useState } from "react";
import { SafeAreaView, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useSettings } from "src/contexts/SettingsContext";
import TopDateHeader from "../../components/TopDateHeader";
import CollapsibleCalendarOverlay from "../../components/CollapsibleCalendarOverlay";
import SingleRing from "../../components/SingleRing";
import { useRouter } from "expo-router"; // 若已导入可忽略
import useLogsStore, { useSegmentsByDate } from "../../src/store/useLogsStore"; // 从 app/(tabs) 到 app/store
import { Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { colorForBoulder, colorForYDS, getColorForGrade, COLOR, ringStrokeColor } from "../../lib/gradeColors";
import { useLayoutEffect } from "react";
import { useNavigation } from "@react-navigation/native";
import TopBar from "../../components/TopBar";
import DualMiniRings from "../../components/DualMiniRings";
import { usePlanStore, toDateString } from "../../src/store/usePlanStore";






type GradeLog = {
  id: string;
  date: string;
  type: "boulder" | "yds";
  grade: string;   // 内部统一用 V* 或 5.* 作为键
  count: number;
};

const LOGS_KEY = "@climb_logs";
const formatBarLabel = (d: Date, isZH: boolean) => {
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const wCN = ["周日","周一","周二","周三","周四","周五","周六"][d.getDay()];
  const wEN = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][d.getDay()];
  return isZH ? `${mm}/${dd} · ${wCN}` : `${wEN}, ${mm}/${dd}`;
};
const V_GRADES = ["VB", "V0","V1","V2","V3","V4","V5","V6","V7","V8","V9","V10"];
const YDS_GRADES = [
  "5.6","5.7","5.8","5.9",
  "5.10a","5.10b","5.10c","5.10d",
  "5.11a","5.11b","5.11c","5.11d",
  "5.12a","5.12b","5.12c","5.12d",
  "5.13a","5.13b","5.13c","5.13d",
  "5.14a","5.14b","5.14c","5.14d",
];

const YDS_TO_FRENCH: Record<string, string> = {
  "5.6":"5a","5.7":"5b","5.8":"5c","5.9":"6a",
  "5.10a":"6a+","5.10b":"6a+","5.10c":"6b","5.10d":"6b+",
  "5.11a":"6c","5.11b":"6c+","5.11c":"7a","5.11d":"7a+",
  "5.12a":"7b","5.12b":"7b+","5.12c":"7c","5.12d":"7c+",
  "5.13a":"7c+","5.13b":"8a","5.13c":"8a+","5.13d":"8b",
  "5.14a":"8b+","5.14b":"8c","5.14c":"8c+","5.14d":"9a",
};

const V_TO_FONT: Record<string, string> = {
  VB:"3", V0:"4", V1:"5", V2:"5+", V3:"6A", V4:"6B",
  V5:"6C", V6:"7A", V7:"7A+", V8:"7B", V9:"7C", V10:"7C+",
};

function pad(n: number) { return n < 10 ? `0${n}` : `${n}`; }
function todayStr() { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; }
function startOfWeek(d = new Date()) { const x = new Date(d); x.setHours(0,0,0,0); x.setDate(x.getDate() - x.getDay()); return x; }
function inSameWeek(dateStr: string, base = new Date()) {
  const d = new Date(dateStr + "T00:00:00");
  const start = startOfWeek(base);
  const end = new Date(start); end.setDate(start.getDate()+7);
  return d >= start && d < end;
}
function dateStr(d: Date) {
  const y = d.getFullYear();
  const m = pad(d.getMonth() + 1);
  const da = pad(d.getDate());
  return `${y}-${m}-${da}`;
}
function shiftDay(d: Date, delta: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + delta);
  return x;
}
function formatDateLabel(d: Date, lang: "zh" | "en") {
  const w = ["周日","周一","周二","周三","周四","周五","周六"];
  const base = dateStr(d);
  return lang === "zh" ? `${base}（${w[d.getDay()] }）` : base;
}
// 统计“某周7天”的每日次数（按你当前 mode 过滤）
function getWeekCounts(anchor: Date, logs: GradeLog[], mode: "boulder" | "yds") {
  const ws = startOfWeek(anchor);
  const result: Record<string, number> = {};
  for (let i = 0; i < 7; i++) {
    const dt = new Date(ws);
    dt.setDate(ws.getDate() + i);
    const key = dateStr(dt);
    // 如果你的日志结构是 logs: { date: "YYYY-MM-DD", type: "boulder"|"rope", ... }
    result[key] = logs.filter(l => l.date === key && l.type === mode).length;
  }
  return result;
}

export default function Journal() {
  const { boulderScale, ropeScale, lang } = useSettings();
  const tr = (zh: string, en: string) => (lang === "zh" ? zh : en);
  const [mode, setMode] = useState<"boulder" | "yds">("boulder");
  const [action, setAction] = useState<"add" | "sub">("add"); // 顶部动作切换
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const router = useRouter();
  const modeLabel = mode === "boulder" ? "抱石" : "绳索";
  const upsertCount     = useLogsStore((s) => s.upsertCount);
  const countByDateType = useLogsStore((s) => s.countByDateType);
  const logType = mode === "boulder" ? "boulder" : "yds"; // 你的 rope 用 yds 表示
  const todayKey = React.useMemo(() => dateStr(selectedDate), [selectedDate]);
  const todayTotal = React.useMemo(
  () => countByDateType(todayKey, logType),
  [todayKey, logType, countByDateType]
  );
  // 当日等级分布 → 用于 SingleRing 分段


  // +1：直接在当天追加一条
  // +1
  const addOne = (grade: string) => {
    upsertCount({
      date: todayKey,
      type: logType,
      grade,
      delta: 1,
    });
  };

  // -1（如果你有减一逻辑）
  const subOne = (grade: string) => {
    upsertCount({
      date: todayKey,
      type: logType,
      grade,
      delta: -1,
    });
  };


  // 胶囊点击动作（根据当前 action 切换）
  const onCapsulePress = (g: string) => {
    if (action === "add") addOne(g);
    else subOne(g);
  };


  // 本周统计
  const logs = useLogsStore((s) => s.logs);
  const logsByMode = useMemo(() => logs.filter((l) => l.type === mode), [logs, mode]);
  const segmentsToday = useSegmentsByDate(todayKey, logType);

  // 本周统计（按当前模式 & 所选日期所在周）
  const weekStats = useMemo(() => {
    const base = selectedDate;
    const curList = mode === "boulder" ? V_GRADES : YDS_GRADES;
    const curMap: Record<string, number> = {};
    let total = 0;

    logsByMode.forEach((l) => {
      if (!inSameWeek(l.date, base)) return;
      curMap[l.grade] = (curMap[l.grade] || 0) + l.count;
      total += l.count;
    });

    const list = curList
      .map((g) => ({ grade: g, count: curMap[g] || 0 }))
      .filter((x) => x.count > 0);

    return { total, list };
  }, [logsByMode, mode, selectedDate]);

  // 当日等级分布 → 用于 SingleRing 分段
  const dayParts = useMemo(() => {
    const total = segmentsToday.reduce((sum, seg) => sum + seg.count, 0);
    return { total, parts: segmentsToday };
  }, [segmentsToday]);


  // 总计（按当前模式，所有时间）
  const totalStats = useMemo(() => {
    const curList = mode === "boulder" ? V_GRADES : YDS_GRADES;
    const curMap: Record<string, number> = {};
    let all = 0;

    logsByMode.forEach((l) => {
      curMap[l.grade] = (curMap[l.grade] || 0) + l.count;
      all += l.count;
    });

    const list = curList
      .map((g) => ({ grade: g, count: curMap[g] || 0 }))
      .filter((x) => x.count > 0);

    return { all, list };
  }, [logsByMode, mode]);


  const ModeSwitch = () => (
    <View style={{ marginTop: 8, marginBottom: 8, flexDirection: "row", alignItems: "center" }}>
      <View style={{ flex: 1, alignItems: "center" }}>
        <TouchableOpacity
          onPress={() => setMode("boulder")}
          style={{
            paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999,
            backgroundColor: mode === "boulder" ? "#000000ff" : "#f3f4f6",
            shadowColor: "#000",
            shadowOpacity: 0.06,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 2 },
            elevation: 3, // Android 阴影
            borderWidth: 0.3,           // 建议加一条细边框，阴影更干净
            borderColor: "#E5E7EB",
          }}
        >
          <Text style={{ fontSize: 13, color: mode === "boulder" ? "white" : "#111827", fontWeight: "700" }}>
            {tr("抱石记录", "Bouldering Logs")}
          </Text>
        </TouchableOpacity>
      </View>
      <View style={{ flex: 1, alignItems: "center" }}>
        <TouchableOpacity
          onPress={() => setMode("yds")}
          style={{
            paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999,
            backgroundColor: mode === "yds" ? "#000000ff" : "#f3f4f6",
            shadowColor: "#000",
            shadowOpacity: 0.06,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 2 },
            elevation: 3, // Android 阴影
            borderWidth: 0.3,   
            borderColor: "#E5E7EB",
          }}
        >
          <Text style={{ fontSize: 13, color: mode === "yds" ? "white" : "#111827", fontWeight: "700" }}>
            {tr("难度记录", "Rope Logs")}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const ActionSwitch = () => (
    <View
      style={{
        flexDirection: "row",
        alignSelf: "center",
        marginBottom: 10,
        padding: 4,
        borderRadius: 999,
        backgroundColor: "#F5F6F8",
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: "#E2E8F0",
        gap: 6,
      }}
    >
      <TouchableOpacity
        onPress={() => setAction("add")}
        activeOpacity={0.9}
        style={{
          flex: 1,
          paddingVertical: 10,
          borderRadius: 999,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: action === "add" ? "#16A34A" : "#F5F6F8",
          borderWidth: action === "add" ? 0 : 0,
          borderColor: "transparent",
          shadowColor: action === "add" ? "#16A34A" : "transparent",
          shadowOpacity: action === "add" ? 0.2 : 0,
          shadowRadius: action === "add" ? 8 : 0,
          shadowOffset: action === "add" ? { width: 0, height: 4 } : { width: 0, height: 0 },
          elevation: action === "add" ? 4 : 0,
        }}
      >
          <Text style={{ color: action === "add" ? "#FFFFFF" : "#334155", fontWeight: "700", fontSize: 13 }}>
            {tr("添加 +", "Add +")}
          </Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => setAction("sub")}
        activeOpacity={0.9}
        style={{
          flex: 1,
          paddingVertical: 10,
          borderRadius: 999,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: action === "sub" ? "#EF4444" : "#F5F6F8",
          borderWidth: action === "sub" ? 0 : 0,
          borderColor: "transparent",
          shadowColor: action === "sub" ? "#EF4444" : "transparent",
          shadowOpacity: action === "sub" ? 0.18 : 0,
          shadowRadius: action === "sub" ? 8 : 0,
          shadowOffset: action === "sub" ? { width: 0, height: 4 } : { width: 0, height: 0 },
          elevation: action === "sub" ? 4 : 0,
        }}
      >
        <Text style={{ color: action === "sub" ? "#FFFFFF" : "#334155", fontWeight: "700", fontSize: 13 }}>
          {tr("删减 -", "Delete -")}
        </Text>
      </TouchableOpacity>
    </View>
  );
  
  const { monthMap, buildMonthMap } = usePlanStore();


  // ==== 训练计划进度（外环）所需：plan、工具函数、月度 map ====

  // 1) 读取 plan
  const plan = typeof usePlanStore === "function" ? usePlanStore((s) => s.plan) : null;

  const [overlayMonthAnchor, setOverlayMonthAnchor] = useState<Date | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);



  // 只要打开 overlay / 切月 / plan 变更，就重建本月外环 map
  useEffect(() => {
    if (!calendarOpen) return;
    const anchor = overlayMonthAnchor ?? selectedDate;  // selectedDate 是 Date 对象
    buildMonthMap(anchor);
  }, [calendarOpen, overlayMonthAnchor, selectedDate, buildMonthMap]);


  const renderDayExtra = (d: Date) => {
    const k = toDateString(d);
    const outer = monthMap[k] ?? 0;

    return (
      <DualMiniRings
        size={28}                 // 跟 Calendar 一样
        outerValue={outer}        // 外层绿色训练进度
        innerKind="journal"       // 内层=journal 彩色小环
        dateKey={k}               // 让小环按当天分段
        journalType={mode === "boulder" ? "boulder" : "yds"}
        outerThickness={2.4}
        innerThickness={2}
        gap={1.5}
      />
    );
  };
  

  // 等级胶囊（根据模式动态生成，自动应用 Font/French 文案）
  const GradeCapsules = () => {
    const grades = mode === "boulder" ? V_GRADES : YDS_GRADES;
    const labelOf = (g: string) => {
      if (mode === "boulder") return (boulderScale === "Font" ? (V_TO_FONT[g] || g) : g);
      return (ropeScale === "French" ? (YDS_TO_FRENCH[g] || g) : g);
    };
    return (
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {grades.map((g) => (
          <TouchableOpacity
            key={`cap-${mode}-${g}`}
            onPress={() => onCapsulePress(g)}
            style={{
              paddingVertical: 10, paddingHorizontal: 14, borderRadius: 999,
              borderWidth: 0.6, borderColor: "#e5e7eb", backgroundColor: "#f9fafb",
            }}
          >
            <Text style={{ fontWeight: "700", color: "#111827" }}>{labelOf(g)}</Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const navigation = useNavigation();

  useLayoutEffect(() => {
    navigation.setOptions({
      header: () => (
        <TopBar
          routeName="journal"
          titleZH="训练日志"
          titleEN="Journal"
          rightControls={{
            mode: "date",
            dateLabel: formatBarLabel(selectedDate, lang === "zh"),
            onPrevDate: () => setSelectedDate((d) => shiftDay(d, -1)),
            onNextDate: () => setSelectedDate((d) => shiftDay(d, +1)),
            onOpenPicker: () => setCalendarOpen((v) => !v),
            maxWidthRatio: 0.60,
          }}
        />
      ),
    });
  }, [
    selectedDate,
    lang,
    setSelectedDate,
    setCalendarOpen,
    navigation,
  ]);

  const Pill = ({ text }: { text: string }) => (
    <View
      style={{
        paddingVertical: 4, paddingHorizontal: 8, borderRadius: 8,
        borderWidth: 0.6, borderColor: "#e5e7eb", marginRight: 8, marginBottom: 8, backgroundColor: "#f9fafb",
      }}
    >
      <Text style={{ color: "#111827" }}>{text}</Text>
    </View>
  );

  return (
    <SafeAreaView style={{flex: 1, padding: 12, backgroundColor: "#FFFFFF" }}>
      <View style={{ zIndex: 2 }}>
        <TopDateHeader
          dateLabel={formatDateLabel(selectedDate, lang)}
          onPrev={() => setSelectedDate(d => shiftDay(d, -1))}
          onNext={() => setSelectedDate(d => shiftDay(d, +1))}
          onPressCenter={() => setCalendarOpen(v => !v)}
        />
      </View>

      <ScrollView style={{ flex: 1, }} contentContainerStyle={{ paddingHorizontal:16,paddingBottom: 72 }}>
    <CollapsibleCalendarOverlay
        visible={calendarOpen}
        onClose={() => setCalendarOpen(false)}
        date={selectedDate}
        onSelect={(d) => {
          setSelectedDate(d);
          setCalendarOpen(false);
        }}
        lang={lang === "zh" ? "zh" : "en"}
        firstDay={1}
        topOffset={56}
        // ✅ 新增：小环渲染器（外层训练进度 + 内层彩色分段）
        renderDayExtra={renderDayExtra}
        // ✅ 新增：切换月份时，通知我们重建外环 map
        onMonthChange={(anyDayInMonth: Date) => setOverlayMonthAnchor(anyDayInMonth)}
      />




      <ModeSwitch />

      {/* 训练环卡片（整卡可点进入详情） */}
      <Pressable
        onPress={() => {
          Haptics.selectionAsync();
          router.push({
            pathname: "/journal-ring",
            params: { mode, date: dateStr(selectedDate) },
          });
        }}
        style={({ pressed }) => [
          {
            borderWidth: 0.6,
            borderColor: "#f0ececff",
            borderRadius: 20,
            backgroundColor: "white",
            marginBottom: 16,
            paddingVertical: 12,
            paddingHorizontal: 12,
            shadowColor: "#000",
            shadowOpacity: 0.06,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: 4 },
            elevation: 4,
          },
          pressed && { opacity: 0.9 },
        ]}
      >
        {/* 顶部标题行 + 右侧小箭头 */}
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Text style={{ fontSize: 13, fontWeight: "700", flex: 1 }}>
            {lang === "zh" ? "今日攀爬记录" : "Today's climbs"}
          </Text>
          <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
        </View>

        {/* 细分割线 */}
        <View
          style={{
            height: StyleSheet.hairlineWidth,
            backgroundColor: "#e5e7eb",
            marginTop: 8,
            marginBottom: 12,
          }}
        />

        {/* 内容：左分段环（无中心文字） + 右侧等级×数量 */}
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <SingleRing
            count={todayTotal}
            modeLabel={modeLabel}
            diameter={140}
            thickness={20}
            total={dayParts.total}
            parts={dayParts.parts}
            colorOf={mode === "boulder" ? colorForBoulder : colorForYDS}
            hideCenter
            // 不再给 onPress；整卡片已可点
          />

          <View style={{ flex: 1, marginLeft: 12 }}>
            {dayParts.parts.length > 0 ? (
              dayParts.parts.map((p) => {
                const label =
                  mode === "boulder"
                    ? (boulderScale === "Font" ? (V_TO_FONT[p.grade] ?? p.grade) : p.grade)
                    : (ropeScale === "French" ? (YDS_TO_FRENCH[p.grade] ?? p.grade) : p.grade);

                return (
                  <View
                    key={`today-${p.grade}`}
                    style={{ flexDirection: "row", alignItems: "center", paddingVertical: 4 }}
                  >
                    <View
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 20,
                        backgroundColor: (mode === "boulder" ? colorForBoulder : colorForYDS)(p.grade),
                        marginRight: 6,
                      }}
                    />
                    <Text style={{ fontSize: 14, fontWeight: "600" }}>{label}</Text>
                    <Text style={{ marginLeft: "auto", fontSize: 14, color: "#6B7280" }}>{p.count}</Text>
                  </View>
                );
              })
            ) : (
              <Text style={{ fontSize: 13, color: "#9CA3AF" }}>
                {lang === "zh" ? "今日暂无记录" : "No logs today"}
              </Text>
            )}
          </View>
        </View>
      </Pressable>




      {/* 记录卡片：上方动作切换 + 等级胶囊 */}
      <View
        style={{
          borderWidth: 0.6,
          borderColor: "#e5e7eb",
          borderRadius: 20,
          backgroundColor: "white",
          marginBottom: 12,
          padding: 12,

          // ✅ 新增阴影
          shadowColor: "#000",
          shadowOpacity: 0.06,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 4 },
          elevation: 4,
        }}
      >



        <ActionSwitch />

        {/* 等级胶囊（点击即 +1 / -1） */}
        <View

        >
          <GradeCapsules />
        </View>

        <Text style={{ marginTop: 8, color: "#6b7280" }}>
          {action === "add"
            ? tr("点对应胶囊即可添加 1 条记录", "Tap a capsule to add 1 route")
            : tr("点对应胶囊即可删减 1 条记录（从最近记录回退）", "Tap a capsule to subtract 1 (removes from most recent)")}
        </Text>
      </View>

      {/* 底部总计 */}
      <View
        style={{
          borderWidth: 0.6,
          borderColor: "#e5e7eb",
          borderRadius: 20,
          padding: 12,
          backgroundColor: "white",

          // ✅ 新增阴影
          shadowColor: "#000",
          shadowOpacity: 0.06,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 4 },
          elevation: 4,
        }}
      >
 
        <Text style={{ fontWeight: "700", marginBottom: 72 }}>
          {tr("总条数", "Total")}（{totalStats.all}）
        </Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
          {totalStats.list.length === 0 ? (
            <Text style={{ color: "#9ca3af" }}>{tr("暂无记录", "No records")}</Text>
          ) : (
            totalStats.list.map((it) => {
              const label =
                mode === "boulder"
                  ? (boulderScale === "Font" ? (V_TO_FONT[it.grade] ?? it.grade) : it.grade)
                  : (ropeScale === "French" ? (YDS_TO_FRENCH[it.grade] ?? it.grade) : it.grade);

              return <Pill key={`total-${it.grade}`} text={`${label} × ${it.count}`} />;
            })
          )}
        </View>
      </View>
      </ScrollView>
    </SafeAreaView>
  );
}
