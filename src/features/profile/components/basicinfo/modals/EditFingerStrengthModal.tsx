// src/features/profile/components/basicinfo/modals/EditFingerStrengthModal.tsx

import React, { useEffect, useMemo, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import ExpandableEditCardModal from "../ExpandableEditCardModal";
import { useProfileStore } from "@/features/profile/store/useProfileStore";
import { FingerStrength } from "../types";
import { computeFSI } from "../utils";

type Edge = 10 | 15 | 20;
type Grip = "half_crimp" | "open_hand";

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
      activeOpacity={0.85}
      onPress={onPress}
      style={[styles.chip, selected && styles.chipSelected]}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function EditFingerStrengthModal({
  visible,
  onClose,
  bodyWeightKg,
  current,
}: {
  visible: boolean;
  onClose: () => void;
  bodyWeightKg: number | null;
  current?: FingerStrength | null;
}) {
  const profile = useProfileStore((s) => s.profile);
  const updateMe = useProfileStore((s) => s.updateMe);

  const [edge, setEdge] = useState<Edge | null>(null);
  const [grip, setGrip] = useState<Grip | null>(null);
  const [added, setAdded] = useState<string>("");
  const [hangS, setHangS] = useState<string>("10");

  // ✅ 读值：新字段优先，兼容旧字段
  useEffect(() => {
    if (!visible) return;

    setEdge((current?.edge_mm as Edge) ?? null);
    setGrip((current?.grip as Grip) ?? null);

    const curAdded =
      (current as any)?.added_weight_kg ??
      (current as any)?.added_kg ??
      null;

    const curHang =
      (current as any)?.hang_seconds ??
      (current as any)?.hang_s ??
      null;

    setAdded(curAdded == null ? "" : String(curAdded));
    setHangS(curHang == null ? "10" : String(curHang));
  }, [
    visible,
    current?.edge_mm,
    current?.grip,
    (current as any)?.added_weight_kg,
    (current as any)?.hang_seconds,
    (current as any)?.added_kg,
    (current as any)?.hang_s,
  ]);

  // ✅ parsedFinger：同时填充新字段 + legacy 字段，保证
  // 1) computeFSI 实时计算有输入
  // 2) 保存时 payload 符合后端 schema
  const parsedFinger: FingerStrength | null = useMemo(() => {
    const t = added.trim();
    const a = t === "" ? null : Number(t);
    if (t !== "" && (Number.isNaN(a) || !Number.isFinite(a as number))) return null;

    const hsT = hangS.trim();
    const hs = hsT === "" ? null : Number(hsT);
    if (hsT !== "" && (Number.isNaN(hs) || !Number.isFinite(hs as number))) return null;

    return {
      edge_mm: edge,
      grip: grip,

      // ✅ backend-aligned fields
      added_weight_kg: a,
      hang_seconds: hs,

      // ✅ legacy fields (keep for compatibility)
      added_kg: a,
      hang_s: hs,
    };
  }, [edge, grip, added, hangS]);

  const preview = useMemo(() => {
    return computeFSI(bodyWeightKg, parsedFinger);
  }, [bodyWeightKg, parsedFinger]);

  const save = async () => {
    if (!parsedFinger) return;

    // require minimal completeness
    if (
      parsedFinger.edge_mm == null ||
      parsedFinger.grip == null ||
      parsedFinger.added_weight_kg == null
    ) {
      return;
    }

    const prev: FingerStrength = ((profile as any)?.finger_strength ?? {}) as FingerStrength;

    const next: FingerStrength = {
      ...prev,

      edge_mm: parsedFinger.edge_mm,
      grip: parsedFinger.grip,

      // ✅ 保存用后端字段
      added_weight_kg: parsedFinger.added_weight_kg,
      hang_seconds: parsedFinger.hang_seconds ?? 10,

      // ✅ 同步 legacy 字段，避免你项目里还有地方读旧字段
      added_kg: parsedFinger.added_weight_kg,
      hang_s: parsedFinger.hang_seconds ?? 10,

      assessed_at: new Date().toISOString(),
    };

    try {
      await updateMe({ finger_strength: next } as any);
      onClose();
    } catch (e) {
      console.error("Save finger strength failed", e);
    }
  };

  return (
    <ExpandableEditCardModal
      visible={visible}
      title="Finger Strength Assessment"
      subtitle="Edge + grip + added weight • Tap outside to close"
      onRequestClose={onClose}
    >
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Edge (mm)</Text>
        <View style={styles.row}>
          <Chip label="10" selected={edge === 10} onPress={() => setEdge(10)} />
          <Chip label="15" selected={edge === 15} onPress={() => setEdge(15)} />
          <Chip label="20" selected={edge === 20} onPress={() => setEdge(20)} />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Grip</Text>
        <View style={styles.row}>
          <Chip
            label="Half Crimp"
            selected={grip === "half_crimp"}
            onPress={() => setGrip("half_crimp")}
          />
          <Chip
            label="Open Hand"
            selected={grip === "open_hand"}
            onPress={() => setGrip("open_hand")}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Added Weight (kg)</Text>
        <Text style={styles.hint}>Use negative values for assistance (e.g. -10)</Text>
        <TextInput
          value={added}
          onChangeText={setAdded}
          placeholder="e.g. 20"
          keyboardType="numeric"
          style={styles.input}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Hang Time (s)</Text>
        <TextInput
          value={hangS}
          onChangeText={setHangS}
          placeholder="e.g. 10"
          keyboardType="numeric"
          style={styles.input}
        />
      </View>

      <View style={styles.preview}>
        <Text style={styles.previewKey}>FSI (preview)</Text>
        <Text style={styles.previewVal}>{preview == null ? "—" : preview.toFixed(2)}</Text>
      </View>

      <TouchableOpacity style={styles.saveBtn} activeOpacity={0.9} onPress={save}>
        <Text style={styles.saveText}>Save</Text>
      </TouchableOpacity>
    </ExpandableEditCardModal>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: 12 },
  sectionTitle: { fontSize: 14, fontWeight: "800", color: "#111", marginBottom: 8 },
  hint: { fontSize: 12, color: "#666", marginBottom: 6 },
  row: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#ddd",
    backgroundColor: "#fff",
  },
  chipSelected: { backgroundColor: "#111", borderColor: "#111" },
  chipText: { fontSize: 13, fontWeight: "800", color: "#111" },
  chipTextSelected: { color: "#fff" },
  input: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#ddd",
    paddingHorizontal: 12,
    fontSize: 14,
    fontWeight: "700",
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
