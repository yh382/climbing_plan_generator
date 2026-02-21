// src/features/profile/components/basicinfo/modals/EditAnthropometricModal.tsx

import React, { useMemo, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import ExpandableEditCardModal from "../ExpandableEditCardModal";
import { useProfileStore } from "@/features/profile/store/useProfileStore";

export type EditField = "height" | "weight" | "arm_span";

/**
 * This modal edits ALL body metrics in one place:
 * - height (cm)
 * - weight (kg)
 * - arm_span (cm)
 *
 * Backward compatible with older callers that pass `field`,
 * but we always show all three inputs (per product decision).
 */
export default function EditAnthropometricModal({
  visible,
  // keep for backward compatibility (ignored intentionally)
  field,
  current,
  onClose,
}: {
  visible: boolean;
  field?: EditField | null;
  current: { height: number | null; weight: number | null; arm_span: number | null };
  onClose: () => void;
}) {
  const profile = useProfileStore((s) => s.profile);
  const updateMe = useProfileStore((s) => s.updateMe);

  const [heightDraft, setHeightDraft] = useState<string>("");
  const [weightDraft, setWeightDraft] = useState<string>("");
  const [armSpanDraft, setArmSpanDraft] = useState<string>("");

  React.useEffect(() => {
    if (!visible) return;
    setHeightDraft(current.height == null ? "" : String(current.height));
    setWeightDraft(current.weight == null ? "" : String(current.weight));
    setArmSpanDraft(current.arm_span == null ? "" : String(current.arm_span));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, current.height, current.weight, current.arm_span]);

  const parsed = useMemo(() => {
    const parseNumOrNull = (s: string) => {
      const t = s.trim();
      if (t === "") return null;
      const n = Number(t);
      if (Number.isNaN(n) || !Number.isFinite(n)) return undefined; // invalid
      return n;
    };

    const h = parseNumOrNull(heightDraft);
    const w = parseNumOrNull(weightDraft);
    const a = parseNumOrNull(armSpanDraft);

    if (h === undefined || w === undefined || a === undefined) return null;

    return {
      height: h as number | null,
      weight: w as number | null,
      arm_span: a as number | null,
    };
  }, [heightDraft, weightDraft, armSpanDraft]);

  const save = async () => {
    if (!parsed) return;

    const prev = (profile as any)?.anthropometrics ?? {};
    const next = {
      ...prev,
      height: parsed.height,
      weight: parsed.weight,
      arm_span: parsed.arm_span,
    };

    try {
      await updateMe({ anthropometrics: next } as any);
      onClose();
    } catch (e) {
      console.error("Save anthropometrics failed", e);
    }
  };

  const hasInvalid = useMemo(() => {
    // invalid means parsed is null but some draft is not empty + not a valid number
    const isInvalid = (s: string) => {
      const t = s.trim();
      if (t === "") return false;
      const n = Number(t);
      return Number.isNaN(n) || !Number.isFinite(n);
    };
    return isInvalid(heightDraft) || isInvalid(weightDraft) || isInvalid(armSpanDraft);
  }, [heightDraft, weightDraft, armSpanDraft]);

  return (
    <ExpandableEditCardModal
      visible={visible}
      title="Body Metrics"
      subtitle="Tap outside to close • Height/Arm span in cm, Weight in kg"
      onRequestClose={onClose}
    >
      <View style={local.block}>
        <Text style={local.label}>Height</Text>
        <View style={local.inputRow}>
          <TextInput
            value={heightDraft}
            onChangeText={setHeightDraft}
            placeholder="e.g. 178"
            keyboardType="numeric"
            autoFocus
            style={local.input}
            placeholderTextColor="#999"
          />
          <Text style={local.unit}>cm</Text>
        </View>
      </View>

      <View style={local.block}>
        <Text style={local.label}>Weight</Text>
        <View style={local.inputRow}>
          <TextInput
            value={weightDraft}
            onChangeText={setWeightDraft}
            placeholder="e.g. 70"
            keyboardType="numeric"
            style={local.input}
            placeholderTextColor="#999"
          />
          <Text style={local.unit}>kg</Text>
        </View>
      </View>

      <View style={local.block}>
        <Text style={local.label}>Arm Span</Text>
        <View style={local.inputRow}>
          <TextInput
            value={armSpanDraft}
            onChangeText={setArmSpanDraft}
            placeholder="e.g. 182"
            keyboardType="numeric"
            style={local.input}
            placeholderTextColor="#999"
          />
          <Text style={local.unit}>cm</Text>
        </View>
      </View>

      {hasInvalid ? (
        <Text style={local.errorText}>Please enter valid numbers (or leave blank).</Text>
      ) : null}

      <TouchableOpacity
        style={[local.saveBtn, (hasInvalid || !parsed) && local.saveBtnDisabled]}
        activeOpacity={0.9}
        onPress={save}
        disabled={hasInvalid || !parsed}
      >
        <Text style={local.saveText}>Save</Text>
      </TouchableOpacity>
    </ExpandableEditCardModal>
  );
}

const local = StyleSheet.create({
  block: {
    marginTop: 10,
  },
  label: {
    fontSize: 13,
    fontWeight: "800",
    color: "#111",
    marginBottom: 8,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  input: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#EAEAEA",
    paddingHorizontal: 12,
    fontSize: 16,
    color: "#111",
    backgroundColor: "#fff",
  },
  unit: {
    fontSize: 14,
    fontWeight: "700",
    color: "#666",
  },
  errorText: {
    marginTop: 10,
    color: "#B00020",
    fontSize: 12,
    fontWeight: "700",
  },
  saveBtn: {
    marginTop: 14,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#111",
    alignItems: "center",
    justifyContent: "center",
  },
  saveBtnDisabled: {
    opacity: 0.5,
  },
  saveText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "800",
  },
});
