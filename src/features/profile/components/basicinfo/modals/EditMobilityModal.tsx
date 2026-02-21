import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
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

export default function EditMobilityModal({
  visible,
  onClose,
  currentBand,
}: {
  visible: boolean;
  onClose: () => void;
  currentBand: number | null;
}) {
  const profile = useProfileStore((s) => s.profile);
  const updateMe = useProfileStore((s) => s.updateMe);

  const [band, setBand] = useState<number | null>(null);

  useEffect(() => {
    if (!visible) return;
    setBand(currentBand ?? 3);
  }, [visible, currentBand]);

  const save = async () => {
    const prevA = (profile as any)?.anthropometrics ?? {};
    const nextA = {
      ...prevA,
      mobility_band: band,
    };

    try {
      await updateMe({ anthropometrics: nextA } as any);
      onClose();
    } catch (e) {
      console.error("Save mobility failed", e);
    }
  };

  return (
    <ExpandableEditCardModal
      visible={visible}
      title="Mobility"
      subtitle="Pick 1–5 • Tap outside to close"
      onRequestClose={onClose}
    >
      <View style={local.block}>
        <Text style={local.label}>Mobility Band</Text>
        <Text style={local.hint}>Subjective but consistent. Used for Flex score.</Text>

        <View style={local.row}>
          <Chip label="1 Limited" selected={band === 1} onPress={() => setBand(1)} />
          <Chip label="2 Tight" selected={band === 2} onPress={() => setBand(2)} />
          <Chip label="3 Average" selected={band === 3} onPress={() => setBand(3)} />
          <Chip label="4 Mobile" selected={band === 4} onPress={() => setBand(4)} />
          <Chip label="5 Very mobile" selected={band === 5} onPress={() => setBand(5)} />
        </View>
      </View>

      <View style={local.footerRow}>
        <TouchableOpacity
          style={[local.secondaryBtn]}
          activeOpacity={0.9}
          onPress={() => setBand(null)}
        >
          <Text style={local.secondaryText}>Clear</Text>
        </TouchableOpacity>

        <TouchableOpacity style={local.saveBtn} activeOpacity={0.9} onPress={save}>
          <Text style={local.saveText}>Save</Text>
        </TouchableOpacity>
      </View>
    </ExpandableEditCardModal>
  );
}

const local = StyleSheet.create({
  block: { marginTop: 12, gap: 6 },
  label: { fontSize: 13, fontWeight: "800", color: "#222" },
  hint: { fontSize: 12, color: "#777" },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 6 },

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

  footerRow: { flexDirection: "row", gap: 10, marginTop: 14 },
  secondaryBtn: {
    flex: 1,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#EAEAEA",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  secondaryText: { color: "#111", fontSize: 14, fontWeight: "800" },

  saveBtn: {
    flex: 1,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#111",
    alignItems: "center",
    justifyContent: "center",
  },
  saveText: { color: "#fff", fontSize: 14, fontWeight: "800" },
});
