// src/features/activity/QuickInsightsRibbon.tsx
//
// TR7 Phase 2/3 — horizontal "mini stat" ribbon embedded as the first row
// inside Sessions / Training segments. Each card hands off to the full-
// screen Analysis page with a `focus` param so the user lands on the
// section they tapped, not the top of the page.
//
// Cards are caller-injected (so the two segments can show overlapping
// but-not-identical sets). All cards share the same shell — 160×100ish,
// 1 short label + 1 large value + optional sparkline-slot.

import React from "react";
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { theme } from "@/lib/theme";
import { useThemeColors } from "@/lib/useThemeColors";

import type { AnalysisFocusKey } from "../analysis/AnalysisScreen";

export interface InsightCard {
  /** Stable key — also the analysis focus target. Cards with no analysis
   *  destination can pass null and own their own `onPress` instead. */
  key: string;
  /** Where to land in the Analysis screen when tapped. */
  focus: AnalysisFocusKey | null;
  /** Localized one-liner shown small + uppercased above the value. */
  label: string;
  /** Localized big number / label. e.g. "V8" / "Push" / "12h". */
  value: string;
  /** Optional secondary line — usually a delta or units. */
  sub?: string;
  /** Optional tint applied to the value text + the accent dot. Defaults
   *  to textPrimary. Useful for CSM quadrant badges. */
  accent?: string;
  /** Optional Ionicon name shown top-left. */
  icon?: React.ComponentProps<typeof Ionicons>["name"];
  /** Override the default analysis push behavior; gives advanced cards
   *  freedom (e.g. plan adherence might link into the plan builder). */
  onPress?: () => void;
}

interface Props {
  cards: InsightCard[];
}

export default function QuickInsightsRibbon({ cards }: Props) {
  const router = useRouter();
  const colors = useThemeColors();
  const styles = React.useMemo(() => createStyles(colors), [colors]);

  if (!cards || cards.length === 0) return null;

  return (
    <FlatList
      data={cards}
      keyExtractor={(c) => c.key}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      ItemSeparatorComponent={() => <View style={{ width: 10 }} />}
      renderItem={({ item }) => {
        const handle = () => {
          if (item.onPress) {
            item.onPress();
            return;
          }
          if (item.focus) {
            router.push({ pathname: "/analysis", params: { focus: item.focus } } as any);
          }
        };
        const accent = item.accent ?? colors.textPrimary;
        return (
          <TouchableOpacity
            style={styles.card}
            onPress={handle}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={`${item.label} ${item.value}${item.sub ? " " + item.sub : ""}`}
          >
            <View style={styles.cardHeader}>
              {item.icon ? (
                <Ionicons
                  name={item.icon}
                  size={14}
                  color={colors.textTertiary}
                  style={{ marginRight: 4 }}
                />
              ) : null}
              <Text style={styles.cardLabel} numberOfLines={1}>
                {item.label}
              </Text>
            </View>
            <Text style={[styles.cardValue, { color: accent }]} numberOfLines={1}>
              {item.value}
            </Text>
            {item.sub ? (
              <Text style={styles.cardSub} numberOfLines={1}>
                {item.sub}
              </Text>
            ) : null}
          </TouchableOpacity>
        );
      }}
    />
  );
}

const createStyles = (colors: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    row: {
      paddingHorizontal: 16,
      paddingBottom: 12,
    },
    card: {
      width: 160,
      minHeight: 96,
      backgroundColor: colors.backgroundSecondary,
      borderRadius: theme.borderRadius.cardSmall,
      padding: 12,
      justifyContent: "space-between",
    },
    cardHeader: {
      flexDirection: "row",
      alignItems: "center",
    },
    cardLabel: {
      fontSize: 10,
      letterSpacing: 1.2,
      textTransform: "uppercase",
      color: colors.textTertiary,
      fontFamily: theme.fonts.bold,
    },
    cardValue: {
      fontSize: 24,
      fontFamily: theme.fonts.black,
      fontWeight: "900",
      letterSpacing: -0.5,
    },
    cardSub: {
      fontSize: 11,
      color: colors.textSecondary,
      fontFamily: theme.fonts.medium,
    },
  });
