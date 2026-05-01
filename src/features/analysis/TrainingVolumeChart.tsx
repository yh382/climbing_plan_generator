// src/features/analysis/TrainingVolumeChart.tsx
import React, { useMemo, useState, useEffect, useRef } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { TrueSheet } from "@lodev09/react-native-true-sheet";
import { TrainingVolumeChartNative } from "../../../modules/climmate-charts/src";
import { useVolumeSlots, type LogType, type TimeRange } from "./useVolumeSlots";
import { useThemeColors } from "../../lib/useThemeColors";
import { theme } from "../../lib/theme";
import { useSettings } from "../../contexts/SettingsContext";
import useLogsStore from "../../store/useLogsStore";
import {
  backfillIntensityData,
  type DailyIntensityStore,
} from "../../services/stats/intensityCalculator";

const TIME_RANGES: TimeRange[] = ["W", "M", "Y"];

// Legend palette must mirror Swift TrainingVolumeChartView.
const BOULDER_COLORS = { easy: "#BBBBBB", mid: "#888888", hard: "#555555", elite: "#1C1C1E" };
const ROPE_COLORS = {
  beginner: "#BBBBBB",
  intermediate: "#888888",
  advanced: "#555555",
  expert: "#333333",
  elite: "#1C1C1E",
};
const INTENSITY_COLOR = "#306E6F";

const LegendDot = ({ color, label }: { color: string; label: string }) => {
  const colors = useThemeColors();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: color }} />
      <Text style={{ fontSize: 10, color: colors.chartLabel }}>{label}</Text>
    </View>
  );
};

type TrainingVolumeChartComponentProps = {
  /** Set by AnalysisScreen carousel; flipping false→true re-fires the bars animation. */
  isActive?: boolean;
};

export default function TrainingVolumeChart({ isActive = true }: TrainingVolumeChartComponentProps = {}) {
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
    backfillIntensityData(uniqueDates).then(setIntensityData).catch(() => {});
  }, [logs]);

  const toggleType = (type: LogType) => {
    if (selectedTypes.includes(type)) {
      if (selectedTypes.length > 1) setSelectedTypes(selectedTypes.filter((t) => t !== type));
    } else {
      setSelectedTypes([...selectedTypes, type]);
    }
  };

  const slots = useVolumeSlots(logs, intensityData, timeRange, selectedTypes);

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
              <Text style={[styles.typePillText, selectedTypes.includes("boulder") && { color: colors.toggleActiveText }]}>
                {tr("抱石", "Boulder")}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => toggleType("rope")}
              style={[styles.typePill, selectedTypes.includes("rope") ? styles.typePillActive : styles.typePillInactive]}
            >
              <Text style={[styles.typePillText, selectedTypes.includes("rope") && { color: colors.toggleActiveText }]}>
                {tr("绳攀", "Rope")}
              </Text>
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

      <View style={styles.chartContainer}>
        <TrainingVolumeChartNative
          slots={slots}
          showBoulder={selectedTypes.includes("boulder")}
          showRope={selectedTypes.includes("rope")}
          isActive={isActive}
        />
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
              <Text style={styles.sheetSectionTitle}>{tr("费劲程度（虚线, 0-1）", "Intensity (dashed line, 0-1)")}</Text>
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
  segmentBtnActive: { backgroundColor: colors.toggleActiveBackground },
  segmentText: { fontSize: 12, fontFamily: "DMSans_500Medium", color: colors.toggleInactiveText },
  segmentTextActive: { color: colors.toggleActiveText },
  typePill: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 12, borderWidth: 0 },
  typePillActive: { backgroundColor: colors.toggleActiveBackground },
  typePillInactive: { backgroundColor: colors.toggleBackground },
  typePillText: { fontSize: 11, fontFamily: "DMSans_500Medium", color: colors.toggleInactiveText },
  helpBtn: { padding: 2 },
  chartContainer: { marginTop: 12 },
  legendRow: { flexDirection: "row", flexWrap: "wrap", gap: 12, alignItems: "center" },
  legendTitle: { fontSize: 11, fontWeight: "700", fontFamily: theme.fonts.bold, color: colors.chartValue, marginRight: 4 },
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
  sheetBody: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24, gap: 14 },
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
