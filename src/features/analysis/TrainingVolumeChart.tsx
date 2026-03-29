// src/features/analysis/TrainingVolumeChart.tsx
import React, { useMemo, useState, useEffect, useRef } from "react";
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BarChart, LineChart } from "react-native-gifted-charts";
import { useThemeColors } from "../../lib/useThemeColors";
import { theme } from "../../lib/theme";
import { TrueSheet } from "@lodev09/react-native-true-sheet";
import { useSettings } from "../../contexts/SettingsContext";
import useLogsStore from "../../store/useLogsStore";
import { toDateString } from "../../store/usePlanStore";
import { backfillIntensityData } from "../../services/stats/intensityCalculator";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// Category colors for stacked bars — grayscale palette
const BOULDER_COLORS = { easy: "#BBBBBB", mid: "#888888", hard: "#555555", elite: "#1C1C1E" };
const ROPE_COLORS = {
  beginner: "#BBBBBB",
  intermediate: "#888888",
  advanced: "#555555",
  expert: "#333333",
  elite: "#1C1C1E",
};
const INTENSITY_COLOR = "#306E6F";

const TIME_RANGES = ["W", "M", "Y"] as const;
type TimeRange = (typeof TIME_RANGES)[number];
type LogType = "boulder" | "rope";

// Intensity data structure (per-type, stored in @daily_intensity)
type IntensityEntry = { value: number; n: number; attempts: number; sends: number };
type DailyIntensityStore = Record<string, {
  boulder?: IntensityEntry;
  rope?: IntensityEntry;
}>;

// Grade categorization using simplified matching (same logic, extracted)
function categorizeBoulder(grade: string): "easy" | "mid" | "hard" | "elite" {
  const match = grade.match(/V(\d+)/i);
  if (!match) return "easy";
  const num = parseInt(match[1], 10);
  if (num <= 2) return "easy";
  if (num <= 5) return "mid";
  if (num <= 8) return "hard";
  return "elite";
}

function categorizeRope(grade: string): "beginner" | "intermediate" | "advanced" | "expert" | "elite" {
  if (/^5\.[6-9]/.test(grade)) return "beginner";
  if (grade.startsWith("5.10")) return "intermediate";
  if (grade.startsWith("5.11")) return "advanced";
  if (grade.startsWith("5.12")) return "expert";
  if (/^5\.1[3-5]/.test(grade)) return "elite";
  return "beginner";
}

const CurrentIndicator = () => {
  const colors = useThemeColors();
  return (
    <View style={{ alignItems: "center", marginBottom: 4 }}>
      <View
        style={{
          width: 0,
          height: 0,
          backgroundColor: "transparent",
          borderStyle: "solid",
          borderLeftWidth: 4,
          borderRightWidth: 4,
          borderBottomWidth: 6,
          borderLeftColor: "transparent",
          borderRightColor: "transparent",
          borderBottomColor: colors.accent,
          transform: [{ rotate: "180deg" }],
        }}
      />
    </View>
  );
};

const LegendDot = ({ color, label }: { color: string; label: string }) => {
  const colors = useThemeColors();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: color }} />
      <Text style={{ fontSize: 10, color: colors.chartLabel }}>{label}</Text>
    </View>
  );
};

