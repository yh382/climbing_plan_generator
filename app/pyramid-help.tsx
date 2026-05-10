// app/pyramid-help.tsx
// Native iOS formSheet route explaining the Grade Pyramid chart.
// Migrated from src/features/analysis/GradePyramid.tsx in-component
// TrueSheet (sheet-container-audit A1 Fix #1 round 2 — original plan missed
// this and TrainingVolumeChart help, only listed CSM help).

import React, { useEffect, useMemo } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "expo-router";
import { useThemeColors } from "@/lib/useThemeColors";
import { useSettings } from "@/contexts/SettingsContext";
import { theme } from "@/lib/theme";

export default function PyramidHelpRoute() {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const { tr } = useSettings();
  const navigation = useNavigation();
  const styles = useMemo(() => createStyles(colors), [colors]);

  useEffect(() => {
    navigation.setOptions({ title: tr("能力金字塔", "Grade Pyramid") });
  }, [navigation, tr]);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.body}>
        <Text style={styles.bodyText}>
          {tr(
            "能力金字塔反映了你的攀爬基础结构。",
            "The grade pyramid reflects the structure of your climbing foundation."
          )}
        </Text>
        <View style={styles.tipRow}>
          <View style={[styles.tipIcon, { backgroundColor: "rgba(48,110,111,0.15)" }]}>
            <Ionicons name="checkmark" size={12} color="#306E6F" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.tipTitle}>
              {tr("健康结构：正三角形", "Healthy: Triangle Shape")}
            </Text>
            <Text style={[styles.bodyText, { marginTop: 4 }]}>
              {tr(
                "底宽顶尖，说明有扎实的中低难度积累来支撑高难度突破。",
                "Wide base, narrow top — solid volume at lower grades supports harder breakthroughs."
              )}
            </Text>
          </View>
        </View>
        <View style={styles.tipRow}>
          <View style={[styles.tipIcon, { backgroundColor: "rgba(139,111,92,0.15)" }]}>
            <Ionicons name="warning-outline" size={12} color="#8B6F5C" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.tipTitle}>
              {tr("不健康结构：倒 T 型或柱状", "Unhealthy: Inverted-T or Column")}
            </Text>
            <Text style={[styles.bodyText, { marginTop: 4 }]}>
              {tr(
                "基础不稳，强行碰红线更容易导致受伤。建议多积累金字塔中下层路线。",
                "Weak base increases injury risk. Build more volume at mid-to-low grades."
              )}
            </Text>
          </View>
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
      gap: 14,
    },
    bodyText: {
      fontSize: 13,
      fontFamily: theme.fonts.regular,
      color: colors.textSecondary,
      lineHeight: 20,
    },
    tipRow: {
      flexDirection: "row",
      gap: 10,
    },
    tipIcon: {
      width: 20,
      height: 20,
      borderRadius: 4,
      alignItems: "center",
      justifyContent: "center",
    },
    tipTitle: {
      fontSize: 14,
      fontWeight: "700" as const,
      fontFamily: theme.fonts.bold,
      color: colors.textPrimary,
    },
  });
