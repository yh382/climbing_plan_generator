// src/features/mapscreen/components/FilterChipsBar.tsx
// BR Track D Day 6 — outdoor map filter chips (PLAN §8).
//
// 4 mutually-exclusive pill chips rendered as a horizontal row inside the
// RoutesListSheet pinned header (via `filterChipsSlot`). Backing state is
// the tiny `useOutdoorMapFiltersStore`; both `useViewportPins` (server
// filter) and `RoutesListSheet` (local wall-routes filter) read from it.
//
// Visual:
//   - Pill row, 32pt tall, scrollable horizontally (4 chips fit on most
//     screens but a future locale with longer copy can still pan)
//   - Selected chip: `colors.accent` background + white text
//   - Unselected: `colors.cardBackground` + `colors.textPrimary`
//
// Intentionally not built on `NativeSegmentedControl` — segment control
// can't render leading 🏔/V iconography per chip if we want to extend the
// shape in Day 7, and the pill row matches existing pill patterns
// (GymsSavedSpotsRow placeholder, ProfileSheet badges) better.

import React, { useMemo } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useSettings } from "../../../contexts/SettingsContext";
import { useThemeColors } from "../../../lib/useThemeColors";
import { theme } from "../../../lib/theme";
import useOutdoorMapFiltersStore, {
  type OutdoorMapFilter,
} from "../../../store/useOutdoorMapFiltersStore";

type ChipDef = {
  key: OutdoorMapFilter;
  labelZh: string;
  labelEn: string;
};

const CHIPS: ChipDef[] = [
  { key: "all", labelZh: "全部", labelEn: "All" },
  { key: "sport", labelZh: "运动", labelEn: "Sport" },
  { key: "trad", labelZh: "传统", labelEn: "Trad" },
  { key: "boulder", labelZh: "抱石", labelEn: "Boulder" },
];

export function FilterChipsBar() {
  const colors = useThemeColors();
  const { tr } = useSettings();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const selected = useOutdoorMapFiltersStore((s) => s.selected);
  const setSelected = useOutdoorMapFiltersStore((s) => s.setSelected);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {CHIPS.map((c) => {
        const active = selected === c.key;
        return (
          <TouchableOpacity
            key={c.key}
            onPress={() => setSelected(c.key)}
            activeOpacity={0.7}
            style={[styles.chip, active ? styles.chipActive : null]}
          >
            <Text
              style={[styles.chipText, active ? styles.chipTextActive : null]}
              numberOfLines={1}
            >
              {tr(c.labelZh, c.labelEn)}
            </Text>
          </TouchableOpacity>
        );
      })}
      <View style={{ width: 8 }} />
    </ScrollView>
  );
}

export default FilterChipsBar;

const createStyles = (c: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingRight: 8,
    },
    chip: {
      height: 32,
      paddingHorizontal: 14,
      borderRadius: 16,
      backgroundColor: c.backgroundSecondary,
      alignItems: "center",
      justifyContent: "center",
    },
    chipActive: {
      backgroundColor: c.accent,
    },
    chipText: {
      fontFamily: theme.fonts.medium,
      fontSize: 13,
      color: c.textPrimary,
      letterSpacing: -0.1,
    },
    chipTextActive: {
      color: "#FFFFFF",
    },
  });
