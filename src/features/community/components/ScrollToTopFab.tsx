// src/features/community/components/ScrollToTopFab.tsx
// Floating action button that fades in after the user scrolls down past a
// threshold. Tap scrolls the containing list back to the top. Positioned
// above the native tab bar so it doesn't collide with the bar's controls.

import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useThemeColors } from "../../../lib/useThemeColors";
import { useSettings } from "../../../contexts/SettingsContext";

// Matches the NATIVE_TAB_BAR_HEIGHT constant used elsewhere in the app
// (e.g. src/features/coachChat/components/Composer.tsx).
const NATIVE_TAB_BAR_HEIGHT = 49;
const FAB_SIZE = 44;

type Props = {
  visible: boolean;
  onPress: () => void;
  /** Stack the FAB above the global FloatingActiveSessionTimer pill when an
   *  active session / workout is displayed so the two don't overlap. */
  elevated?: boolean;
};

// FloatingActiveSessionTimer occupies roughly 60pt + 15pt gap from the tab
// bar. When elevated, lift the FAB above that stack.
const FLOAT_PILL_RESERVED = 60 + 15;

export default function ScrollToTopFab({ visible, onPress, elevated = false }: Props) {
  const colors = useThemeColors();
  const { tr } = useSettings();
  const insets = useSafeAreaInsets();
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: visible ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [visible, opacity]);

  const bottom =
    insets.bottom + NATIVE_TAB_BAR_HEIGHT + 16 + (elevated ? FLOAT_PILL_RESERVED : 0);

  return (
    <Animated.View
      pointerEvents={visible ? "auto" : "none"}
      style={[
        styles.wrap,
        {
          opacity,
          bottom,
        },
      ]}
    >
      <TouchableOpacity
        style={[styles.button, { backgroundColor: colors.cardDark }]}
        activeOpacity={0.8}
        onPress={onPress}
        accessibilityLabel={tr("回到顶部", "Scroll to top")}
        accessibilityRole="button"
      >
        <Ionicons name="arrow-up" size={22} color="#FFFFFF" />
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    right: 16,
    zIndex: 100,
  },
  button: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
  },
});
