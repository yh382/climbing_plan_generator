// src/features/session/components/DailyLogCard.tsx
import { useMemo } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "@/lib/theme";
import { useThemeColors } from "@/lib/useThemeColors";
import { getColorForGrade } from "../../../../lib/gradeColors";

interface Props {
  dateLabel: string;
  duration: string;
  climbs: number;
  sends: number;
  maxGrade: string;
  onPress: () => void;
}

export default function DailyLogCard({ dateLabel, duration, climbs, sends, maxGrade, onPress }: Props) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const gc = getColorForGrade(maxGrade);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <View style={styles.header}>
        <Text style={styles.dateText}>{dateLabel}</Text>
        <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
      </View>

      <View style={styles.grid}>
        <View style={styles.item}>
          <Text style={styles.val}>{duration}</Text>
          <Text style={styles.label}>Duration</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.item}>
          <Text style={styles.val}>{climbs}</Text>
          <Text style={styles.label}>Climbs</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.item}>
          <Text style={styles.val}>{sends}</Text>
          <Text style={styles.label}>Sends</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.item}>
          <View style={styles.gradeRow}>
            <View style={[styles.gradeDot, { backgroundColor: gc }]} />
            <Text style={styles.val}>{maxGrade}</Text>
          </View>
          <Text style={styles.label}>Best</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const createStyles = (colors: ReturnType<typeof useThemeColors>) => StyleSheet.create({
  card: {
    backgroundColor: colors.backgroundSecondary,
    marginHorizontal: theme.spacing.screenPadding,
    marginBottom: 12,
    borderRadius: theme.borderRadius.card,
    padding: 16,
  },
  header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  dateText: { fontSize: 14, fontWeight: "600", fontFamily: theme.fonts.medium, color: colors.textPrimary },
  grid: { flexDirection: "row", alignItems: "center" },
  item: { flex: 1, alignItems: "center" },
  val: { fontSize: 18, fontWeight: "800", fontFamily: theme.fonts.monoMedium, color: colors.textPrimary },
  label: { fontSize: theme.typography.caption.fontSize, fontFamily: theme.fonts.regular, color: colors.textTertiary, marginTop: 2 },
  divider: { width: 1, height: 24, backgroundColor: colors.border },
  gradeRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  gradeDot: { width: 6, height: 6, borderRadius: 3 },
});
