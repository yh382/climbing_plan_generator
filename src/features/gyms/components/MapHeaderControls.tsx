import React from "react";
import { View, TouchableOpacity, Platform, StyleSheet } from "react-native";
import Animated, { useAnimatedStyle, interpolate, Extrapolate } from "react-native-reanimated";
import type { SharedValue } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import type { EdgeInsets } from "react-native-safe-area-context";
import { IconButton } from "./IconButton";

interface MapHeaderControlsProps {
  animatedIndex: SharedValue<number>;
  sheetIndex: number;
  insets: EdgeInsets;
  scheme: "light" | "dark" | null | undefined;
  isAtUser: boolean;
  styleId: "outdoors" | "satellite";
  is3D: boolean;
  onBack: () => void;
  onToggleStyle: () => void;
  onToggle3D: () => void;
  onLocate: () => void;
}

export function MapHeaderControls({
  animatedIndex,
  sheetIndex,
  insets,
  scheme,
  isAtUser,
  styleId,
  is3D,
  onBack,
  onToggleStyle,
  onToggle3D,
  onLocate,
}: MapHeaderControlsProps) {
  const isDark = scheme === "dark";

  const headerAnimStyle = useAnimatedStyle(() => ({
    opacity: interpolate(animatedIndex.value, [1, 1.7, 2], [1, 1, 0], Extrapolate.CLAMP),
    transform: [
      {
        translateY: interpolate(animatedIndex.value, [1, 2], [0, -40], Extrapolate.CLAMP),
      },
    ],
  }));

  return (
    <Animated.View
      style={[styles.headerButtonsWrap, { top: insets.top + 8 }, headerAnimStyle]}
      pointerEvents={sheetIndex === 2 ? "none" : "auto"}
    >
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={onBack}
        style={[styles.backButton, isDark && styles.backButtonDark]}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name="chevron-back" size={22} color={isDark ? "#E2E8F0" : "#1F2937"} />
      </TouchableOpacity>

      <View style={{ flex: 1 }} />

      <View style={[styles.controlCard, isDark && styles.controlCardDark]}>
        <IconButton
          icon={styleId === "outdoors" ? "layers-outline" : "image-outline"}
          onPress={onToggleStyle}
          dark={isDark}
        />
        <IconButton icon={is3D ? "cube" : "cube-outline"} active={is3D} onPress={onToggle3D} dark={isDark} />
        {!isAtUser && <IconButton icon="locate" dark={isDark} onPress={onLocate} />}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  headerButtonsWrap: {
    position: "absolute",
    left: 12,
    right: 12,
    zIndex: 50,
    elevation: 50,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.96)",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: Platform.OS === "android" ? 8 : 0,
  },
  backButtonDark: { backgroundColor: "rgba(15,23,42,0.92)" },
  controlCard: {
    backgroundColor: "rgba(255,255,255,0.96)",
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 6,
    gap: 8,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: Platform.OS === "android" ? 8 : 0,
  },
  controlCardDark: { backgroundColor: "rgba(15,23,42,0.92)" },
});
