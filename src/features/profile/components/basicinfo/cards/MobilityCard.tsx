import React, { useMemo, useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import EditMobilityModal from "../modals/EditMobilityModal";
import { HeaderViewModel } from "../types";

function labelForBand(band: number | null) {
  if (band == null) return "Tap to assess";
  const m: Record<number, string> = {
    1: "Limited",
    2: "Tight",
    3: "Average",
    4: "Mobile",
    5: "Very mobile",
  };
  return m[band] ?? `Level ${band}`;
}

export default function MobilityCard({
  styles,
  profile,
  user,
}: {
  styles: any;
  profile: any;
  user: HeaderViewModel;
}) {
  const band = (profile as any)?.anthropometrics?.mobility_band ?? null;

  const [open, setOpen] = useState(false);

  const summary = useMemo(() => labelForBand(band), [band]);

  return (
    <>
      <TouchableOpacity style={styles.statCard} activeOpacity={0.9} onPress={() => setOpen(true)}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Mobility</Text>
          <MaterialCommunityIcons name="human-handsup" size={18} color="#666" />
        </View>

        <View style={styles.statRow}>
          <Text style={styles.statKey}>Mobility Band</Text>
          <Text style={[styles.statVal, { color: band == null ? "#999" : "#111" }]}>{summary}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.statRow}>
          <Text style={styles.statKey}>Scale</Text>
          <Text style={styles.statVal}>1–5</Text>
        </View>
      </TouchableOpacity>

      <EditMobilityModal
        visible={open}
        onClose={() => setOpen(false)}
        currentBand={band}
      />
    </>
  );
}
