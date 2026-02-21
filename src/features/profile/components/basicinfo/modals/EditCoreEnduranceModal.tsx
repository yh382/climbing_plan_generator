import React, { useEffect, useMemo, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import ExpandableEditCardModal from "../ExpandableEditCardModal";
import { useProfileStore } from "@/features/profile/store/useProfileStore";

export default function EditCoreEnduranceModal({
  visible,
  onClose,
  currentSeconds,
}: {
  visible: boolean;
  onClose: () => void;
  currentSeconds: number | null;
}) {
  const upsertPerformance = useProfileStore((s) => s.upsertPerformance);

  const [secText, setSecText] = useState("");

  useEffect(() => {
    if (!visible) return;
    setSecText(currentSeconds == null ? "" : String(currentSeconds));
  }, [visible, currentSeconds]);

  const parsed = useMemo(() => {
    const t = secText.trim();
    if (t === "") return null;
    const v = Number(t);
    if (Number.isNaN(v) || !Number.isFinite(v)) return null;
    return Math.max(0, Math.round(v));
  }, [secText]);

  const save = async () => {
    // allow clear
    try {
      await upsertPerformance({ hollow_hold_sec: parsed });
      onClose();
    } catch (e) {
      console.error("Save hollow hold failed", e);
    }
  };

  return (
    <ExpandableEditCardModal
      visible={visible}
      title="Hollow Hold"
      subtitle="Core endurance • seconds • Tap outside to close"
      onRequestClose={onClose}
    >
      <View style={local.block}>
        <Text style={local.label}>Seconds</Text>
        <Text style={local.hint}>Use a strict-form max hold.</Text>
        <TextInput
          value={secText}
          onChangeText={setSecText}
          placeholder="e.g. 60"
          keyboardType="numeric"
          style={local.input}
          placeholderTextColor="#999"
        />
      </View>

      <View style={local.preview}>
        <Text style={local.previewKey}>Preview</Text>
        <Text style={local.previewVal}>{parsed == null ? "—" : `${parsed} sec`}</Text>
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
  hint: { fontSize: 12, color: "#777" },
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
  preview: {
    marginTop: 14,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.04)",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  previewKey: { fontSize: 13, fontWeight: "800", color: "#333" },
  previewVal: { fontSize: 16, fontWeight: "900", color: "#111" },
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
