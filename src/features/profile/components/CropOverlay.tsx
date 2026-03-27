import React from "react";
import { View, StyleSheet } from "react-native";

type Props = {
  mode: "avatar" | "cover";
  containerSize: number;
};

export default function CropOverlay({ mode, containerSize }: Props) {
  if (mode === "avatar") {
    const diameter = containerSize * 0.72;
    return (
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.centered]}>
        <View
          style={{
            width: diameter,
            height: diameter,
            borderRadius: 999,
            borderWidth: 2,
            borderColor: "rgba(255,255,255,0.92)",
          }}
        />
      </View>
    );
  }

  // Cover mode: 16:9 rectangle with dark mask above/below
  const rectHeight = containerSize * (9 / 16);
  const maskHeight = (containerSize - rectHeight) / 2;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View style={{ height: maskHeight, backgroundColor: "rgba(0,0,0,0.5)" }} />
      <View
        style={{
          height: rectHeight,
          borderTopWidth: 2,
          borderBottomWidth: 2,
          borderColor: "rgba(255,255,255,0.92)",
        }}
      />
      <View style={{ height: maskHeight, backgroundColor: "rgba(0,0,0,0.5)" }} />
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { alignItems: "center", justifyContent: "center" },
});
