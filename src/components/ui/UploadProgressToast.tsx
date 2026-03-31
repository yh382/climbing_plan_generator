import React, { useEffect } from "react";
import { View, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedProps,
  withTiming,
  withSpring,
} from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";
import { Ionicons } from "@expo/vector-icons";
import { useThemeColors } from "@/lib/useThemeColors";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const SIZE = 40;
const STROKE = 3;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

type Props = {
  visible: boolean;
  progress: number; // 0-100
  fileName?: string;
  onDismiss: () => void;
};

export default function UploadProgressToast({
  visible,
  progress,
  onDismiss,
}: Props) {
  const colors = useThemeColors();
  const scale = useSharedValue(0);
  const animatedProgress = useSharedValue(0);

  useEffect(() => {
    scale.value = visible
      ? withSpring(1, { damping: 28, stiffness: 300 })
      : withTiming(0, { duration: 150 });
  }, [visible]);

  useEffect(() => {
    animatedProgress.value = withTiming(Math.min(100, progress), {
      duration: 300,
    });
  }, [progress]);

  useEffect(() => {
    if (progress >= 100) {
      const timer = setTimeout(onDismiss, 1200);
      return () => clearTimeout(timer);
    }
  }, [progress]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: scale.value,
  }));

  const progressProps = useAnimatedProps(() => ({
    strokeDashoffset:
      CIRCUMFERENCE * (1 - animatedProgress.value / 100),
  }));

  const done = progress >= 100;

  return (
    <Animated.View
      style={[
        styles.container,
        animStyle,
        { backgroundColor: colors.backgroundSecondary },
      ]}
    >
      <Svg width={SIZE} height={SIZE}>
        {/* Track */}
        <Circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          stroke={colors.border}
          strokeWidth={STROKE}
          fill="none"
        />
        {/* Progress */}
        <AnimatedCircle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          stroke={done ? "#34C759" : colors.accent}
          strokeWidth={STROKE}
          fill="none"
          strokeDasharray={CIRCUMFERENCE}
          animatedProps={progressProps}
          strokeLinecap="round"
          rotation={-90}
          origin={`${SIZE / 2}, ${SIZE / 2}`}
        />
      </Svg>
      <View style={styles.iconWrap}>
        <Ionicons
          name={done ? "checkmark" : "arrow-up"}
          size={16}
          color={done ? "#34C759" : colors.textSecondary}
        />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 120,
    left: 16,
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  iconWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
});
