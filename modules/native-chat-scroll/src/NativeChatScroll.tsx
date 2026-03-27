import React from "react";
import { requireNativeView } from "expo";
import { Platform, ScrollView, type ViewProps } from "react-native";

export interface NativeChatScrollProps extends ViewProps {
  /** Increment to trigger scroll-to-bottom animation */
  scrollTrigger?: number;
  /** Increment to scroll so the user's latest bubble is at the top */
  scrollToUserTrigger?: number;
  /** Measured height of the RN content (from onLayout) */
  contentHeight?: number;
  /** Extra bottom padding for floating input bar */
  contentPaddingBottom?: number;
  /** Show scroll indicators */
  showsIndicators?: boolean;
  children: React.ReactNode;
}

const NativeView = Platform.OS === "ios"
  ? requireNativeView<NativeChatScrollProps>("NativeChatScroll")
  : null;

/**
 * UIKit UIScrollView with iOS 26 scroll edge effect.
 * On Android, falls back to a plain ScrollView.
 */
export function NativeChatScroll({ children, style, ...props }: NativeChatScrollProps) {
  if (NativeView) {
    return (
      <NativeView style={style} {...props}>
        {children}
      </NativeView>
    );
  }

  // Android fallback
  return (
    <ScrollView
      style={style}
      contentContainerStyle={{ paddingBottom: props.contentPaddingBottom }}
      showsVerticalScrollIndicator={props.showsIndicators}
    >
      {children}
    </ScrollView>
  );
}
