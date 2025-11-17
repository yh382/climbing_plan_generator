// app/(tabs)/journal-ring.tsx
import React, { useMemo, useState, useEffect, useLayoutEffect, useCallback } from "react";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  useColorScheme,
  Alert,
  FlatList,
  Share,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from "react-native-reanimated";

// —— 组件 —— //
import CollapsibleCalendarOverlay from "../../components/CollapsibleCalendarOverlay";
import SingleRing from "../../components/SingleRing";
import TopRightControls from "../../components/TopRightControls"; // 右侧日期胶囊（内部是 TopDateHeader）
import { DateMiniRing } from "../../components/DateMiniRing";

// —— Store / Context —— //
import useLogsStore, { useSegmentsByDate } from "../../src/store/useLogsStore";
import { useSettings } from "../../src/contexts/SettingsContext";

// —— 颜色映射 —— //
import { colorForBoulder, colorForYDS } from "../../lib/gradeColors";

// —— 日期小工具 —— //
const pad = (n: number) => String(n).padStart(2, "0");
const toDate = (s: string) => {
  const [y, m, d] = s.split("-").map((x) => parseInt(x, 10));
  return new Date(y, (m || 1) - 1, d || 1);
};
const dateStr = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const formatDateLabel = (d: Date, lang: "zh" | "en") => {
  const w = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
  const base = dateStr(d);
  return lang === "zh" ? `${base}（${w[d.getDay()]}）` : base;
};

