// src/features/profile/components/basicinfo/cards/FingerStrengthCard.tsx

import React, { useMemo, useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import EditFingerStrengthModal from "../modals/EditFingerStrengthModal";
import { HeaderViewModel, FingerStrength } from "../types";
import { computeFSI, formatGrip } from "../utils";

export default function FingerStrengthCard({
  styles,
  profile,
  user,
}: {
  styles: any;
  profile: any;
  user: HeaderViewModel;
}) {
  const anthropometrics = (profile as any)?.anthropometrics ?? null;
  const bodyWeight =
    anthropometrics?.weight ?? anthropometrics?.weight_kg ?? user.bodyMetrics.weight ?? null;

  const finger: FingerStrength | null = (profile as any)?.finger_strength ?? null;

  const fsi = useMemo(() => computeFSI(bodyWeight, finger), [bodyWeight, finger]);

  const summary = useMemo(() => {
    if (!finger?.edge_mm || !finger?.grip) return "Tap to assess";
    return `Based on ${finger.edge_mm}mm • ${formatGrip(finger.grip)}`;
  }, [finger?.edge_mm, finger?.grip]);

  const addedKg =
    (finger as any)?.added_weight_kg ??
    (finger as any)?.added_kg ??
    null;

  const [open, setOpen] = useState(false);

  return (
    <>
      <TouchableOpacity style={styles.statCard} activeOpacity={0.9} onPress={() => setOpen(true)}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Finger Strength</Text>
          <MaterialCommunityIcons name="hand-back-left-outline" size={18} color="#666" />
        </View>

        <View style={styles.statRow}>
          <Text style={styles.statKey}>Finger Strength Index</Text>
          <Text style={styles.statVal}>{fsi == null ? "—" : fsi.toFixed(2)}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.statRow}>
          <Text style={styles.statKey}>Reference</Text>
          <Text style={[styles.statVal, { color: finger?.edge_mm ? "#111" : "#999" }]}>{summary}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.statRow}>
          <Text style={styles.statKey}>Added Weight</Text>
          <Text style={styles.statVal}>
            {addedKg == null ? "—" : `${addedKg >= 0 ? "+" : ""}${addedKg} kg`}
          </Text>
        </View>
      </TouchableOpacity>

      <EditFingerStrengthModal
        visible={open}
        onClose={() => setOpen(false)}
        bodyWeightKg={bodyWeight}
        current={finger}
      />
    </>
  );
}

