// src/features/outdoor/components/GradeRangeSheet.tsx
// TrueSheet for picking a grade range (YDS + V-scale). Two-tap min/max selection.

import { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { TrueSheet } from "@lodev09/react-native-true-sheet";
import { useThemeColors } from "../../../lib/useThemeColors";
import { theme } from "../../../lib/theme";
import { useSettings } from "../../../contexts/SettingsContext";

export type GradeRange = {
  min: string | null;
  max: string | null;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  onApply: (range: GradeRange) => void;
  initial: GradeRange;
  /** "yds" for roped grades, "v" for boulder. If omitted, shows both lists. */
  system?: "yds" | "v";
};

const YDS = [
  "5.5","5.6","5.7","5.8","5.9",
  "5.10a","5.10b","5.10c","5.10d",
  "5.11a","5.11b","5.11c","5.11d",
  "5.12a","5.12b","5.12c","5.12d",
  "5.13a","5.13b","5.13c","5.13d",
  "5.14a","5.14b","5.14c","5.14d",
  "5.15a","5.15b","5.15c",
];
const V = ["V0","V1","V2","V3","V4","V5","V6","V7","V8","V9","V10","V11","V12","V13","V14","V15","V16"];

export default function GradeRangeSheet({ visible, onClose, onApply, initial, system }: Props) {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const { tr } = useSettings();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const sheetRef = useRef<TrueSheet>(null);
  const isPresented = useRef(false);

  const [minG, setMinG] = useState<string | null>(initial.min);
  const [maxG, setMaxG] = useState<string | null>(initial.max);

  useEffect(() => {
    if (visible && !isPresented.current) {
      sheetRef.current?.present();
      isPresented.current = true;
      setMinG(initial.min);
      setMaxG(initial.max);
    } else if (!visible && isPresented.current) {
      sheetRef.current?.dismiss();
      isPresented.current = false;
    }
  }, [visible, initial]);

  const grades = system === "v" ? V : YDS;

  const handlePick = (g: string) => {
    // If no min → set min. If no max → set max (must be >= min). Else reset min.
    if (minG === null || (minG !== null && maxG !== null)) {
      setMinG(g);
      setMaxG(null);
      return;
    }
    // minG set, maxG null
    const minIdx = grades.indexOf(minG);
    const gIdx = grades.indexOf(g);
    if (gIdx < minIdx) {
      setMinG(g);
      setMaxG(minG);
    } else {
      setMaxG(g);
    }
  };

  const inRange = (g: string) => {
    if (minG === null || maxG === null) return g === minG;
    const i = grades.indexOf(g);
    return i >= grades.indexOf(minG) && i <= grades.indexOf(maxG);
  };

  const handleApply = () => {
    onApply({ min: minG, max: maxG ?? minG });
    onClose();
  };

  const handleClear = () => {
    setMinG(null);
    setMaxG(null);
    onApply({ min: null, max: null });
    onClose();
  };

  return (
    <TrueSheet
      ref={sheetRef}
      detents={["auto"]}
      backgroundColor={colors.sheetBackground}
      grabberOptions={{ height: 3, width: 36, topMargin: 6 }}
      dimmed
      onDidDismiss={() => {
        isPresented.current = false;
        onClose();
      }}
    >
      <View style={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: insets.bottom + 20 }}>
        <Text style={styles.title}>{tr("难度范围", "Grade Range")}</Text>
        <Text style={styles.hint}>
          {minG === null
            ? tr("点击选择最低难度", "Tap to pick minimum")
            : maxG === null
            ? tr("点击选择最高难度", "Tap to pick maximum")
            : `${minG} — ${maxG}`}
        </Text>

        <ScrollView style={{ maxHeight: 340 }} contentContainerStyle={styles.gridWrap}>
          {grades.map((g) => {
            const active = inRange(g);
            return (
              <TouchableOpacity
                key={g}
                style={[styles.gridBtn, active && styles.gridBtnActive]}
                onPress={() => handlePick(g)}
                activeOpacity={0.7}
              >
                <Text style={[styles.gridText, active && styles.gridTextActive]}>{g}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity style={[styles.footerBtn, { backgroundColor: colors.sheetCardBackground }]} onPress={handleClear}>
            <Text style={[styles.footerText, { color: colors.textPrimary }]}>{tr("清除", "Clear")}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.footerBtn, { backgroundColor: colors.pillBackground }]}
            onPress={handleApply}
            disabled={minG === null}
          >
            <Text style={[styles.footerText, { color: colors.pillText }]}>
              {tr("应用", "Apply")}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </TrueSheet>
  );
}

const createStyles = (c: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    title: {
      fontFamily: theme.fonts.bold,
      fontSize: 18,
      color: c.textPrimary,
      textAlign: "center",
    },
    hint: {
      fontFamily: theme.fonts.regular,
      fontSize: 13,
      color: c.textSecondary,
      textAlign: "center",
      marginTop: 4,
      marginBottom: 14,
    },
    gridWrap: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      paddingBottom: 12,
    },
    gridBtn: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 10,
      backgroundColor: c.sheetCardBackground,
    },
    gridBtnActive: { backgroundColor: c.accent },
    gridText: {
      fontFamily: theme.fonts.medium,
      fontSize: 13,
      color: c.textPrimary,
    },
    gridTextActive: { color: "#FFFFFF" },
    footer: { flexDirection: "row", gap: 10, marginTop: 12 },
    footerBtn: {
      flex: 1,
      height: 46,
      borderRadius: 23,
      alignItems: "center",
      justifyContent: "center",
    },
    footerText: {
      fontFamily: theme.fonts.bold,
      fontSize: 14,
      letterSpacing: 0.5,
      textTransform: "uppercase",
    },
  });
