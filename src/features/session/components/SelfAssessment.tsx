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
  { value: 1, icon: "battery-dead-outline" as const, zhLabel: "很累", enLabel: "Exhausted" },
  { value: 2, icon: "remove-circle-outline" as const, zhLabel: "一般", enLabel: "Okay" },
  { value: 3, icon: "happy-outline" as const, zhLabel: "不错", enLabel: "Good" },
  { value: 4, icon: "flame-outline" as const, zhLabel: "超棒", enLabel: "Great" },
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
            ]}
            onPress={() => setFeeling(f.value)}
          >
            <Ionicons
              name={f.icon}
              size={24}
              color={feeling === f.value ? "#FFFFFF" : "#888888"}
            />
            <Text style={[styles.feelingLabel, feeling === f.value && styles.feelingLabelActive]}>
              {isZH ? f.zhLabel : f.enLabel}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Notes */}
      <TextInput
        style={styles.input}
        placeholder={isZH ? "备注 (可选)" : "Notes (optional)"}
        placeholderTextColor="#BBBBBB"
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
  title: { fontSize: 20, fontFamily: "DMSans_900Black", color: "#000000", textAlign: "center", marginBottom: 24 },
  label: { fontSize: 14, fontFamily: "DMSans_500Medium", color: "#000000", marginBottom: 10, marginTop: 16 },
  // RPE
  rpeRow: { flexDirection: "row", justifyContent: "space-between", gap: 4 },
  rpeBtn: {
    width: 30,
    height: 36,
    borderRadius: 8,
    backgroundColor: "#F7F7F7",
    alignItems: "center",
    justifyContent: "center",
  },
  rpeBtnActive: { backgroundColor: "#1C1C1E" },
  rpeText: { fontSize: 14, fontFamily: "DMMono_500Medium", color: "#888888" },
  rpeTextActive: { color: "#FFF" },
  rpeLabels: { flexDirection: "row", justifyContent: "space-between", marginTop: 4 },
  rpeLabelText: { fontSize: 11, color: "#BBBBBB", fontFamily: "DMSans_400Regular" },
  // Feeling
  feelingRow: { flexDirection: "row", gap: 8, justifyContent: "center" },
  feelingBtn: {
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: "#F7F7F7",
    borderWidth: 0,
    minWidth: 70,
  },
  feelingBtnActive: { backgroundColor: "#1C1C1E" },
  feelingLabel: { fontSize: 12, color: "#888888", fontFamily: "DMSans_500Medium", marginTop: 4 },
  feelingLabelActive: { color: "#FFFFFF", fontFamily: "DMSans_700Bold" },
  // Input
  input: {
    backgroundColor: "#F7F7F7",
    borderRadius: 12,
    borderWidth: 0,
    padding: 12,
    fontSize: 14,
    fontFamily: "DMSans_400Regular",
    color: "#000000",
    minHeight: 56,
    marginTop: 16,
    textAlignVertical: "top",
  },
  // Submit
  submitBtn: {
    backgroundColor: "#1C1C1E",
    borderRadius: 28,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 24,
  },
  submitText: { fontSize: 16, fontFamily: "DMSans_700Bold", color: "#FFF" },
});
