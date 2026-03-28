import React from "react";
import { type StyleProp, type ViewStyle } from "react-native";
import SegmentedControl from "@react-native-segmented-control/segmented-control";

interface NativeSegmentedControlProps {
  options: string[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  style?: StyleProp<ViewStyle>;
}

/**
 * Cross-platform segmented control via @react-native-segmented-control/segmented-control.
 * iOS: native UISegmentedControl. Android: package-provided styled fallback.
 */
export function NativeSegmentedControl({
  options,
  selectedIndex,
  onSelect,
  style,
}: NativeSegmentedControlProps) {
  return (
    <SegmentedControl
      values={options}
      selectedIndex={selectedIndex}
      onChange={(event) => onSelect(event.nativeEvent.selectedSegmentIndex)}
      style={style}
    />
  );
}
