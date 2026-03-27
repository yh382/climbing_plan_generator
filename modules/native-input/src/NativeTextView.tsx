import React from "react";
import { Platform } from "react-native";
import { requireNativeView } from "expo";
import type { NativeTextViewProps, NativeTextViewNativeProps } from "./NativeTextView.types";

type RawProps = Omit<NativeTextViewProps, "onChangeText" | "onSubmitEditing" | "onHeightChange" | "onFocus" | "onBlur"> & NativeTextViewNativeProps;

const RawNativeTextView =
  Platform.OS === "ios" ? requireNativeView<RawProps>("NativeTextView") : null;

/**
 * Native UITextView wrapper with auto-grow and submit-on-return.
 * iOS only — renders nothing on Android.
 *
 * Maps public props (onChangeText, etc.) to prefixed native events
 * (onNativeChangeText, etc.) to avoid collision with RN built-in events.
 */
export function NativeTextView({
  onChangeText,
  onSubmitEditing,
  onHeightChange,
  onFocus,
  onBlur,
  ...rest
}: NativeTextViewProps) {
  if (!RawNativeTextView) return null;

  return (
    <RawNativeTextView
      {...rest}
      onNativeChangeText={onChangeText}
      onNativeSubmitEditing={onSubmitEditing}
      onNativeHeightChange={onHeightChange}
      onTextViewFocus={onFocus}
      onTextViewBlur={onBlur}
    />
  );
}