export default function TrainingVolumeChart() {
  const colors = useThemeColors();
  const { tr } = useSettings();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [timeRange, setTimeRange] = useState<TimeRange>("W");
  const [selectedTypes, setSelectedTypes] = useState<LogType[]>(["boulder"]);
  const { logs } = useLogsStore();

  const helpRef = useRef<TrueSheet>(null);

  const [intensityData, setIntensityData] = useState<DailyIntensityStore>({});

  useEffect(() => {
    const uniqueDates = [...new Set(logs.map((l) => l.date))];
    if (uniqueDates.length === 0) return;
    backfillIntensityData(uniqueDates)
      .then(setIntensityData)
      .catch(() => {});
  }, [logs]);

  const toggleType = (type: LogType) => {
    if (selectedTypes.includes(type)) {
      if (selectedTypes.length > 1) setSelectedTypes(selectedTypes.filter((t) => t !== type));
    } else {
      setSelectedTypes([...selectedTypes, type]);
    }
  };

  const CHART_PARENT_WIDTH = SCREEN_WIDTH - 48;
  const Y_AXIS_WIDTH = 0;
  const INITIAL_SPACING = 12;
  const ACTUAL_CHART_WIDTH = CHART_PARENT_WIDTH - Y_AXIS_WIDTH - INITIAL_SPACING;

  const { barData, lineData, maxValue, barWidth, slotWidth } = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    let dataPoints: any[] = [];
    let linePoints: any[] = [];
    let maxStackValue = 0;
    const updateMax = (val: number) => {
      if (val > maxStackValue) maxStackValue = val;
    };

    let slotCount = 7;
    if (timeRange === "M") slotCount = 4;
    if (timeRange === "Y") slotCount = 12;

    const slotWidth = Math.floor(ACTUAL_CHART_WIDTH / slotCount);

    const showBoulder = selectedTypes.includes("boulder");
    const showRope = selectedTypes.includes("rope");
    const showBoth = showBoulder && showRope;

    const widthRatio = slotCount === 4 ? 0.4 : 0.6;
    let baseBarWidth = Math.floor(slotWidth * widthRatio);
    if (baseBarWidth % 2 !== 0) baseBarWidth -= 1;

    let finalBarWidth = baseBarWidth;
    let finalSpacing = 0;
    const innerGap = 4;

    if (showBoth) {
      finalBarWidth = (baseBarWidth - innerGap) / 2;
      finalSpacing = slotWidth - finalBarWidth * 2 - innerGap;
    } else {
      finalBarWidth = baseBarWidth;
      finalSpacing = slotWidth - finalBarWidth;
    }

    // Shift to center labels under the bar pair when both types shown
    const pairShift = showBoth ? -(finalBarWidth + innerGap) / 2 : 0;

    // Dashed vertical line props (Apple Fitness style grid)
    const vLineProps = {
      showVerticalLine: true as const,
      verticalLineColor: colors.gridLine,
      verticalLineStrokeDashArray: [3, 3],
      verticalLineThickness: 1,
    };

    const getAvgIntensity = (dates: string[]) => {
      let sum = 0;
      let count = 0;
      dates.forEach((d) => {
        const dayData = intensityData[d];
        if (!dayData) return;
        let daySum = 0;
        let dayCount = 0;
        if (selectedTypes.includes("boulder") && dayData.boulder) {
          daySum += dayData.boulder.value;
          dayCount++;
        }
        if (selectedTypes.includes("rope") && dayData.rope) {
          daySum += dayData.rope.value;
          dayCount++;
        }
        if (dayCount > 0) {
          sum += daySum / dayCount;
          count++;
        }
      });
      return count === 0 ? 0 : Math.round((sum / count) * 100) / 100;
    };

    const buildBoulderStack = (filteredLogs: typeof logs) => {
      let easy = 0,
        mid = 0,
        hard = 0,
        elite = 0;
      filteredLogs.forEach((l) => {
        if (l.type !== "boulder") return;
        const cat = categorizeBoulder(l.grade);
        if (cat === "easy") easy += l.count;
        else if (cat === "mid") mid += l.count;
        else if (cat === "hard") hard += l.count;
        else elite += l.count;
      });
      const total = easy + mid + hard + elite;
      updateMax(total);
      return [
        { value: easy, color: BOULDER_COLORS.easy },
        { value: mid, color: BOULDER_COLORS.mid },
        { value: hard, color: BOULDER_COLORS.hard },
        { value: elite, color: BOULDER_COLORS.elite },
      ];
    };

    const buildRopeStack = (filteredLogs: typeof logs) => {
      let c1 = 0,
        c2 = 0,
        c3 = 0,
        c4 = 0,
        c5 = 0;
      filteredLogs.forEach((l) => {
        if (l.type === "boulder") return;
        const cat = categorizeRope(l.grade);
        if (cat === "beginner") c1 += l.count;
        else if (cat === "intermediate") c2 += l.count;
        else if (cat === "advanced") c3 += l.count;
        else if (cat === "expert") c4 += l.count;
        else c5 += l.count;
      });
      const total = c1 + c2 + c3 + c4 + c5;
      updateMax(total);
      return [
        { value: c1, color: ROPE_COLORS.beginner },
        { value: c2, color: ROPE_COLORS.intermediate },
        { value: c3, color: ROPE_COLORS.advanced },
        { value: c4, color: ROPE_COLORS.expert },
        { value: c5, color: ROPE_COLORS.elite },
      ];
    };

    // Top label: shows bar total (single type only) + current day indicator
    const makeTopLabel = (total: number, isCurrent: boolean, showValue: boolean, shift?: number) => {
      const hasContent = isCurrent || (showValue && total > 0);
      if (!hasContent) return undefined;
      return () => (
        <View style={{ alignItems: "center", ...(shift ? { marginLeft: shift } : {}) }}>
          {isCurrent && <CurrentIndicator />}
          {showValue && total > 0 && (
            <Text style={{ fontSize: 9, fontWeight: "700", color: colors.chartValue }}>{total}</Text>
          )}
        </View>
      );
    };

    const pushData = (
      logsForUnit: typeof logs,
      label: string,
      isCurrent: boolean,
      datesForAvg: string[],
      isFuture: boolean = false
    ) => {
      const labelStyle = isCurrent
        ? { color: colors.accent, fontWeight: "700" as const }
        : { color: colors.chartLabel, fontSize: 10 };

      const boulderStacks = showBoulder ? buildBoulderStack(logsForUnit) : [];
      const ropeStacks = showRope ? buildRopeStack(logsForUnit) : [];
      const boulderTotal = boulderStacks.reduce((s, v) => s + v.value, 0);
      const ropeTotal = ropeStacks.reduce((s, v) => s + v.value, 0);

      if (showBoulder) {
        dataPoints.push({
          stacks: boulderStacks,
          label: showBoth ? "" : label,
          spacing: showBoth ? innerGap : finalSpacing,
          labelTextStyle: labelStyle,
          ...(showBoth ? {} : vLineProps),
          topLabelComponent: showBoth ? undefined : makeTopLabel(boulderTotal, isCurrent, true),
        });
      }
      if (showRope) {
        dataPoints.push({
          stacks: ropeStacks,
          label: label,
          spacing: finalSpacing,
          labelTextStyle: showBoth ? { ...labelStyle, marginLeft: pairShift } : labelStyle,
          ...vLineProps,
          ...(showBoth ? { verticalLineShift: pairShift } : {}),
          topLabelComponent: showBoth
            ? makeTopLabel(0, isCurrent, false, pairShift)
            : makeTopLabel(ropeTotal, isCurrent, true),
        });
      }

      if (!isFuture) {
        const intensity = getAvgIntensity(datesForAvg);
        linePoints.push({
          value: intensity,
          dataPointText: intensity > 0 ? intensity.toFixed(1) : "",
          hideDataPoint: intensity === 0,
        });
      } else {
        linePoints.push({ value: 0, hideDataPoint: true });
      }
    };

    if (timeRange === "W") {
      const day = today.getDay();
      const diff = today.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(today);
      monday.setDate(diff);
      for (let i = 0; i < 7; i++) {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        const dateStr = toDateString(d);
        const isToday = d.getTime() === today.getTime();
        const isFuture = d.getTime() > today.getTime();
        pushData(
          logs.filter((l) => l.date === dateStr),
          ["M", "T", "W", "T", "F", "S", "S"][i],
          isToday,
          [dateStr],
          isFuture
        );
      }
    } else if (timeRange === "M") {
      const year = today.getFullYear();
      const month = today.getMonth();
      const weeks: [number, number][] = [
        [1, 7],
        [8, 14],
        [15, 21],
        [22, 31],
      ];
      weeks.forEach((range, idx) => {
        const rangeDates: string[] = [];
        for (let i = range[0]; i <= range[1]; i++) {
          const d = new Date(year, month, i);
          if (d.getMonth() === month) rangeDates.push(toDateString(d));
        }
        const isCurrentWeek = today.getDate() >= range[0] && today.getDate() <= range[1];
        const isFuture = today.getDate() < range[0];
        pushData(
          logs.filter((l) => rangeDates.includes(l.date)),
          `W${idx + 1}`,
          isCurrentWeek,
          rangeDates,
          isFuture
        );
      });
    } else {
      const year = today.getFullYear();
      for (let i = 0; i < 12; i++) {
        const monthPrefix = `${year}-${String(i + 1).padStart(2, "0")}`;
        const isCurrentMonth = i === today.getMonth();
        const isFuture = i > today.getMonth();
        const monthDates = Object.keys(intensityData).filter((k) => k.startsWith(monthPrefix));
        pushData(
          logs.filter((l) => l.date.startsWith(monthPrefix)),
          ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"][i],
          isCurrentMonth,
          monthDates,
          isFuture
        );
      }
    }

    const calculatedMax = Math.max(4, Math.ceil(maxStackValue * 1.15));

    return {
      barData: dataPoints,
      lineData: linePoints,
      maxValue: calculatedMax,
      barWidth: finalBarWidth,
      slotWidth,
    };
  }, [logs, timeRange, selectedTypes, intensityData]);

  const lineInitialSpacing = INITIAL_SPACING + slotWidth / 2;

  return (
    <View style={styles.chartCard}>
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.cardTitle}>{tr("训练量", "Training Volume")}</Text>
          <View style={{ flexDirection: "row", marginTop: 8, gap: 8 }}>
            <TouchableOpacity
              onPress={() => toggleType("boulder")}
              style={[styles.typePill, selectedTypes.includes("boulder") ? styles.typePillActive : styles.typePillInactive]}
            >
              <Text style={[styles.typePillText, selectedTypes.includes("boulder") && { color: colors.toggleActiveText }]}>{tr("抱石", "Boulder")}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => toggleType("rope")}
              style={[styles.typePill, selectedTypes.includes("rope") ? styles.typePillActive : styles.typePillInactive]}
            >
              <Text style={[styles.typePillText, selectedTypes.includes("rope") && { color: colors.toggleActiveText }]}>{tr("绳攀", "Rope")}</Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <View style={styles.segmentContainer}>
            {TIME_RANGES.map((r) => (
              <TouchableOpacity
                key={r}
                onPress={() => setTimeRange(r)}
                style={[styles.segmentBtn, timeRange === r && styles.segmentBtnActive]}
              >
                <Text style={[styles.segmentText, timeRange === r && styles.segmentTextActive]}>{r}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity onPress={() => helpRef.current?.present()} style={styles.helpBtn}>
            <Ionicons name="help-circle-outline" size={20} color={colors.chartLabel} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={{ marginLeft: -10, marginTop: 12 }}>
        <View style={{ height: 80, marginBottom: -10, zIndex: 10 }}>
          <LineChart
            key={`line-${timeRange}`}
            data={lineData}
            width={ACTUAL_CHART_WIDTH + INITIAL_SPACING}
            height={80}
            spacing={slotWidth}
            initialSpacing={lineInitialSpacing}
            color={INTENSITY_COLOR}
            thickness={2}
            curved
            hideDataPoints={false}
            dataPointsShape="custom"
            dataPointsHeight={6}
            dataPointsWidth={6}
            dataPointsColor={INTENSITY_COLOR}
            strokeDashArray={[4, 4]}
            maxValue={1}
            noOfSections={2}
            yAxisLabelWidth={Y_AXIS_WIDTH}
            hideRules
            xAxisThickness={0}
            yAxisThickness={0}
            hideAxesAndRules
          />
        </View>

        <View>
          <BarChart
            key={`bar-${timeRange}-${selectedTypes.join("-")}`}
            width={ACTUAL_CHART_WIDTH + INITIAL_SPACING}
            height={160}
            stackData={barData}
            maxValue={maxValue}
            noOfSections={4}
            initialSpacing={INITIAL_SPACING}
            barWidth={barWidth}
            roundedTop
            roundedBottom
            hideRules
            xAxisThickness={0}
            yAxisThickness={0}
            xAxisLabelTextStyle={{ color: colors.chartLabel, fontSize: 10, textAlign: "center" }}
            yAxisLabelWidth={Y_AXIS_WIDTH}
            scrollAnimation={false}
            isAnimated
            animationDuration={400}
          />
        </View>
      </View>

      <View style={{ marginTop: 16, gap: 8 }}>
        {selectedTypes.includes("boulder") && (
          <View style={styles.legendRow}>
            <Text style={styles.legendTitle}>{tr("抱石:", "Boulder:")}</Text>
            <LegendDot color={BOULDER_COLORS.easy} label="V0-V2" />
            <LegendDot color={BOULDER_COLORS.mid} label="V3-V5" />
            <LegendDot color={BOULDER_COLORS.hard} label="V6-V8" />
            <LegendDot color={BOULDER_COLORS.elite} label="V8+" />
          </View>
        )}
        {selectedTypes.includes("rope") && (
          <View style={styles.legendRow}>
            <Text style={styles.legendTitle}>{tr("绳攀:", "Rope:")}</Text>
            <LegendDot color={ROPE_COLORS.beginner} label={tr("入门", "Beginner")} />
            <LegendDot color={ROPE_COLORS.intermediate} label="5.10" />
            <LegendDot color={ROPE_COLORS.advanced} label="5.11" />
            <LegendDot color={ROPE_COLORS.expert} label="5.12" />
            <LegendDot color={ROPE_COLORS.elite} label="5.13+" />
          </View>
        )}
        <View style={styles.legendRow}>
          <Text style={styles.legendTitle}>{tr("费劲程度:", "Intensity:")}</Text>
          <LegendDot color={INTENSITY_COLOR} label="0-1" />
        </View>
      </View>

      <TrueSheet
        ref={helpRef}
        detents={[0.4, 0.9]}
        backgroundColor={colors.sheetBackground}
        grabberOptions={{ height: 3, width: 36, topMargin: 6 }}
        dimmed
        dimmedDetentIndex={0}
      >
        <View style={styles.sheetHeader}>
          <Text style={styles.sheetHeaderTitle}>{tr("训练量", "Training Volume")}</Text>
        </View>
        <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          <View style={styles.sheetBody}>
            <View>
              <Text style={styles.sheetSectionTitle}>{tr("训练量柱状图", "Volume Bar Chart")}</Text>
              <Text style={styles.sheetBodyText}>
                {tr(
                  "展示你每天/每周/每月的攀登次数，按难度等级分颜色堆叠。",
                  "Shows your daily/weekly/monthly climb count, color-stacked by grade category."
                )}
              </Text>
            </View>
            <View>
              <Text style={styles.sheetSectionTitle}>{tr("费劲程度（紫色虚线, 0-1）", "Intensity (dashed line, 0-1)")}</Text>
              <Text style={styles.sheetBodyText}>
                {tr(
                  `综合反映每次训练的费劲程度，基于：\n• 你对路线难度的主观感受（soft / solid / hard）\n• 每条路线的尝试次数\n• 完攀情况\n\n数值越接近 1 代表这次训练越费劲，越接近 0 代表越轻松。`,
                  `Reflects how hard each session felt, based on:\n• Subjective feel per route (soft / solid / hard)\n• Number of attempts\n• Send success\n\nCloser to 1 = harder session, closer to 0 = easier.`
                )}
              </Text>
            </View>
            <View>
              <Text style={styles.sheetSectionTitle}>{tr("怎么看？", "How to Read")}</Text>
              <Text style={styles.sheetBodyText}>
                {tr(
                  "对比训练量和费劲程度的变化趋势，可以了解你的训练节奏是否合理。量大但不费劲说明积累充分，量小但费劲说明在挑战极限。",
                  "Compare volume and intensity trends to gauge your training rhythm. High volume + low intensity = solid base building. Low volume + high intensity = pushing limits."
                )}
              </Text>
            </View>
          </View>
        </ScrollView>
      </TrueSheet>
    </View>
  );
}

const createStyles = (colors: ReturnType<typeof useThemeColors>) => StyleSheet.create({
  chartCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 0,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  cardTitle: { fontSize: 16, fontFamily: "DMSans_700Bold", color: colors.chartTitle },
  segmentContainer: { flexDirection: "row", backgroundColor: colors.toggleBackground, borderRadius: 8, padding: 2 },
  segmentBtn: { paddingVertical: 4, paddingHorizontal: 12, borderRadius: 6 },
  segmentBtnActive: {
    backgroundColor: colors.toggleActiveBackground,
  },
  segmentText: { fontSize: 12, fontFamily: "DMSans_500Medium", color: colors.toggleInactiveText },
  segmentTextActive: { color: colors.toggleActiveText },
  typePill: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 12, borderWidth: 0 },
  typePillActive: { backgroundColor: colors.toggleActiveBackground },
  typePillInactive: { backgroundColor: colors.toggleBackground },
  typePillText: { fontSize: 11, fontFamily: "DMSans_500Medium", color: colors.toggleInactiveText },
  helpBtn: { padding: 2 },
  legendRow: { flexDirection: "row", flexWrap: "wrap", gap: 12, alignItems: "center" },
  legendTitle: { fontSize: 11, fontWeight: "700", fontFamily: theme.fonts.bold, color: colors.chartValue, marginRight: 4 },
  // TrueSheet help styles
  sheetHeader: {
    paddingHorizontal: 22,
    paddingTop: 26,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.cardBorder,
  },
  sheetHeaderTitle: {
    fontSize: 15,
    fontWeight: "600" as const,
    fontFamily: theme.fonts.bold,
    color: colors.textPrimary,
    textAlign: "center" as const,
  },
  sheetBody: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
    gap: 14,
  },
  sheetSectionTitle: {
    fontSize: 13,
    fontWeight: "700" as const,
    fontFamily: theme.fonts.bold,
    color: colors.chartTitle,
    marginBottom: 4,
  },
  sheetBodyText: {
    fontSize: 13,
    fontFamily: theme.fonts.regular,
    color: colors.chartValue,
    lineHeight: 20,
  },
});
