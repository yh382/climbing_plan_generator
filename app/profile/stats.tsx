import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

type YearStats = {
  year: number;
  boulder: string;
  route: string;
  sends: number;
  monthlySends: number[]; // length 12
  highlights: { label: string; value: string }[];
};

// 先用 mock：后续你接后端时，把这里换成真实数据即可
const MOCK: YearStats[] = [
  {
    year: 2026,
    boulder: "V6",
    route: "5.12a",
    sends: 72,
    monthlySends: [2, 3, 6, 5, 8, 7, 9, 10, 6, 7, 6, 3],
    highlights: [
      { label: "Best Boulder", value: "V7" },
      { label: "Best Route", value: "5.12b" },
      { label: "Flash", value: "V5 / 5.11d" },
    ],
  },
  {
    year: 2025,
    boulder: "V5",
    route: "5.11d",
    sends: 54,
    monthlySends: [1, 2, 4, 4, 6, 5, 7, 8, 5, 6, 4, 2],
    highlights: [
      { label: "Best Boulder", value: "V6" },
      { label: "Best Route", value: "5.12a" },
      { label: "Flash", value: "V4 / 5.11c" },
    ],
  },
  {
    year: 2024,
    boulder: "V4",
    route: "5.11b",
    sends: 38,
    monthlySends: [0, 1, 3, 3, 5, 4, 6, 5, 4, 3, 3, 1],
    highlights: [
      { label: "Best Boulder", value: "V5" },
      { label: "Best Route", value: "5.11d" },
      { label: "Flash", value: "V3 / 5.11a" },
    ],
  },
];

