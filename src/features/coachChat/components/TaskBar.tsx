import { useEffect } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSettings } from "../../../contexts/SettingsContext";
import type { CoachMode } from "../types";

type TaskItem = {
  mode: CoachMode;
  icon: string;
  zh: string;
  en: string;
};

const TASKS: TaskItem[] = [
  { mode: "plan", icon: "calendar-outline", zh: "计划", en: "Plan" },
  { mode: "actions", icon: "barbell-outline", zh: "动作", en: "Actions" },
  { mode: "analysis", icon: "stats-chart-outline", zh: "分析", en: "Analysis" },
];

type Props = {
  currentMode: CoachMode;
  onToggleMode: (mode: CoachMode) => void;
  visible: boolean;
};

export default function TaskBar({ currentMode, onToggleMode, visible }: Props) {
  const { tr } = useSettings();
  const insets = useSafeAreaInsets();

  const opacity = useSharedValue(visible ? 1 : 0);
  const translateY = useSharedValue(visible ? 0 : 20);

  useEffect(() => {
    opacity.value = withTiming(visible ? 1 : 0, { duration: 300 });
    translateY.value = withTiming(visible ? 0 : 20, { duration: 300 });
  }, [visible]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View
      style={[styles.container, { bottom: insets.bottom + 72 }, animStyle]}
      pointerEvents={visible ? "auto" : "none"}
    >
      {TASKS.map((t) => {
        const active = t.mode === currentMode;
        return (
          <Pressable
            key={t.mode}
            onPress={() => onToggleMode(active ? "none" : t.mode)}
            hitSlop={{ top: 8, bottom: 8, left: 10, right: 10 }}
            style={({ pressed }) => [
              styles.chip,
              active && styles.chipActive,
              pressed && { opacity: 0.7 },
            ]}
          >
            <Ionicons
              name={t.icon as any}
              size={16}
              color={active ? "#306E6F" : "#9CA3AF"}
            />
            <Text style={[styles.label, active && styles.labelActive]}>
              {tr(t.zh, t.en)}
            </Text>
          </Pressable>
        );
      })}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    height: 44,
    gap: 12,
    paddingHorizontal: 16,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 0.8,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
  },
  chipActive: {
    borderColor: "#306E6F",
    backgroundColor: "rgba(48,110,111,0.08)",
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#9CA3AF",
  },
  labelActive: {
    color: "#306E6F",
  },
});