export default function JournalRingDetail() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const isDark = useColorScheme() === "dark";

  // 入场动画（大环）
  const ringScale = useSharedValue(0.86);
  const ringOpacity = useSharedValue(0);
  useEffect(() => {
    ringScale.value = withTiming(1, { duration: 280 });
    ringOpacity.value = withTiming(1, { duration: 180 });
  }, []);
  const ringAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ringScale.value }],
    opacity: ringOpacity.value,
  }));

  // —— 路由参数 —— //
  const params = useLocalSearchParams<{ mode?: "boulder" | "rope"; date?: string; lang?: "zh" | "en" }>();
  const initialDate = params.date ? toDate(params.date) : new Date();
  const [selectedDate, setSelectedDate] = useState<Date>(initialDate);
  const [calendarOpen, setCalendarOpen] = useState(false);

  useEffect(() => {
    if (params?.date) {
      const next = toDate(String(params.date));
      if (
        next.getFullYear() !== selectedDate.getFullYear() ||
        next.getMonth() !== selectedDate.getMonth() ||
        next.getDate() !== selectedDate.getDate()
      ) {
        setSelectedDate(next);
      }
    }
  }, [params?.date]);

  // 语言 & 模式
  const lang: "zh" | "en" = (params.lang as any) || "zh";
  const tr = (zh: string, en: string) => (lang === "zh" ? zh : en);
  const mode: "boulder" | "rope" = (params.mode as any) || "boulder";
  const logType = mode === "boulder" ? "boulder" : "yds";
  const modeLabel = mode === "boulder" ? tr("抱石", "Bouldering") : tr("绳索", "Rope");

  // —— 周起始（周一） —— //
  const startOfWeekLocal = (d: Date) => {
    const nd = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const day = nd.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    nd.setDate(nd.getDate() + diff);
    return nd;
  };
  const pad2 = (n: number) => String(n).padStart(2, "0");
  const keyOf = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

  // —— 数据 —— //
  const countsForWeek = useLogsStore((s) => s.countsForWeek);
  const countByDateType = useLogsStore((s) => s.countByDateType);

  const weekStart = startOfWeekLocal(selectedDate);
  const weekCounts = countsForWeek(keyOf(weekStart), logType);

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }).map((_, i) => {
      const dt = new Date(weekStart);
      dt.setDate(weekStart.getDate() + i);
      const k = keyOf(dt);
      return { date: dt, count: weekCounts[k] ?? 0 };
    });
  }, [weekStart, weekCounts]);

  const count = useMemo(
    () => countByDateType(dateStr(selectedDate), logType),
    [selectedDate, logType, countByDateType]
  );

  const dayKey = dateStr(selectedDate);
  const daySegments = useSegmentsByDate(dayKey, logType);
  const dayParts = useMemo(() => {
    const total = daySegments.reduce((s, x) => s + x.count, 0);
    return { total, parts: daySegments };
  }, [daySegments]);

  // —— 等级显示（单位转换） —— //
  const { boulderScale, ropeScale } = useSettings();
  const toDisplayGrade = React.useCallback(
    (grade: string) => {
      if (mode === "boulder") {
        if (boulderScale === "Font") {
          const V_TO_FONT: Record<string, string> = {
            V0: "4",
            V1: "4+",
            V2: "5",
            V3: "5+",
            V4: "6A",
            V5: "6B",
            V6: "6C",
            V7: "7A",
            V8: "7B",
            V9: "7C",
            V10: "8A",
            V11: "8A+",
            V12: "8B",
          };
          return V_TO_FONT[grade] ?? grade;
        }
        return grade;
      } else {
        if (ropeScale === "French") {
          const YDS_TO_FRENCH: Record<string, string> = {
            "5.9": "5c",
            "5.10a": "6a",
            "5.10b": "6a+",
            "5.10c": "6b",
            "5.10d": "6b+",
            "5.11a": "6c",
            "5.11b": "6c+",
            "5.11c": "7a",
            "5.11d": "7a+",
            "5.12a": "7b",
            "5.12b": "7b+",
            "5.12c": "7c",
            "5.12d": "7c+",
            "5.13a": "7c+/8a",
            "5.13b": "8a",
          };
          return YDS_TO_FRENCH[grade] ?? grade;
        }
        return grade;
      }
    },
    [mode, boulderScale, ropeScale]
  );

  // —— 顶部交互 —— //
  const goPrevDate = useCallback(async () => {
    await Haptics.selectionAsync();
    setSelectedDate((d) => new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1));
  }, []);
  const goNextDate = useCallback(async () => {
    await Haptics.selectionAsync();
    setSelectedDate((d) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1));
  }, []);
  const toggleCalendar = useCallback(async () => {
    await Haptics.selectionAsync();
    setCalendarOpen((v) => !v);
  }, []);
  const handleShare = useCallback(async () => {
    try {
      await Haptics.selectionAsync();
      const title = lang === "zh" ? "今日攀爬记录" : "Today's climbs";
      const dateLine = formatDateLabel(selectedDate, lang);
      const lines =
        dayParts.parts.length > 0
          ? dayParts.parts.map((p) => `${toDisplayGrade(p.grade)} × ${p.count}`).join(lang === "zh" ? "；" : "; ")
          : lang === "zh"
          ? "今日暂无记录"
          : "No logs today";

      await Share.share({
        message:
          lang === "zh"
            ? `日期：${dateLine}\n模式：${modeLabel}\n${title}：${lines}`
            : `Date: ${dateLine}\nMode: ${modeLabel}\n${title}: ${lines}`,
      });
    } catch (e) {
      Alert.alert(lang === "zh" ? "分享失败" : "Share failed", lang === "zh" ? "请稍后重试" : "Please try again later");
    }
  }, [lang, modeLabel, selectedDate, dayParts.parts, toDisplayGrade]);

  // —— 自定义 header（左：日历/分享；右：日期胶囊） —— //
