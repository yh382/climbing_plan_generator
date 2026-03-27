import React, { useMemo, useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useThemeColors } from "@/lib/useThemeColors";
import EditCapacityModal from "../modals/EditCapacityModal";
import { HeaderViewModel } from "../types";

export default function CapacityCard({
  styles,
  profile,
  user,
}: {
  styles: any;
  profile: any;
  user: HeaderViewModel;
}) {
  const colors = useThemeColors();
  const capacity = (profile as any)?.capacity ?? null;

  const maxPullUps = capacity?.max_pullups ?? user.strengthStats.maxPullUps ?? null;
  const weightedPullKg = capacity?.weighted_pullup_kg ?? user.strengthStats.weightedPullUp ?? null;

  const [open, setOpen] = useState(false);

  const subtitle = useMemo(() => {
    if (maxPullUps == null && weightedPullKg == null) return "Tap to add";
    return "Tap to edit";
  }, [maxPullUps, weightedPullKg]);

  return (
    <>
      <TouchableOpacity style={styles.statCard} activeOpacity={0.9} onPress={() => setOpen(true)}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Capacity</Text>
          <MaterialCommunityIcons name="arm-flex" size={18} color={colors.textSecondary} />
        </View>

        <View style={styles.statRow}>
          <Text style={styles.statKey}>Max Pull-ups</Text>
          <Text style={styles.statVal}>{maxPullUps == null ? "—" : `${maxPullUps} reps`}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.statRow}>
          <Text style={styles.statKey}>Weighted Pull-up</Text>
          <Text style={styles.statVal}>{weightedPullKg == null ? "—" : `+${weightedPullKg} kg`}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.statRow}>
          <Text style={styles.statKey}> </Text>
          <Text style={[styles.statVal, { color: colors.textTertiary }]}>{subtitle}</Text>
        </View>
      </TouchableOpacity>

      <EditCapacityModal
        visible={open}
        onClose={() => setOpen(false)}
        current={{ max_pullups: maxPullUps, weighted_pullup_kg: weightedPullKg }}
      />
    </>
  );
}
