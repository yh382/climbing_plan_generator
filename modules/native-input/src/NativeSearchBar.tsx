import React from "react";
import { Platform } from "react-native";
import { requireNativeView } from "expo";
import type { NativeSearchBarProps, NativeSearchBarNativeProps } from "./NativeSearchBar.types";

type RawProps = Omit<NativeSearchBarProps, "onChangeText" | "onSubmitSearch" | "onFocus" | "onBlur" | "onClear" | "onCancel"> & NativeSearchBarNativeProps;

const RawNativeSearchBar =
  Platform.OS === "ios" ? requireNativeView<RawProps>("NativeSearchBar") : null;

/**
 * Native UISearchBar wrapper.
 * iOS only — renders nothing on Android.
 *
 * Maps public props to prefixed native events to avoid collision
 * with RN built-in events (topFocus, topBlur, topChangeText, etc.).
 */
export function NativeSearchBar({
  onChangeText,
  onSubmitSearch,
  onFocus,
  onBlur,
  onClear,
  onCancel,
  ...rest
}: NativeSearchBarProps) {
  if (!RawNativeSearchBar) return null;

  return (
    <RawNativeSearchBar
      {...rest}
      onNativeChangeText={onChangeText}
      onNativeSubmitSearch={onSubmitSearch}
      onSearchBarFocus={onFocus}
      onSearchBarBlur={onBlur}
      onNativeClear={onClear}
      onNativeCancel={onCancel}
    />
  );
}
