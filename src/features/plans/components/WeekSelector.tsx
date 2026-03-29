// src/features/plans/components/WeekSelector.tsx

import { useMemo } from "react";
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from "react-native";
import { useThemeColors } from "../../../lib/useThemeColors";

interface Props {
  totalWeeks: number;
  selectedWeek: number;
  onSelectWeek: (w: number) => void;
  /** Number of sessions per week — used to render green dots */
  sessionCounts?: Record<number, number>;
}

export function WeekSelector({ totalWeeks, selectedWeek, onSelectWeek, sessionCounts }: Props) {
  const colors = useThemeColors();
  const s = useMemo(() => createStyles(colors), [colors]);
  const weeks = Array.from({ length: totalWeeks }, (_, i) => i + 1);

  return (
    <View style={s.wrapper}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.content}
      >
        {weeks.map((w) => {
          const isActive = w === selectedWeek;
          const dotCount = Math.min(sessionCounts?.[w] ?? 0, 6);
          return (
            <TouchableOpacity
              key={w}
              style={[s.pill, isActive && s.pillActive]}
              onPress={() => onSelectWeek(w)}
              activeOpacity={0.7}
            >
              <Text style={[s.pillText, isActive && s.pillTextActive]}>W{w}</Text>
              {dotCount > 0 ? (
                <View style={s.dotsRow}>
                  {Array.from({ length: dotCount }).map((_, i) => (
                    <View
                      key={i}
                      style={[s.dot, isActive && s.dotActive]}
                    />
                  ))}
                </View>
              ) : null}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

type Colors = ReturnType<typeof useThemeColors>;

const createStyles = (colors: Colors) => StyleSheet.create({
  wrapper: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.divider },
  content: { paddingHorizontal: 16, gap: 8 },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: colors.cardBackground,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  pillActive: { backgroundColor: colors.pillBackground },
  pillText: { fontSize: 13, fontWeight: "700", color: colors.textSecondary },
  pillTextActive: { color: colors.pillText },
  dotsRow: { flexDirection: "row", gap: 3 },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.borderTertiary },
  dotActive: { backgroundColor: "#306E6F" },
});
