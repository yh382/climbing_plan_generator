import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function DailyLogHeader({
  ring,
  displayDate,
  gymName,
  totalSends,
  isPublicView,
  sidePad = 16,
}: {
  ring: React.ReactNode;
  displayDate: string;
  gymName?: string;
  totalSends: number;
  isPublicView: boolean;
  sidePad?: number;
}) {
  return (
    <View style={{ paddingBottom: 10 }}>
      <View style={{ paddingHorizontal: sidePad, paddingTop: 10, paddingBottom: 12, alignItems: "center" }}>
        {ring}
      </View>

      <View style={{ paddingHorizontal: sidePad }}>
        <View style={styles.summaryHeader}>
          <View>
            <Text style={styles.dateTitle}>{displayDate}</Text>
            <Text style={styles.locationSub}>📍 {gymName || "Gym"}</Text>
          </View>

          <View style={styles.summaryStats}>
            <Text style={styles.totalText}>{totalSends} Sends</Text>
            <Text style={styles.durationText}>Session Total</Text>
          </View>
        </View>

        {isPublicView ? (
          <View style={styles.publicHint}>
            <Ionicons name="eye-outline" size={14} color="#6B7280" />
            <Text style={styles.publicHintText}>Viewing shared log</Text>
          </View>
        ) : null}
      </View>

      <View style={{ height: 12 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  summaryHeader: {
    backgroundColor: "#FFF",
    padding: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  dateTitle: { fontSize: 20, fontWeight: "800", color: "#111" },
  locationSub: { fontSize: 13, color: "#6B7280", marginTop: 4 },
  summaryStats: { alignItems: "flex-end" },
  totalText: { fontSize: 16, fontWeight: "700", color: "#111" },
  durationText: { fontSize: 12, color: "#9CA3AF" },

  publicHint: {
    marginTop: 10,
    backgroundColor: "#F3F4F6",
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
  },
  publicHintText: { fontSize: 12, fontWeight: "800", color: "#6B7280" },
});
