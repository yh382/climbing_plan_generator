// src/features/session/components/LogWorkoutSheet.tsx

import React, { useState, useCallback, useEffect, useRef, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
} from "react-native";
import { TrueSheet } from "@lodev09/react-native-true-sheet";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "../../../lib/theme";
import { useThemeColors } from "../../../lib/useThemeColors";

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
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [completion, setCompletion] = useState(1);
  const [intensity, setIntensity] = useState<LogWorkoutData["intensity"]>("moderate");
  const [notes, setNotes] = useState("");
  const bottomSheetRef = useRef<TrueSheet>(null);

  useEffect(() => {
    if (visible) {
      bottomSheetRef.current?.present();
    } else {
      bottomSheetRef.current?.dismiss();
    }
  }, [visible]);

  const handleSave = useCallback(() => {
    onSave({ completion, intensity, notes: notes.trim() });
    // Reset
    setCompletion(1);
    setIntensity("moderate");
    setNotes("");
  }, [completion, intensity, notes, onSave]);

  return (
    <TrueSheet
      ref={bottomSheetRef}
      detents={[0.4, 0.9]}
      backgroundColor={colors.sheetBackground}
      grabberOptions={{ height: 3, width: 36, topMargin: 6 }}
      onDidDismiss={onClose}
    >
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{isZH ? "记录训练" : "Log Workout"}</Text>
          <TouchableOpacity onPress={onClose} hitSlop={12}>
            <Ionicons name="close" size={24} color={colors.textSecondary} />
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
                color={intensity === opt.value ? colors.pillText : colors.textSecondary}
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
          placeholderTextColor={colors.textTertiary}
          value={notes}
          onChangeText={setNotes}
          multiline
          maxLength={200}
        />

        {/* Save button */}
        <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
          <Ionicons name="checkmark-circle" size={20} color={colors.pillText} />
          <Text style={styles.saveBtnText}>{isZH ? "保存" : "Save"}</Text>
        </TouchableOpacity>
      </View>
    </TrueSheet>
  );
}

const createStyles = (colors: ReturnType<typeof useThemeColors>) => StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 20 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    fontFamily: theme.fonts.bold,
    color: colors.textPrimary,
  },
  exerciseName: {
    fontSize: 14,
    fontFamily: theme.fonts.regular,
    color: colors.textSecondary,
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
    color: colors.textPrimary,
    marginBottom: 8,
    marginTop: 12,
  },
  optionRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  chipActive: {
    backgroundColor: colors.cardDark,
    borderColor: colors.cardDark,
  },
  chipText: {
    fontSize: 14,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
    color: colors.textPrimary,
  },
  chipTextActive: { color: colors.pillText },
  input: {
    backgroundColor: colors.inputBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 12,
    fontSize: 14,
    fontFamily: theme.fonts.regular,
    color: colors.textPrimary,
    minHeight: 60,
    textAlignVertical: "top",
  },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.cardDark,
    borderRadius: 28,
    paddingVertical: 16,
    marginTop: 20,
  },
  saveBtnText: {
    fontSize: 16,
    fontWeight: "700",
    fontFamily: theme.fonts.bold,
    color: colors.pillText,
  },
});
