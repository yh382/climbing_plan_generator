import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, TextInput } from "react-native";
import ExpandableEditCardModal from "../ExpandableEditCardModal";
import { useProfileStore } from "@/features/profile/store/useProfileStore";

function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.9}
      style={[local.chip, selected && local.chipSelected]}
    >
      <Text style={[local.chipText, selected && local.chipTextSelected]}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function EditClimbingBackgroundModal({
  visible,
  onClose,
  current,
}: {
  visible: boolean;
  onClose: () => void;
  current: any;
}) {
  const profile = useProfileStore((s) => s.profile);
  const updateMe = useProfileStore((s) => s.updateMe);

  const [discipline, setDiscipline] = useState<"boulder" | "sport" | "both" | null>(null);
  const [angle, setAngle] = useState<"slab" | "vertical" | "overhang" | "mixed" | null>(null);
  const [years, setYears] = useState<string>("");

  useEffect(() => {
    if (!visible) return;
    setDiscipline(current?.discipline ?? null);
    setAngle(current?.preferred_angle ?? null);
    setYears(current?.experience_years == null ? "" : String(current.experience_years));
  }, [visible, current?.discipline, current?.preferred_angle, current?.experience_years]);

  const save = async () => {
    const yTrim = years.trim();
    const y = yTrim === "" ? null : Number(yTrim);
    if (yTrim !== "" && (Number.isNaN(y) || !Number.isFinite(y as number))) return;

    const prev = (profile as any)?.climbing_background ?? {};
    const next = {
      ...prev,
      discipline,
      preferred_angle: angle,
      experience_years: y,
    };

    try {
      await updateMe({ climbing_background: next } as any);
      onClose();
    } catch (e) {
      console.error("Save climbing background failed", e);
    }
  };

  return (
    <ExpandableEditCardModal
      visible={visible}
      title="Climbing Background"
      subtitle="Stable profile traits • Tap outside to close"
      onRequestClose={onClose}
    >
      <View style={local.block}>
        <Text style={local.label}>Discipline</Text>
        <View style={local.row}>
          <Chip label="Bouldering" selected={discipline === "boulder"} onPress={() => setDiscipline("boulder")} />
          <Chip label="Sport" selected={discipline === "sport"} onPress={() => setDiscipline("sport")} />
          <Chip label="Both" selected={discipline === "both"} onPress={() => setDiscipline("both")} />
        </View>
      </View>

      <View style={local.block}>
        <Text style={local.label}>Preferred Angle</Text>
        <View style={local.row}>
          <Chip label="Slab" selected={angle === "slab"} onPress={() => setAngle("slab")} />
          <Chip label="Vertical" selected={angle === "vertical"} onPress={() => setAngle("vertical")} />
          <Chip label="Overhang" selected={angle === "overhang"} onPress={() => setAngle("overhang")} />
          <Chip label="Mixed" selected={angle === "mixed"} onPress={() => setAngle("mixed")} />
        </View>
      </View>

      <View style={local.block}>
        <Text style={local.label}>Experience (years)</Text>
        <TextInput
          value={years}
          onChangeText={setYears}
          placeholder="e.g. 2.5"
          keyboardType="numeric"
          style={local.input}
          placeholderTextColor="#999"
        />
      </View>

      <TouchableOpacity style={local.saveBtn} activeOpacity={0.9} onPress={save}>
        <Text style={local.saveText}>Save</Text>
      </TouchableOpacity>
    </ExpandableEditCardModal>
  );
}

const local = StyleSheet.create({
  block: { marginTop: 12, gap: 6 },
  label: { fontSize: 13, fontWeight: "800", color: "#222" },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 4 },
  chip: {
    paddingHorizontal: 12,
    height: 34,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#EAEAEA",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  chipSelected: { backgroundColor: "#111", borderColor: "#111" },
  chipText: { fontSize: 13, fontWeight: "700", color: "#222" },
  chipTextSelected: { color: "#fff" },
  input: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#EAEAEA",
    paddingHorizontal: 12,
    fontSize: 16,
    color: "#111",
    backgroundColor: "#fff",
  },
  saveBtn: {
    marginTop: 14,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#111",
    alignItems: "center",
    justifyContent: "center",
  },
  saveText: { color: "#fff", fontSize: 14, fontWeight: "800" },
});
