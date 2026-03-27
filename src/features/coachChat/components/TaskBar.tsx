import { useEffect, useMemo } from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { useThemeColors } from "@/lib/useThemeColors";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
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
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { tr } = useSettings();

  const opacity = useSharedValue(visible ? 1 : 0);
  const translateY = useSharedValue(visible ? 0 : 20);
  const height = useSharedValue(visible ? 44 : 0);

  useEffect(() => {
    opacity.value = withTiming(visible ? 1 : 0, { duration: 300 });
    translateY.value = withTiming(visible ? 0 : 20, { duration: 300 });
    height.value = withTiming(visible ? 44 : 0, { duration: 300 });
  }, [visible]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
    height: height.value,
    overflow: "hidden" as const,
  }));

  return (
    <Animated.View
      style={[styles.container, animStyle]}
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
              color={active ? colors.accent : colors.textSecondary}
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

const createStyles = (colors: ReturnType<typeof useThemeColors>) => StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
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
    borderColor: colors.cardBorder,
    backgroundColor: colors.cardBackground,
  },
  chipActive: {
    borderColor: colors.accent,
    backgroundColor: "rgba(48,110,111,0.08)",
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  labelActive: {
    color: colors.accent,
  },
});