useLayoutEffect(() => {
  // —— 让胶囊文案更短：09/30 · 周二（避免截断）——
  const w = ["周日","周一","周二","周三","周四","周五","周六"];
  const m = String(selectedDate.getMonth() + 1).padStart(2, "0");
  const d = String(selectedDate.getDate()).padStart(2, "0");
  const chipLabel = lang === "zh" ? `${m}/${d} · ${w[selectedDate.getDay()]}` : `${m}/${d}`;

  const iconColor = "#111827";
  const iconBackground = "#F1F5F9";
  const iconBorder = "#E2E8F0";

  navigation.setOptions({
    header: () => (
      <View style={[{ width: "100%", backgroundColor: "#FFFFFF", paddingTop: insets.top }]}>
        <View
          style={{
            height: 48,
            paddingHorizontal: 16,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            backgroundColor: "#FFFFFF",
          }}
        >
          {/* —— 左：日期胶囊（复用 TopRightControls 的 date 模式）—— */}
          <View style={{ flex: 1, paddingRight: 10 }}>
            <TopRightControls
              mode="date"
              dateLabel={chipLabel}
              onPrevDate={goPrevDate}
              onNextDate={goNextDate}
              onOpenPicker={toggleCalendar}
              // 和训练日志一致：给足宽度，避免截断
              maxWidthRatio={0.72}
            />
          </View>

          {/* —— 右：日历 + 分享 —— */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <TouchableOpacity
              onPress={toggleCalendar}
              style={{
                width: 36, height: 36, borderRadius: 18,
                alignItems: "center", justifyContent: "center",
                borderWidth: StyleSheet.hairlineWidth,
                backgroundColor: iconBackground, borderColor: iconBorder,
              }}
              hitSlop={12}
            >
              <Ionicons name="calendar-outline" size={20} color={iconColor} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleShare}
              style={{
                width: 36, height: 36, borderRadius: 18,
                alignItems: "center", justifyContent: "center",
                borderWidth: StyleSheet.hairlineWidth,
                backgroundColor: iconBackground, borderColor: iconBorder,
              }}
              hitSlop={12}
            >
              <Ionicons name="share-outline" size={20} color={iconColor} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    ),
  });
}, [navigation, insets.top, selectedDate, lang, goPrevDate, goNextDate, toggleCalendar, handleShare]);


  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
      {/* 本周 Mini Rings */}
      <View style={{ paddingHorizontal: 12 }}>
        <FlatList
          data={weekDays}
          keyExtractor={(it) => it.date.toISOString()}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingVertical: 6, gap: 16 }}
          renderItem={({ item }) => {
            const d = item.date;
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
              d.getDate()
            ).padStart(2, "0")}`;
            return (
              <View style={{ alignItems: "center", width: 40 }}>
                <DateMiniRing
                  dateKey={key}
                  type={logType}
                  size={24}
                  thickness={3}
                  selected={dateStr(selectedDate) === key}
                  onPress={() => setSelectedDate(new Date(d))}
                />
                <Text style={{ marginTop: 4, fontSize: 12, color: "#374151" }}>{String(d.getDate())}</Text>
              </View>
            );
          }}
        />
      </View>

      {/* 覆盖式月历 */}
      <CollapsibleCalendarOverlay
        visible={calendarOpen}
        onClose={() => setCalendarOpen(false)}
        date={selectedDate}
        onSelect={(d) => {
          setSelectedDate(d);
          setCalendarOpen(false);
        }}
        lang={lang}
        firstDay={1}
        topOffset={56}
      />

      {/* 居中大环 */}
      <Animated.View
        collapsable={false}
        style={[
          {
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: 16,
            backgroundColor: "#FFFFFF",
          },
          ringAnimStyle,
        ]}
      >
        <SingleRing
          count={count}
          modeLabel={modeLabel}
          diameter={240}
          thickness={20}
          total={dayParts.total}
          parts={dayParts.parts}
          colorOf={mode === "boulder" ? colorForBoulder : colorForYDS}
        />
      </Animated.View>

      {/* 今日攀爬记录清单 */}
      <View style={{ paddingHorizontal: 16, marginTop: 12 }}>
        <Text style={{ fontSize: 13, fontWeight: "700", marginBottom: 6 }}>
          {lang === "zh" ? "今日攀爬记录" : "Today's climbs"}
        </Text>

        {dayParts.parts.length > 0 ? (
          dayParts.parts.map((p) => (
            <View key={`detail-${p.grade}`} style={{ flexDirection: "row", alignItems: "center", paddingVertical: 6 }}>
              <View
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: (mode === "boulder" ? colorForBoulder : colorForYDS)(p.grade),
                  marginRight: 8,
                }}
              />
              <Text style={{ fontSize: 14, fontWeight: "600" }}>{toDisplayGrade(p.grade)}</Text>
              <Text style={{ marginLeft: "auto", fontSize: 14, color: "#6B7280" }}>{p.count}</Text>
            </View>
          ))
        ) : (
          <Text style={{ fontSize: 13, color: "#9CA3AF" }}>
            {lang === "zh" ? "今日暂无记录" : "No logs today"}
          </Text>
        )}
      </View>

      <View style={{ height: 72 }} />
    </SafeAreaView>
  );
}

// —— 样式 —— //
const styles = StyleSheet.create({
  headerWrap: { width: "100%", backgroundColor: "#FFFFFF" },
  headerBar: {
    height: 48,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    backgroundColor: "#FFFFFF",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerRight: {
    flexShrink: 1,
    maxWidth: "75%",
  },
  headerIconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
  },
});

