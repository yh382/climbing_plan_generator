import React, { useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
} from "react-native-reanimated";
import { useThemeColors } from "@/lib/useThemeColors";

const NATIVE_TAB_BAR_HEIGHT = 49;

type Props = {
  visible: boolean;
  progress: number; // 0-100
  fileName?: string;
  onDismiss: () => void;
};

export default function UploadProgressToast({
  visible,
  progress,
  fileName,
  onDismiss,
}: Props) {
  const colors = useThemeColors();
  const translateY = useSharedValue(100);

  useEffect(() => {
    translateY.value = visible
      ? withSpring(0, { damping: 20 })
      : withTiming(100, { duration: 200 });
  }, [visible]);

  useEffect(() => {
    if (progress >= 100) {
      const timer = setTimeout(onDismiss, 1500);
      return () => clearTimeout(timer);
    }
  }, [progress]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View
      style={[
        styles.container,
        animStyle,
        {
          backgroundColor: colors.backgroundSecondary,
          bottom: NATIVE_TAB_BAR_HEIGHT + 60,
        },
      ]}
    >
      <Text style={[styles.label, { color: colors.textPrimary }]}>
        {progress >= 100
          ? "Upload complete"
          : `Uploading${fileName ? ` ${fileName}` : ""}...`}
      </Text>
      <View style={[styles.track, { backgroundColor: colors.border }]}>
        <View
          style={[
            styles.bar,
            {
              width: `${Math.min(100, progress)}%`,
              backgroundColor: colors.accent,
            },
          ]}
        />
      </View>
      <Text style={[styles.pct, { color: colors.textSecondary }]}>
        {Math.round(progress)}%
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 16,
    right: 16,
    borderRadius: 12,
    padding: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  label: { fontSize: 14, fontWeight: "600", marginBottom: 6 },
  track: { height: 4, borderRadius: 2, overflow: "hidden" },
  bar: { height: 4, borderRadius: 2 },
  pct: { fontSize: 12, marginTop: 4, textAlign: "right" },
});
