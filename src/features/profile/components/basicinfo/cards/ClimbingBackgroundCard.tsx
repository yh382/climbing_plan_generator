import React, { useMemo, useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import EditClimbingBackgroundModal from "../modals/EditClimbingBackgroundModal";
import { Ionicons } from "@expo/vector-icons";
export default function ClimbingBackgroundCard({
  styles,
  profile,
}: {
  styles: any;
  profile: any;
}) {
  const bg = (profile as any)?.climbing_background ?? null;
  const [open, setOpen] = useState(false);

  const discipline = useMemo(() => {
    const v = bg?.discipline ?? null;
    if (v === "boulder") return "Bouldering";
    if (v === "sport") return "Sport";
    if (v === "both") return "Both";
    return "—";
  }, [bg?.discipline]);

  const angle = useMemo(() => {
    const v = bg?.preferred_angle ?? null;
    if (v === "slab") return "Slab";
    if (v === "vertical") return "Vertical";
    if (v === "overhang") return "Overhang";
    if (v === "mixed") return "Mixed";
    return "—";
  }, [bg?.preferred_angle]);

  const years = bg?.experience_years ?? null;

  return (
    <>
      <TouchableOpacity style={styles.statCard} activeOpacity={0.9} onPress={() => setOpen(true)}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Climbing Background</Text>
          <Ionicons name="ribbon-outline" size={18} color="#666" />
        </View>

        <View style={styles.statRow}>
          <Text style={styles.statKey}>Discipline</Text>
          <Text style={styles.statVal}>{discipline}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.statRow}>
          <Text style={styles.statKey}>Preferred Angle</Text>
          <Text style={styles.statVal}>{angle}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.statRow}>
          <Text style={styles.statKey}>Experience</Text>
          <Text style={styles.statVal}>{years == null ? "—" : `${years} yrs`}</Text>
        </View>
      </TouchableOpacity>

      <EditClimbingBackgroundModal visible={open} onClose={() => setOpen(false)} current={bg} />
    </>
  );
}
