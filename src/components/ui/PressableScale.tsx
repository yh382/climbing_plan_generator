// src/components/ui/PressableScale.tsx
// Design Language v1 (docs/DESIGN_LANGUAGE.md §4.1) — the app-wide press
// feedback for JS-rendered pressables: scale 0.97 + opacity 0.96 on press-in,
// plain timing out (NO spring — device feedback 2026-07-01: overshoot read
// as "bouncing"). A 70ms press-in delay keeps scroll-through touches from
// flashing the effect: if the gesture turns into a scroll within the delay,
// the press cancels and nothing animates.
//
// Exempt (do NOT wrap): native chrome — Stack.Toolbar, HeaderButton,
// SegmentedControl, MenuPill, ActionSheetIOS. UIKit owns their press states.

import React, { useCallback } from "react";
import {
  Pressable,
  type GestureResponderEvent,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const PRESS_IN_DELAY_MS = 70;

export type PressableScaleProps = Omit<PressableProps, "style"> & {
  /** Static style only — press feedback is injected, so the function form
   *  of Pressable's style prop is intentionally unsupported. */
  style?: StyleProp<ViewStyle>;
};

export default function PressableScale({
  style,
  onPressIn,
  onPressOut,
  ...rest
}: PressableScaleProps) {
  const pressed = useSharedValue(0);

  const handlePressIn = useCallback(
    (e: GestureResponderEvent) => {
      pressed.value = withTiming(1, { duration: 100 });
      onPressIn?.(e);
    },
    [pressed, onPressIn],
  );

  const handlePressOut = useCallback(
    (e: GestureResponderEvent) => {
      pressed.value = withTiming(0, { duration: 150 });
      onPressOut?.(e);
    },
    [pressed, onPressOut],
  );

  const feedbackStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - pressed.value * 0.03 }],
    opacity: 1 - pressed.value * 0.04,
  }));

  return (
    <AnimatedPressable
      unstable_pressDelay={PRESS_IN_DELAY_MS}
      {...rest}
      style={[style, feedbackStyle]}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    />
  );
}
