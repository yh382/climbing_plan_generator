import React from "react";
import { Platform, type StyleProp, type ViewStyle } from "react-native";
import SegmentedControl from "@react-native-segmented-control/segmented-control";

interface NativeSegmentedControlProps {
  options: string[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  style?: StyleProp<ViewStyle>;
}

/**
 * Native iOS UISegmentedControl via @react-native-segmented-control/segmented-control.
 * Uses UIKit directly (no SwiftUI Host bridge), avoiding rendering conflicts with TrueSheet.
 * Renders nothing on Android (TODO: fallback).
 */
export function NativeSegmentedControl({
  options,
  selectedIndex,
  onSelect,
  style,
}: NativeSegmentedControlProps) {
  if (Platform.OS !== "ios") return null;

  return (
    <SegmentedControl
      values={options}
      selectedIndex={selectedIndex}
      onChange={(event) => onSelect(event.nativeEvent.selectedSegmentIndex)}
      style={style}
    />
  );
}
