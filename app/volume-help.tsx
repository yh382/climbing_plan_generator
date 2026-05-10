// app/volume-help.tsx
// Native iOS formSheet route explaining the Training Volume chart.
// Migrated from src/features/analysis/TrainingVolumeChart.tsx in-component
// TrueSheet (sheet-container-audit A1 Fix #1 round 2 — original plan missed
// this and GradePyramid help, only listed CSM help).

import React, { useEffect, useMemo } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "expo-router";
import { useThemeColors } from "@/lib/useThemeColors";
import { useSettings } from "@/contexts/SettingsContext";
import { theme } from "@/lib/theme";

export default function VolumeHelpRoute() {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const { tr } = useSettings();
  const navigation = useNavigation();
  const styles = useMemo(() => createStyles(colors), [colors]);

  useEffect(() => {
    navigation.setOptions({ title: tr("训练量", "Training Volume") });
  }, [navigation, tr]);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.body}>
        <View>
          <Text style={styles.sectionTitle}>{tr("训练量柱状图", "Volume Bar Chart")}</Text>
          <Text style={styles.bodyText}>
            {tr(
              "展示你每天/每周/每月的攀登次数，按难度等级分颜色堆叠。",
              "Shows your daily/weekly/monthly climb count, color-stacked by grade category."
            )}
          </Text>
        </View>
        <View>
          <Text style={styles.sectionTitle}>{tr("费劲程度（虚线, 0-1）", "Intensity (dashed line, 0-1)")}</Text>
          <Text style={styles.bodyText}>
            {tr(
              `综合反映每次训练的费劲程度，基于：\n• 你对路线难度的主观感受（soft / solid / hard）\n• 每条路线的尝试次数\n• 完攀情况\n\n数值越接近 1 代表这次训练越费劲，越接近 0 代表越轻松。`,
              `Reflects how hard each session felt, based on:\n• Subjective feel per route (soft / solid / hard)\n• Number of attempts\n• Send success\n\nCloser to 1 = harder session, closer to 0 = easier.`
            )}
          </Text>
        </View>
        <View>
          <Text style={styles.sectionTitle}>{tr("怎么看？", "How to Read")}</Text>
          <Text style={styles.bodyText}>
            {tr(
              "对比训练量和费劲程度的变化趋势，可以了解你的训练节奏是否合理。量大但不费劲说明积累充分，量小但费劲说明在挑战极限。",
              "Compare volume and intensity trends to gauge your training rhythm. High volume + low intensity = solid base building. Low volume + high intensity = pushing limits."
            )}
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const createStyles = (colors: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    body: {
      paddingHorizontal: 20,
      paddingTop: 16,
      gap: 16,
    },
    sectionTitle: {
      fontSize: 13,
      fontWeight: "700" as const,
      fontFamily: theme.fonts.bold,
      color: colors.chartTitle,
      marginBottom: 6,
    },
    bodyText: {
      fontSize: 13,
      fontFamily: theme.fonts.regular,
      color: colors.chartValue,
      lineHeight: 20,
    },
  });
