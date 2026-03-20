import React from "react";
import { TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface IconButtonProps {
  icon: keyof typeof Ionicons.glyphMap;
  active?: boolean;
  dark?: boolean;
  onPress: () => void;
  ghost?: boolean;
}

export function IconButton({ icon, active, dark, onPress, ghost = true }: IconButtonProps) {
  const bg = ghost
    ? "transparent"
    : active
      ? dark ? "rgba(59,130,246,0.22)" : "#e8eefc"
      : dark ? "rgba(15,23,42,0.7)" : "white";
  const border = active ? (dark ? "rgba(148,197,255,0.6)" : "#93c5fd") : "transparent";
  const color = active ? "#2563EB" : dark ? "#E2E8F0" : "#1F2937";

  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        width: 44,
        height: 44,
        borderRadius: 16,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: bg,
        borderWidth: active ? 1 : 0,
        borderColor: border,
      }}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <Ionicons name={icon} size={22} color={color} />
    </TouchableOpacity>
  );
}
