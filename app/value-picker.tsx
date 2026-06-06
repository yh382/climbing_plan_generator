// app/value-picker.tsx
// Generic numeric value picker formSheet, wheel-based.
//
// One route handles all wheel input across the app: rest duration
// (2-wheel min/sec), reps count (1-wheel), load weight or % max
// (1-wheel + unit label). Aligns with the app's other formSheet
// routes: ScrollView at the route's root (no wrapper view),
// native UIKit nav bar via root layout (X close on the left),
// filled accent Save pill at the bottom of the body.
//
// FRONTEND_MAP §A1 Variant 2 handoff via useValuePickerHandoffStore.

import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";

import { useThemeColors } from "@/lib/useThemeColors";
import { useSettings } from "@/contexts/SettingsContext";
import { theme } from "@/lib/theme";
import useValuePickerHandoffStore from "../src/store/useValuePickerHandoffStore";

// Duration mode: 0–10 min × 0–59 sec (1-second granularity — climbing
// hangboard / repeater protocols routinely need 7s / 17s / 23s values).
const MIN_OPTIONS = Array.from({ length: 11 }, (_, i) => i);
const SEC_OPTIONS = Array.from({ length: 60 }, (_, i) => i);

function splitDuration(total: number) {
  const clamped = Math.max(0, Math.min(600, Math.round(total)));
  const min = Math.min(10, Math.floor(clamped / 60));
  const sec = clamped % 60;
  return { min, sec };
}

export default function ValuePickerRoute() {
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const { tr } = useSettings();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const request = useValuePickerHandoffStore((s) => s.request);
  const setResult = useValuePickerHandoffStore((s) => s.setResult);

  // Lifecycle ownership (FRONTEND_MAP §A1): route owns the output slot.
  useEffect(() => () => setResult(null), [setResult]);

  // Duration: split into min + sec local state.
  // Count / load: single integer local state.
  const initialSplit = splitDuration(request?.initial ?? 0);
  const [min, setMin] = useState(initialSplit.min);
  const [sec, setSec] = useState(initialSplit.sec);
  const [value, setValue] = useState(request?.initial ?? 0);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: request?.title ?? tr("选择", "Pick"),
    });
  }, [navigation, request?.title, tr]);

  const handleDone = useCallback(() => {
    const out =
      request?.mode === "duration" ? min * 60 + sec : value;
    setResult({
      targetId: request?.targetId ?? "*",
      value: out,
    });
    router.back();
  }, [request?.mode, request?.targetId, min, sec, value, router, setResult]);

  const mode = request?.mode ?? "duration";
  const unitLabel = request?.unitLabel ?? "";

  // Build the integer options for count / load wheels from the request
  // bounds (caller-driven so a "reps" wheel doesn't have to scroll past
  // 500). Default upper bound: 60 for count, 500 for load.
  const integerOptions = useMemo(() => {
    if (mode === "duration") return [] as number[];
    const max = request?.max ?? (mode === "load" ? 500 : 60);
    const step = request?.step ?? (mode === "load" ? 5 : 1);
    const opts: number[] = [];
    for (let v = 0; v <= max; v += step) opts.push(v);
    return opts;
  }, [mode, request?.max, request?.step]);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
      // The body is the wheel — no flick-scroll interaction expected.
      // Wrapping in ScrollView regardless because that's the
      // app-wide formSheet root pattern (avoids the wrapper-View
      // collapse documented in recent-climbs.tsx).
      scrollEnabled={false}
    >
      {mode === "duration" ? (
        <View style={styles.wheelsRow}>
          <View style={styles.wheelCol}>
            <Picker
              selectedValue={min}
              onValueChange={(v) => setMin(Number(v))}
              itemStyle={{ color: colors.textPrimary, fontSize: 22 }}
            >
              {MIN_OPTIONS.map((m) => (
                <Picker.Item
                  key={m}
                  label={`${m} ${tr("分", "Min")}`}
                  value={m}
                />
              ))}
            </Picker>
          </View>
          <View style={styles.wheelCol}>
            <Picker
              selectedValue={sec}
              onValueChange={(v) => setSec(Number(v))}
              itemStyle={{ color: colors.textPrimary, fontSize: 22 }}
            >
              {SEC_OPTIONS.map((s) => (
                <Picker.Item
                  key={s}
                  label={`${s} ${tr("秒", "Sec")}`}
                  value={s}
                />
              ))}
            </Picker>
          </View>
        </View>
      ) : (
        <View style={styles.singleWheelWrap}>
          <Picker
            selectedValue={value}
            onValueChange={(v) => setValue(Number(v))}
            itemStyle={{ color: colors.textPrimary, fontSize: 24 }}
          >
            {integerOptions.map((v) => (
              <Picker.Item
                key={v}
                label={unitLabel ? `${v} ${unitLabel}` : String(v)}
                value={v}
              />
            ))}
          </Picker>
        </View>
      )}

      {/* Save pill — matches outdoor-create-list / tags-picker. */}
      <TouchableOpacity
        style={styles.saveBtn}
        onPress={handleDone}
        accessibilityRole="button"
        accessibilityLabel={tr("完成", "Done")}
      >
        <Ionicons name="checkmark" size={20} color="#FFF" />
        <Text style={styles.saveText}>{tr("完成", "Done")}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const createStyles = (colors: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    wheelsRow: {
      flexDirection: "row",
      paddingHorizontal: 8,
      paddingTop: 8,
    },
    wheelCol: { flex: 1 },
    singleWheelWrap: { paddingTop: 8 },
    saveBtn: {
      marginTop: 24,
      marginHorizontal: 16,
      paddingVertical: 14,
      borderRadius: 999,
      backgroundColor: colors.accent,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
    },
    saveText: {
      color: "#FFF",
      fontFamily: theme.fonts.bold,
      fontSize: 16,
      fontWeight: "800",
    },
  });
