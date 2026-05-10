// app/session-log-workout.tsx
// Native iOS formSheet route for logging a workout completion + intensity.
// Migrated from src/features/session/components/LogWorkoutSheet.tsx
// (sheet-container-audit A1). On Save, emits a signal via
// useSessionSheetHandoffStore that the caller (training/exercise) picks up
// and uses to mark the exercise completed.

import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { theme } from "@/lib/theme";
import { useThemeColors } from "@/lib/useThemeColors";
import { useSettings } from "@/contexts/SettingsContext";
import useSessionSheetHandoffStore from "@/store/useSessionSheetHandoffStore";

type Intensity = "light" | "moderate" | "hard";

const COMPLETION_OPTIONS = [
  { value: 0.25, label: "25%" },
  { value: 0.5, label: "50%" },
  { value: 0.75, label: "75%" },
  { value: 1, label: "100%" },
];

const INTENSITY_OPTIONS: { value: Intensity; zhLabel: string; enLabel: string; icon: string }[] = [
  { value: "light", zhLabel: "轻松", enLabel: "Light", icon: "sunny-outline" },
  { value: "moderate", zhLabel: "适中", enLabel: "Moderate", icon: "flame-outline" },
  { value: "hard", zhLabel: "高强度", enLabel: "Hard", icon: "flash-outline" },
];

export default function SessionLogWorkoutRoute() {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const { tr } = useSettings();
  const router = useRouter();
  const navigation = useNavigation();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const params = useLocalSearchParams<{ exerciseName?: string }>();
  const exerciseName = params.exerciseName ?? "";

  useEffect(() => {
    navigation.setOptions({ title: tr("记录训练", "Log Workout") });
  }, [navigation, tr]);

  const emitWorkoutLogged = useSessionSheetHandoffStore((s) => s.emitWorkoutLogged);

  const [completion, setCompletion] = useState(1);
  const [intensity, setIntensity] = useState<Intensity>("moderate");
  const [notes, setNotes] = useState("");

  const handleSave = () => {
    // Note: completion / intensity / notes are intentionally not persisted —
    // the existing caller (training/exercise.tsx) discards them. Migration
    // preserves the UI but doesn't add new persistence logic.
    void completion;
    void intensity;
    void notes;
    emitWorkoutLogged();
    router.back();
  };

  return (
    <>
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 20, paddingTop: 4 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {exerciseName ? (
          <Text style={styles.exerciseName} numberOfLines={1}>{exerciseName}</Text>
        ) : null}

        <Text style={styles.label}>{tr("完成度", "Completion")}</Text>
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

        <Text style={styles.label}>{tr("强度", "Intensity")}</Text>
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
                {tr(opt.zhLabel, opt.enLabel)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>{tr("备注", "Notes")}</Text>
        <TextInput
          style={styles.input}
          placeholder={tr("补充说明 (可选)", "Optional notes...")}
          placeholderTextColor={colors.textTertiary}
          value={notes}
          onChangeText={setNotes}
          multiline
          maxLength={200}
        />

        <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
          <Ionicons name="checkmark-circle" size={20} color={colors.pillText} />
          <Text style={styles.saveBtnText}>{tr("保存", "Save")}</Text>
        </TouchableOpacity>
      </ScrollView>
    </>
  );
}

const createStyles = (colors: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    exerciseName: {
      fontSize: 14,
      fontFamily: theme.fonts.regular,
      color: colors.textSecondary,
      marginBottom: 8,
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
