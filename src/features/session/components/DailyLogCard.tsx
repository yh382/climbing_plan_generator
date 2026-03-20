// src/features/session/components/DailyLogCard.tsx
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
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
  const gc = getColorForGrade(maxGrade);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <View style={styles.header}>
        <Text style={styles.dateText}>{dateLabel}</Text>
        <Ionicons name="chevron-forward" size={16} color="#D1D5DB" />
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

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFF",
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    padding: 16,
    borderWidth: 0.6,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  dateText: { fontSize: 14, fontWeight: "600", color: "#374151" },
  grid: { flexDirection: "row", alignItems: "center" },
  item: { flex: 1, alignItems: "center" },
  val: { fontSize: 18, fontWeight: "800", color: "#111" },
  label: { fontSize: 11, color: "#9CA3AF", marginTop: 2 },
  divider: { width: 1, height: 24, backgroundColor: "#F3F4F6" },
  gradeRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  gradeDot: { width: 6, height: 6, borderRadius: 3 },
});
