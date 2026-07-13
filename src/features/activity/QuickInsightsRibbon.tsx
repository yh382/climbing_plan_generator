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
import { FlatList, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { theme } from "@/lib/theme";
import { useThemeColors } from "@/lib/useThemeColors";
import PressableScale from "@/components/ui/PressableScale";

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
      ItemSeparatorComponent={() => <View style={styles.separator} />}
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
        // DL v1 §2.3 — data is typography: no grey card shells; mono values,
        // micro labels, vertical hairlines between entries.
        return (
          <PressableScale
            style={styles.card}
            onPress={handle}
            accessibilityRole="button"
            accessibilityLabel={`${item.label} ${item.value}${item.sub ? " " + item.sub : ""}`}
          >
            <View style={styles.cardHeader}>
              {item.icon ? (
                <Ionicons
                  name={item.icon}
                  size={12}
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
          </PressableScale>
        );
      }}
    />
  );
}

const createStyles = (colors: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    row: {
      paddingHorizontal: 16,
      paddingTop: 6,
      paddingBottom: 14,
    },
    card: {
      minWidth: 104,
      justifyContent: "flex-start",
    },
    separator: {
      width: StyleSheet.hairlineWidth,
      backgroundColor: colors.border,
      marginHorizontal: 16,
      marginVertical: 4,
    },
    cardHeader: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 7,
    },
    cardLabel: {
      ...theme.textStyles.microLabel,
      color: colors.textTertiary,
    },
    cardValue: {
      ...theme.textStyles.monoValue,
      fontSize: 22,
    },
    cardSub: {
      fontSize: 11,
      marginTop: 4,
      color: colors.textSecondary,
      fontFamily: theme.fonts.regular,
    },
  });