export default function ProfileStatsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const years = useMemo(() => MOCK.map((x) => x.year), []);
  const [year, setYear] = useState<number>(years[0]);

  const data = useMemo(() => MOCK.find((x) => x.year === year) ?? MOCK[0], [year]);

  const maxMonthly = useMemo(() => Math.max(1, ...data.monthlySends), [data.monthlySends]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Topbar */}
      <View style={styles.topbar}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()} activeOpacity={0.75}>
          <Ionicons name="chevron-back" size={24} color="#111" />
        </TouchableOpacity>

        <Text style={styles.topbarTitle}>Stats</Text>

        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 28 }}
      >
        {/* Year selector */}
        <View style={styles.sectionPad}>
          <Text style={styles.h1}>Yearly overview</Text>
          <View style={styles.yearRow}>
            {years.map((y) => {
              const active = y === year;
              return (
                <TouchableOpacity
                  key={y}
                  style={[styles.yearChip, active && styles.yearChipActive]}
                  onPress={() => setYear(y)}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.yearChipText, active && styles.yearChipTextActive]}>{y}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Summary card */}
        <View style={styles.sectionPad}>
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.cardTitle}>{data.year} Stats</Text>
              <Text style={styles.cardSub}>Season summary</Text>
            </View>

            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statVal}>{data.boulder}</Text>
                <Text style={styles.statLabel}>Boulder</Text>
              </View>

              <View style={styles.dividerV} />

              <View style={styles.statItem}>
                <Text style={styles.statVal}>{data.route}</Text>
                <Text style={styles.statLabel}>Route</Text>
              </View>

              <View style={styles.dividerV} />

              <View style={styles.statItem}>
                <Text style={styles.statVal}>{data.sends}</Text>
                <Text style={styles.statLabel}>Sends</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Monthly sends chart (simple bars placeholder) */}
        <View style={styles.sectionPad}>
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.cardTitle}>Monthly sends</Text>
              <Text style={styles.cardSub}>Jan–Dec</Text>
            </View>

            <View style={styles.chartWrap}>
              {data.monthlySends.map((v, idx) => {
                const h = Math.max(4, Math.round((v / maxMonthly) * 64));
                return (
                  <View key={idx} style={styles.barCol}>
                    <View style={[styles.bar, { height: h }]} />
                    <Text style={styles.barLabel}>
                      {["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"][idx]}
                    </Text>
                  </View>
                );
              })}
            </View>

            <Text style={styles.noteText}>
              Later we can replace this with a real chart (or a calendar heatmap) once the data endpoint is ready.
            </Text>
          </View>
        </View>

        {/* Highlights */}
        <View style={styles.sectionPad}>
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.cardTitle}>Highlights</Text>
              <Text style={styles.cardSub}>Best efforts</Text>
            </View>

            <View style={{ marginTop: 6 }}>
              {data.highlights.map((h, i) => (
                <View key={i} style={[styles.highlightRow, i !== 0 && styles.highlightRowBorder]}>
                  <Text style={styles.highlightLabel}>{h.label}</Text>
                  <Text style={styles.highlightValue}>{h.value}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Placeholder for future */}
        <View style={styles.sectionPad}>
          <View style={[styles.card, { opacity: 0.95 }]}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.cardTitle}>Coming next</Text>
              <Text style={styles.cardSub}>Roadmap</Text>
            </View>

            <View style={{ marginTop: 8, gap: 10 }}>
              <View style={styles.todoPill}>
                <Ionicons name="sparkles-outline" size={16} color="#111827" />
                <Text style={styles.todoText}>Grade distribution (V / YDS) and trend lines</Text>
              </View>
              <View style={styles.todoPill}>
                <Ionicons name="calendar-outline" size={16} color="#111827" />
                <Text style={styles.todoText}>Calendar heatmap + session consistency</Text>
              </View>
              <View style={styles.todoPill}>
                <Ionicons name="podium-outline" size={16} color="#111827" />
                <Text style={styles.todoText}>Top 10 sends + flash rate</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },

  topbar: {
    height: 44,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  iconBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  topbarTitle: { fontSize: 17, fontWeight: "800", color: "#111" },

  sectionPad: { paddingHorizontal: 16, paddingTop: 14 },

  h1: { fontSize: 28, fontWeight: "900", color: "#111", letterSpacing: -0.2 },
  yearRow: { flexDirection: "row", gap: 8, marginTop: 10 },

  yearChip: {
    paddingHorizontal: 12,
    height: 32,
    borderRadius: 999,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  yearChipActive: { backgroundColor: "#111827" },
  yearChipText: { fontSize: 13, fontWeight: "800", color: "#111827" },
  yearChipTextActive: { color: "#FFFFFF" },

  card: {
    backgroundColor: "#F3F4F6",
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  cardHeaderRow: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" },
  cardTitle: { fontSize: 14, fontWeight: "900", color: "#111827" },
  cardSub: { fontSize: 12, color: "#6B7280", fontWeight: "700" },

  statsRow: { flexDirection: "row", alignItems: "center", marginTop: 12 },
  statItem: { flex: 1, alignItems: "center" },
  statVal: { fontSize: 18, fontWeight: "900", color: "#111827" },
  statLabel: { marginTop: 2, fontSize: 11, color: "#6B7280", fontWeight: "700" },
  dividerV: { width: 1, height: 20, backgroundColor: "#E5E7EB" },

  chartWrap: {
    marginTop: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingHorizontal: 4,
    paddingBottom: 6,
  },
  barCol: { width: 18, alignItems: "center", justifyContent: "flex-end" },
  bar: {
    width: 10,
    borderRadius: 999,
    backgroundColor: "#111827",
    opacity: 0.85,
  },
  barLabel: { marginTop: 6, fontSize: 10, color: "#6B7280", fontWeight: "800" },

  noteText: { marginTop: 10, fontSize: 12, color: "#6B7280", lineHeight: 16 },

  highlightRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 10 },
  highlightRowBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "#E5E7EB" },
  highlightLabel: { fontSize: 13, color: "#6B7280", fontWeight: "800" },
  highlightValue: { fontSize: 13, color: "#111827", fontWeight: "900" },

  todoPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#E5E7EB",
  },
  todoText: { flex: 1, fontSize: 13, color: "#111827", fontWeight: "800", lineHeight: 16 },
});
