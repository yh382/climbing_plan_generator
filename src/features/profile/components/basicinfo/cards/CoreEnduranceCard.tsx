import React, { useMemo, useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import EditCoreEnduranceModal from "../modals/EditCoreEnduranceModal";
import { HeaderViewModel } from "../types";

function fmtSec(v: number | null) {
  if (v == null) return "—";
  return `${Math.round(v)} sec`;
}

export default function CoreEnduranceCard({
  styles,
  profile,
  user,
}: {
  styles: any;
  profile: any;
  user: HeaderViewModel;
}) {
  const sec = (profile as any)?.performance?.hollow_hold_sec?.value ?? null;

  const [open, setOpen] = useState(false);

  const subtitle = useMemo(() => {
    return sec == null ? "Tap to add" : "Hollow hold (seconds)";
  }, [sec]);

  return (
    <>
      <TouchableOpacity style={styles.statCard} activeOpacity={0.9} onPress={() => setOpen(true)}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Core Endurance</Text>
          <MaterialCommunityIcons name="ab-testing" size={18} color="#666" />
        </View>

        <View style={styles.statRow}>
          <Text style={styles.statKey}>Hollow Hold</Text>
          <Text style={[styles.statVal, { color: sec == null ? "#999" : "#111" }]}>
            {sec == null ? subtitle : fmtSec(sec)}
          </Text>
        </View>
      </TouchableOpacity>

      <EditCoreEnduranceModal
        visible={open}
        onClose={() => setOpen(false)}
        currentSeconds={sec}
      />
    </>
  );
}
