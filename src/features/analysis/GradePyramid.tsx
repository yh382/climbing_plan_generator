// src/features/analysis/GradePyramid.tsx
import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import useLogsStore from "../../store/useLogsStore";
import SmartBottomSheet from "../community/components/SmartBottomSheet";
import { buildFixedGradePyramid } from "../../services/stats";

type TabType = "boulder" | "rope";

export default function GradePyramid() {
  const { logs } = useLogsStore();
  const [activeTab, setActiveTab] = useState<TabType>("boulder");

  const pyramidData = useMemo(() => {
    const type = activeTab === "boulder" ? "boulder" : "lead";
    return buildFixedGradePyramid(logs, type);
  }, [logs, activeTab]);

  const maxCount = useMemo(() => {
    if (pyramidData.length === 0) return 1;
    return Math.max(...pyramidData.map((d) => d.count));
  }, [pyramidData]);

  const [helpOpen, setHelpOpen] = useState(false);

  return (
    <View style={styles.chartCard}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>Grade Pyramid</Text>

        <View style={styles.headerControls}>
          <View style={styles.toggleContainer}>
            <TouchableOpacity
              style={[styles.toggleBtn, activeTab === "boulder" && styles.toggleBtnActive]}
              onPress={() => setActiveTab("boulder")}
            >
              <Text style={[styles.toggleText, activeTab === "boulder" && styles.toggleTextActive]}>Boulder</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleBtn, activeTab === "rope" && styles.toggleBtnActive]}
              onPress={() => setActiveTab("rope")}
            >
              <Text style={[styles.toggleText, activeTab === "rope" && styles.toggleTextActive]}>Rope</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity onPress={() => setHelpOpen(true)} style={styles.helpBtn}>
            <Ionicons name="help-circle-outline" size={20} color="#64748B" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.container}>
        <View style={styles.chartBody}>
          {pyramidData.map((item) => {
            const widthPct = maxCount > 0 ? Math.max(12, (item.count / maxCount) * 100) : 0;
            return (
              <View key={item.grade} style={styles.row}>
                <Text style={styles.gradeLabel}>{item.grade}</Text>
                <View style={styles.barTrack}>
                  {item.count > 0 ? (
                    <View
                      style={[
                        styles.bar,
                        {
                          width: `${widthPct}%`,
                          backgroundColor: item.color,
                          opacity: 0.9,
                        },
                      ]}
                    >
                      <Text style={styles.barCount}>{item.count}</Text>
                    </View>
                  ) : (
                    <View style={styles.emptyBar} />
                  )}
                </View>
              </View>
            );
          })}
        </View>
      </View>

      <SmartBottomSheet visible={helpOpen} onClose={() => setHelpOpen(false)} mode="list" title="Grade Pyramid">
        <View style={{ paddingHorizontal: 20, paddingBottom: 24, gap: 14 }}>
          <Text style={{ fontSize: 13, color: "#374151", lineHeight: 20 }}>
            能力金字塔反映了你的攀爬基础结构。
          </Text>
          <View>
            <Text style={{ fontSize: 13, fontWeight: "700", color: "#111", marginBottom: 4 }}>✅ 健康结构：正三角形（底宽顶尖）</Text>
            <Text style={{ fontSize: 13, color: "#374151", lineHeight: 20 }}>
              意味着你有扎实的中低难度积累来支撑高难度的突破。
            </Text>
          </View>
          <View>
            <Text style={{ fontSize: 13, fontWeight: "700", color: "#111", marginBottom: 4 }}>⚠️ 不健康结构：倒T型或柱状</Text>
            <Text style={{ fontSize: 13, color: "#374151", lineHeight: 20 }}>
              说明基础不稳，强行磕红线更容易导致受伤。建议多积累金字塔中下层的路线来加固基础。
            </Text>
          </View>
        </View>
      </SmartBottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  chartCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 0.5,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1E293B",
  },
  headerControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  helpBtn: {
    padding: 4,
  },
  toggleContainer: {
    flexDirection: "row",
    backgroundColor: "#F3F4F6",
    borderRadius: 8,
    padding: 2,
  },
  toggleBtn: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  toggleBtnActive: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
  toggleText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
  },
  toggleTextActive: {
    color: "#111827",
  },
  container: {
    width: "100%",
    paddingTop: 8,
  },
  chartBody: {
    width: "100%",
    paddingHorizontal: 10,
  },
  emptyContainer: {
    height: 100,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    color: "#9CA3AF",
    fontSize: 13,
    fontStyle: "italic",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
    width: "100%",
  },
  gradeLabel: {
    width: 40,
    textAlign: "right",
    fontSize: 11,
    fontWeight: "600",
    color: "#64748B",
    marginRight: 8,
  },
  barTrack: {
    flex: 1,
    alignItems: "flex-start",
  },
  bar: {
    height: 22,
    borderRadius: 4,
    justifyContent: "center",
    alignItems: "center",
    minWidth: 24,
  },
  barCount: {
    color: "#FFF",
    fontSize: 11,
    fontWeight: "700",
  },
  emptyBar: {
    height: 22,
    width: 4,
    borderRadius: 2,
    backgroundColor: "#E5E7EB",
  },
});
