// src/features/session/components/LogWorkoutSheet.tsx

import React, { useState, useCallback, useMemo, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import BottomSheet, { BottomSheetView } from "@gorhom/bottom-sheet";
import { Ionicons } from "@expo/vector-icons";

interface LogWorkoutData {
  completion: number;       // 0.25 | 0.5 | 0.75 | 1
  intensity: "light" | "moderate" | "hard";
  notes: string;
}

interface Props {
  visible: boolean;
  exerciseName: string;
  onSave: (data: LogWorkoutData) => void;
  onClose: () => void;
  isZH: boolean;
}

const COMPLETION_OPTIONS = [
  { value: 0.25, label: "25%" },
  { value: 0.5, label: "50%" },
  { value: 0.75, label: "75%" },
  { value: 1, label: "100%" },
];

const INTENSITY_OPTIONS: { value: LogWorkoutData["intensity"]; zhLabel: string; enLabel: string; icon: string }[] = [
  { value: "light", zhLabel: "轻松", enLabel: "Light", icon: "sunny-outline" },
  { value: "moderate", zhLabel: "适中", enLabel: "Moderate", icon: "flame-outline" },
  { value: "hard", zhLabel: "高强度", enLabel: "Hard", icon: "flash-outline" },
];

export default function LogWorkoutSheet({ visible, exerciseName, onSave, onClose, isZH }: Props) {
  const [completion, setCompletion] = useState(1);
  const [intensity, setIntensity] = useState<LogWorkoutData["intensity"]>("moderate");
  const [notes, setNotes] = useState("");
  const bottomSheetRef = useRef<BottomSheet>(null);

  const snapPoints = useMemo(() => ["55%"], []);

  const handleSave = useCallback(() => {
    onSave({ completion, intensity, notes: notes.trim() });
    // Reset
    setCompletion(1);
    setIntensity("moderate");
    setNotes("");
  }, [completion, intensity, notes, onSave]);

  if (!visible) return null;

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={0}
      snapPoints={snapPoints}
      enablePanDownToClose
      onClose={onClose}
      backgroundStyle={styles.sheetBg}
      handleIndicatorStyle={styles.handle}
    >
      <BottomSheetView style={styles.content}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>{isZH ? "记录训练" : "Log Workout"}</Text>
            <TouchableOpacity onPress={onClose} hitSlop={12}>
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <Text style={styles.exerciseName} numberOfLines={1}>{exerciseName}</Text>

          {/* Completion */}
          <Text style={styles.label}>{isZH ? "完成度" : "Completion"}</Text>
          <View style={styles.optionRow}>
            {COMPLETION_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.chip, completion === opt.value && styles.chipActive]}
                onPress={() => setCompletion(opt.value)}
              >
                <Text style={[styles.chipText, completion === opt.value && styles.chipTextActive]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Intensity */}
          <Text style={styles.label}>{isZH ? "强度" : "Intensity"}</Text>
          <View style={styles.optionRow}>
            {INTENSITY_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.chip, intensity === opt.value && styles.chipActive]}
                onPress={() => setIntensity(opt.value)}
              >
                <Ionicons
                  name={opt.icon as any}
                  size={16}
                  color={intensity === opt.value ? "#FFF" : "#6B7280"}
                />
                <Text style={[styles.chipText, intensity === opt.value && styles.chipTextActive]}>
                  {isZH ? opt.zhLabel : opt.enLabel}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Notes */}
          <Text style={styles.label}>{isZH ? "备注" : "Notes"}</Text>
          <TextInput
            style={styles.input}
            placeholder={isZH ? "补充说明 (可选)" : "Optional notes..."}
            placeholderTextColor="#9CA3AF"
            value={notes}
            onChangeText={setNotes}
            multiline
            maxLength={200}
          />

          {/* Save button */}
          <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
            <Ionicons name="checkmark-circle" size={20} color="#FFF" />
            <Text style={styles.saveBtnText}>{isZH ? "保存" : "Save"}</Text>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </BottomSheetView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  sheetBg: { backgroundColor: "#FFF", borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  handle: { backgroundColor: "#D1D5DB", width: 36 },
  content: { flex: 1, paddingHorizontal: 20, paddingBottom: 20 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  title: { fontSize: 18, fontWeight: "700", color: "#111" },
  exerciseName: { fontSize: 14, color: "#6B7280", marginBottom: 16 },
  label: { fontSize: 13, fontWeight: "600", color: "#374151", marginBottom: 8, marginTop: 12 },
  optionRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  chipActive: { backgroundColor: "#111827", borderColor: "#111827" },
  chipText: { fontSize: 14, fontWeight: "600", color: "#374151" },
  chipTextActive: { color: "#FFF" },
  input: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 12,
    fontSize: 14,
    color: "#111",
    minHeight: 60,
    textAlignVertical: "top",
  },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#111827",
    borderRadius: 28,
    paddingVertical: 16,
    marginTop: 20,
  },
  saveBtnText: { fontSize: 16, fontWeight: "700", color: "#FFF" },
});
