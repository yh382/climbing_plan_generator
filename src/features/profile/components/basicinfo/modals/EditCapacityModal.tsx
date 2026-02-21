import React, { useEffect, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import ExpandableEditCardModal from "../ExpandableEditCardModal";
import { useProfileStore } from "@/features/profile/store/useProfileStore";

export default function EditCapacityModal({
  visible,
  onClose,
  current,
}: {
  visible: boolean;
  onClose: () => void;
  current: { max_pullups: number | null; weighted_pullup_kg: number | null };
}) {
  const profile = useProfileStore((s) => s.profile);
  const updateMe = useProfileStore((s) => s.updateMe);

  const [pullups, setPullups] = useState("");
  const [weighted, setWeighted] = useState("");

  useEffect(() => {
    if (!visible) return;
    setPullups(current.max_pullups == null ? "" : String(current.max_pullups));
    setWeighted(current.weighted_pullup_kg == null ? "" : String(current.weighted_pullup_kg));
  }, [visible, current.max_pullups, current.weighted_pullup_kg]);

  const toNumOrNull = (s: string) => {
    const t = s.trim();
    if (t === "") return null;
    const n = Number(t);
    if (Number.isNaN(n) || !Number.isFinite(n)) return undefined; // invalid
    return n;
  };

  const save = async () => {
    const p = toNumOrNull(pullups);
    const w = toNumOrNull(weighted);

    if (p === undefined || w === undefined) return;

    const prev = (profile as any)?.capacity ?? {};
    const next = {
      ...prev,
      max_pullups: p,
      weighted_pullup_kg: w,
    };

    try {
      await updateMe({ capacity: next } as any);
      onClose();
    } catch (e) {
      console.error("Save capacity failed", e);
    }
  };

  return (
    <ExpandableEditCardModal
      visible={visible}
      title="Capacity"
      subtitle="Max ability when fresh • Tap outside to close"
      onRequestClose={onClose}
    >
      <View style={local.field}>
        <Text style={local.label}>Max Pull-ups (reps)</Text>
        <TextInput
          value={pullups}
          onChangeText={setPullups}
          placeholder="e.g. 18"
          keyboardType="numeric"
          style={local.input}
          placeholderTextColor="#999"
        />
      </View>

      <View style={local.field}>
        <Text style={local.label}>Weighted Pull-up (+kg)</Text>
        <TextInput
          value={weighted}
          onChangeText={setWeighted}
          placeholder="e.g. 20"
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
  field: { marginTop: 10, gap: 6 },
  label: { fontSize: 13, fontWeight: "700", color: "#333" },
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
