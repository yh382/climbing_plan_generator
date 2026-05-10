// src/features/analysis/GradePyramid.tsx
import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { GradePyramidNative } from "../../../modules/climmate-charts/src";
import useLogsStore from "../../store/useLogsStore";
import { buildFixedGradePyramid } from "../../services/stats";
import { useThemeColors } from "../../lib/useThemeColors";
import { useSettings } from "../../contexts/SettingsContext";

type TabType = "boulder" | "rope";

type GradePyramidComponentProps = {
  /** Set by AnalysisScreen carousel; flipping false→true re-fires the bar animation. */
  isActive?: boolean;
};

export default function GradePyramid({ isActive = true }: GradePyramidComponentProps = {}) {
  const colors = useThemeColors();
  const { tr } = useSettings();
  const router = useRouter();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { logs } = useLogsStore();
  const [activeTab, setActiveTab] = useState<TabType>("boulder");

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

          <TouchableOpacity onPress={() => router.push("/pyramid-help")} style={styles.helpBtn}>
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
});
