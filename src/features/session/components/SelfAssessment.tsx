// src/features/session/components/SelfAssessment.tsx

import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export interface SelfAssessmentData {
  rpe: number;          // 1-10
  feeling: number;      // 1-4
  notes: string;
}

interface Props {
  onSubmit: (data: SelfAssessmentData) => void;
  isZH: boolean;
}

const FEELINGS = [
  { value: 1, icon: "battery-dead-outline" as const, color: "#EF4444", zhLabel: "很累", enLabel: "Exhausted" },
  { value: 2, icon: "remove-circle-outline" as const, color: "#F59E0B", zhLabel: "一般", enLabel: "Okay" },
  { value: 3, icon: "happy-outline" as const, color: "#10B981", zhLabel: "不错", enLabel: "Good" },
  { value: 4, icon: "flame-outline" as const, color: "#F97316", zhLabel: "超棒", enLabel: "Great" },
];

export default function SelfAssessment({ onSubmit, isZH }: Props) {
  const [rpe, setRpe] = useState(5);
  const [feeling, setFeeling] = useState(3);
  const [notes, setNotes] = useState("");

  const handleSubmit = () => {
    onSubmit({ rpe, feeling, notes: notes.trim() });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{isZH ? "训练自评" : "How was your workout?"}</Text>

      {/* RPE Slider (simplified as buttons 1-10) */}
      <Text style={styles.label}>
        RPE {isZH ? "(主观发力感)" : "(Rate of Perceived Exertion)"}
      </Text>
      <View style={styles.rpeRow}>
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
          <TouchableOpacity
            key={n}
            style={[
              styles.rpeBtn,
              rpe === n && styles.rpeBtnActive,
              n <= 3 && rpe === n && { backgroundColor: "#22C55E" },
              n >= 4 && n <= 6 && rpe === n && { backgroundColor: "#F59E0B" },
              n >= 7 && n <= 8 && rpe === n && { backgroundColor: "#F97316" },
              n >= 9 && rpe === n && { backgroundColor: "#EF4444" },
            ]}
            onPress={() => setRpe(n)}
          >
            <Text style={[styles.rpeText, rpe === n && styles.rpeTextActive]}>{n}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.rpeLabels}>
        <Text style={styles.rpeLabelText}>{isZH ? "轻松" : "Easy"}</Text>
        <Text style={styles.rpeLabelText}>{isZH ? "极限" : "Max"}</Text>
      </View>

      {/* Feeling */}
      <Text style={styles.label}>{isZH ? "感受" : "Feeling"}</Text>
      <View style={styles.feelingRow}>
        {FEELINGS.map((f) => (
          <TouchableOpacity
            key={f.value}
            style={[
              styles.feelingBtn,
              feeling === f.value && styles.feelingBtnActive,
              feeling === f.value && { borderColor: f.color },
            ]}
            onPress={() => setFeeling(f.value)}
          >
            <Ionicons
              name={f.icon}
              size={24}
              color={feeling === f.value ? f.color : "#9CA3AF"}
            />
            <Text style={[styles.feelingLabel, feeling === f.value && { color: f.color, fontWeight: "700" }]}>
              {isZH ? f.zhLabel : f.enLabel}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Notes */}
      <TextInput
        style={styles.input}
        placeholder={isZH ? "备注 (可选)" : "Notes (optional)"}
        placeholderTextColor="#9CA3AF"
        value={notes}
        onChangeText={setNotes}
        multiline
        maxLength={200}
      />

      {/* Submit */}
      <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}>
        <Text style={styles.submitText}>{isZH ? "提交评估" : "Submit"}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20 },
  title: { fontSize: 20, fontWeight: "700", color: "#111", textAlign: "center", marginBottom: 24 },
  label: { fontSize: 14, fontWeight: "600", color: "#374151", marginBottom: 10, marginTop: 16 },
  // RPE
  rpeRow: { flexDirection: "row", justifyContent: "space-between", gap: 4 },
  rpeBtn: {
    width: 30,
    height: 36,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  rpeBtnActive: { backgroundColor: "#111827" },
  rpeText: { fontSize: 14, fontWeight: "600", color: "#6B7280" },
  rpeTextActive: { color: "#FFF" },
  rpeLabels: { flexDirection: "row", justifyContent: "space-between", marginTop: 4 },
  rpeLabelText: { fontSize: 11, color: "#9CA3AF" },
  // Feeling
  feelingRow: { flexDirection: "row", gap: 8, justifyContent: "center" },
  feelingBtn: {
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: "#F9FAFB",
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    minWidth: 70,
  },
  feelingBtnActive: { borderColor: "#111827", backgroundColor: "#F3F4F6" },
  feelingLabel: { fontSize: 12, color: "#6B7280", fontWeight: "500", marginTop: 4 },
  // Input
  input: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 12,
    fontSize: 14,
    color: "#111",
    minHeight: 56,
    marginTop: 16,
    textAlignVertical: "top",
  },
  // Submit
  submitBtn: {
    backgroundColor: "#111827",
    borderRadius: 28,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 24,
  },
  submitText: { fontSize: 16, fontWeight: "700", color: "#FFF" },
});
