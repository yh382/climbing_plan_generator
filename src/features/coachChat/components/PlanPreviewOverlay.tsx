import { useEffect } from "react";
import { Dimensions, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import type { DraftPlan } from "../types";

const PREVIEW_HEIGHT = 150;
const SCREEN_HEIGHT = Dimensions.get("window").height;
const EXPANDED_HEIGHT = SCREEN_HEIGHT * 0.75;

type Props = {
  visible: boolean;
  onClose: () => void;
  plan: DraftPlan | null;
};

export default function PlanPreviewOverlay({ visible, onClose, plan }: Props) {
  const scale = useSharedValue(0.98);
  const translateY = useSharedValue(10);
  const height = useSharedValue(PREVIEW_HEIGHT);

  useEffect(() => {
    if (visible) {
      // Stage 1: float up (120ms), then Stage 2: expand height (200ms)
      scale.value = withSequence(
        withTiming(1, { duration: 120 }),
      );
      translateY.value = withSequence(
        withTiming(0, { duration: 120 }),
      );
      height.value = withSequence(
        withTiming(PREVIEW_HEIGHT, { duration: 120 }), // hold during float
        withTiming(EXPANDED_HEIGHT, { duration: 200 }),
      );
    } else {
      // Reverse: collapse then sink
      height.value = withSequence(
        withTiming(PREVIEW_HEIGHT, { duration: 200 }),
      );
      scale.value = withTiming(0.98, { duration: 120 });
      translateY.value = withTiming(10, { duration: 120 });
    }
  }, [visible, scale, translateY, height]);

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { translateY: translateY.value }],
    height: height.value,
  }));

  const title = plan?.title ?? "Plan Preview";
  const subtitle = plan?.subtitle ?? "No plan yet.";
  const bullets = plan?.bullets ?? [];

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      {/* Dim + blur backdrop */}
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose}>
        <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.25)" }]} />
      </Pressable>

      {/* Card */}
      <Animated.View style={[styles.card, cardStyle]}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          <Pressable onPress={onClose} hitSlop={12}>
            <Ionicons name="chevron-down" size={22} color="rgba(255,255,255,0.8)" />
          </Pressable>
        </View>

        <Text style={styles.subtitle}>{subtitle}</Text>

        {/* Scrollable content */}
        <ScrollView
          style={{ flex: 1, marginTop: 16 }}
          showsVerticalScrollIndicator={false}
        >
          {bullets.map((b, idx) => (
            <View key={`${idx}-${b}`} style={styles.bulletRow}>
              <Text style={styles.bulletDot}>•</Text>
              <Text style={styles.bulletText}>{b}</Text>
            </View>
          ))}
        </ScrollView>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  card: {
    position: "absolute",
    top: SCREEN_HEIGHT * 0.12,
    left: 16,
    right: 16,
    backgroundColor: "#0B1220",
    borderRadius: 22,
    padding: 20,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    color: "#FFF",
    fontSize: 20,
    fontWeight: "900",
    flex: 1,
    paddingRight: 12,
  },
  subtitle: {
    color: "rgba(255,255,255,0.75)",
    marginTop: 8,
    fontSize: 14,
  },
  bulletRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 10,
  },
  bulletDot: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 14,
  },
  bulletText: {
    color: "rgba(255,255,255,0.85)",
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
});
