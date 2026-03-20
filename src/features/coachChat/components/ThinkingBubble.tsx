import React, { useEffect } from "react";
import { View } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
} from "react-native-reanimated";

const DOT_SIZE = 8;
const DOT_COLOR = "#9CA3AF";
const DURATION = 400;

function PulsingDot({ delay }: { delay: number }) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.4);

  useEffect(() => {
    scale.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1.3, { duration: DURATION }),
          withTiming(1, { duration: DURATION }),
        ),
        -1,
      ),
    );
    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: DURATION }),
          withTiming(0.4, { duration: DURATION }),
        ),
        -1,
      ),
    );
  }, [delay, scale, opacity]);

  const style = useAnimatedStyle(() => ({
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    backgroundColor: DOT_COLOR,
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return <Animated.View style={style} />;
}

export default function ThinkingBubble() {
  return (
    <View style={{ paddingHorizontal: 16, paddingVertical: 6, alignItems: "flex-start" }}>
      <View
        style={{
          borderRadius: 18,
          paddingHorizontal: 18,
          paddingVertical: 14,
          backgroundColor: "#FFFFFF",
          borderWidth: 0.8,
          borderColor: "#E5E7EB",
          flexDirection: "row",
          gap: 6,
        }}
      >
        <PulsingDot delay={0} />
        <PulsingDot delay={150} />
        <PulsingDot delay={300} />
      </View>
    </View>
  );
}
