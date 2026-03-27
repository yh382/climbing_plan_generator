import React, { useMemo, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useThemeColors } from "@/lib/useThemeColors";
import EditAnthropometricModal, { EditField } from "../modals/EditAnthropometricModal";
import { HeaderViewModel } from "../types";
import { computeApeIndexCm } from "../utils";

export default function AnthropometricCard({
  styles,
  profile,
  user,
}: {
  styles: any;
  profile: any;
  user: HeaderViewModel;
}) {
  const colors = useThemeColors();
  const anthropometrics = (profile as any)?.anthropometrics ?? null;

  const height =
    anthropometrics?.height ?? anthropometrics?.height_cm ?? user.bodyMetrics.height ?? null;
  const weight =
    anthropometrics?.weight ?? anthropometrics?.weight_kg ?? user.bodyMetrics.weight ?? null;
  const armSpan = anthropometrics?.arm_span ?? anthropometrics?.arm_span_cm ?? null;

  const apeIndexBackend =
    anthropometrics?.ape_index ?? anthropometrics?.ape_index_cm ?? user.bodyMetrics.apeIndex ?? null;

  const computedApeIndex = useMemo(() => {
    if (apeIndexBackend != null) return apeIndexBackend;
    return computeApeIndexCm(height, armSpan);
  }, [apeIndexBackend, height, armSpan]);

  const [editField, setEditField] = useState<EditField | null>(null);

  return (
    <>
      <TouchableOpacity
        style={styles.statCard}
        activeOpacity={0.9}
        onPress={() => setEditField("height")} // 点卡片默认进编辑
      >
        {/* Header */}
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Body Metrics</Text>
        </View>

        {/* Triple metrics row */}
        <View style={local.tripleRow}>
          <View style={local.tripleCol}>
            <Text style={styles.metricLabel}>HEIGHT</Text>
            <Text style={styles.metricValue}>
              {height ?? "—"}
              <Text style={styles.metricUnit}> cm</Text>
            </Text>
          </View>

          <View style={[local.vDivider, { backgroundColor: colors.divider }]} />

          <View style={local.tripleCol}>
            <Text style={styles.metricLabel}>WEIGHT</Text>
            <Text style={styles.metricValue}>
              {weight ?? "—"}
              <Text style={styles.metricUnit}> kg</Text>
            </Text>
          </View>

          <View style={[local.vDivider, { backgroundColor: colors.divider }]} />

          <View style={local.tripleCol}>
            <Text style={styles.metricLabel}>ARM SPAN</Text>
            <Text style={styles.metricValue}>
              {armSpan ?? "—"}
              <Text style={styles.metricUnit}> cm</Text>
            </Text>
          </View>
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Ape Index row */}
        <View style={styles.statRow}>
          <Text style={styles.statKey}>Ape Index</Text>
          <Text style={styles.statVal}>
            {computedApeIndex == null ? "—" : `${computedApeIndex} cm`}
          </Text>
        </View>
      </TouchableOpacity>

      <EditAnthropometricModal
        visible={!!editField}
        field={editField}
        current={{ height, weight, arm_span: armSpan }}
        onClose={() => setEditField(null)}
      />
    </>
  );
}

const local = StyleSheet.create({
  tripleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  tripleCol: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  vDivider: {
    width: 1,
    alignSelf: "stretch",
    backgroundColor: "rgba(0,0,0,0.06)",
  },
});
