// src/features/analysis/GradePyramid.tsx
import React, { useMemo, useState, useRef } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { TrueSheet } from "@lodev09/react-native-true-sheet";
import { GradePyramidNative } from "../../../modules/climmate-charts/src";
import useLogsStore from "../../store/useLogsStore";
import { buildFixedGradePyramid } from "../../services/stats";
import { useThemeColors } from "../../lib/useThemeColors";
import { theme } from "../../lib/theme";
import { useSettings } from "../../contexts/SettingsContext";

type TabType = "boulder" | "rope";

type GradePyramidComponentProps = {
  /** Set by AnalysisScreen carousel; flipping false→true re-fires the bar animation. */
  isActive?: boolean;
};

export default function GradePyramid({ isActive = true }: GradePyramidComponentProps = {}) {
  const colors = useThemeColors();
  const { tr } = useSettings();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { logs } = useLogsStore();
  const [activeTab, setActiveTab] = useState<TabType>("boulder");
  const helpRef = useRef<TrueSheet>(null);

  const pyramidData = useMemo(() => {
    const type = activeTab === "boulder" ? "boulder" : "lead";
    return buildFixedGradePyramid(logs, type);
  }, [logs, activeTab]);

  return (
    <View style={styles.chartCard}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{tr("能力金字塔", "Grade Pyramid")}</Text>

        <View style={styles.headerControls}>
          <View style={styles.toggleContainer}>
            <TouchableOpacity
              style={[styles.toggleBtn, activeTab === "boulder" && styles.toggleBtnActive]}
              onPress={() => setActiveTab("boulder")}
            >
              <Text style={[styles.toggleText, activeTab === "boulder" && styles.toggleTextActive]}>{tr("抱石", "Boulder")}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleBtn, activeTab === "rope" && styles.toggleBtnActive]}
              onPress={() => setActiveTab("rope")}
            >
              <Text style={[styles.toggleText, activeTab === "rope" && styles.toggleTextActive]}>{tr("绳攀", "Rope")}</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity onPress={() => helpRef.current?.present()} style={styles.helpBtn}>
            <Ionicons name="help-circle-outline" size={20} color={colors.chartLabel} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.chartContainer}
        nestedScrollEnabled
        showsVerticalScrollIndicator={false}
      >
        <GradePyramidNative
          data={pyramidData}
          climbType={activeTab === "boulder" ? "boulder" : "rope"}
          isActive={isActive}
        />
      </ScrollView>

      <TrueSheet
        ref={helpRef}
        detents={[0.4, 0.9]}
        backgroundColor={colors.sheetBackground}
        grabberOptions={{ height: 3, width: 36, topMargin: 6 }}
        dimmed
        dimmedDetentIndex={0}
      >
        <View style={styles.sheetHeader}>
          <Text style={styles.sheetHeaderTitle}>{tr("能力金字塔", "Grade Pyramid")}</Text>
        </View>
        <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          <View style={styles.sheetBody}>
            <Text style={styles.sheetBodyText}>
              {tr(
                "能力金字塔反映了你的攀爬基础结构。",
                "The grade pyramid reflects the structure of your climbing foundation."
              )}
            </Text>
            <View style={styles.sheetTipRow}>
              <View style={[styles.sheetTipIcon, { backgroundColor: 'rgba(48,110,111,0.15)' }]}>
                <Ionicons name="checkmark" size={12} color="#306E6F" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.sheetTipTitle}>
                  {tr("健康结构：正三角形", "Healthy: Triangle Shape")}
                </Text>
                <Text style={[styles.sheetBodyText, { marginTop: 4 }]}>
                  {tr(
                    "底宽顶尖，说明有扎实的中低难度积累来支撑高难度突破。",
                    "Wide base, narrow top — solid volume at lower grades supports harder breakthroughs."
                  )}
                </Text>
              </View>
            </View>
            <View style={styles.sheetTipRow}>
              <View style={[styles.sheetTipIcon, { backgroundColor: 'rgba(139,111,92,0.15)' }]}>
                <Ionicons name="warning-outline" size={12} color="#8B6F5C" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.sheetTipTitle}>
                  {tr("不健康结构：倒 T 型或柱状", "Unhealthy: Inverted-T or Column")}
                </Text>
                <Text style={[styles.sheetBodyText, { marginTop: 4 }]}>
                  {tr(
                    "基础不稳，强行碰红线更容易导致受伤。建议多积累金字塔中下层路线。",
                    "Weak base increases injury risk. Build more volume at mid-to-low grades."
                  )}
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </TrueSheet>
    </View>
  );
}

const createStyles = (colors: ReturnType<typeof useThemeColors>) => StyleSheet.create({
  chartCard: {
    flex: 1,
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 0,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontFamily: "DMSans_700Bold",
    color: colors.chartTitle,
  },
  headerControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  helpBtn: {
    padding: 4,
  },
  toggleContainer: {
    flexDirection: "row",
    backgroundColor: colors.toggleBackground,
    borderRadius: 8,
    padding: 2,
  },
  toggleBtn: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  toggleBtnActive: {
    backgroundColor: colors.toggleActiveBackground,
  },
  toggleText: {
    fontSize: 12,
    fontFamily: "DMSans_500Medium",
    color: colors.toggleInactiveText,
  },
  toggleTextActive: {
    color: colors.toggleActiveText,
  },
  chartContainer: {
    flex: 1,
    minHeight: 240,
  },
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
  sheetBodyText: {
    fontSize: 13,
    fontFamily: theme.fonts.regular,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  sheetTipRow: {
    flexDirection: "row" as const,
    gap: 10,
  },
  sheetTipIcon: {
    width: 20,
    height: 20,
    borderRadius: 4,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  sheetTipTitle: {
    fontSize: 14,
    fontWeight: "700" as const,
    fontFamily: theme.fonts.bold,
    color: colors.textPrimary,
  },
});
