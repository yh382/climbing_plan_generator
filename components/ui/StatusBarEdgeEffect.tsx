import React, { useEffect, useState } from "react";
import { Platform, findNodeHandle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated from "react-native-reanimated";

let NativeView: React.ComponentType<any> | null = null;
if (Platform.OS === "ios") {
  try {
    const { requireNativeView } = require("expo");
    NativeView = requireNativeView("StatusBarEdge");
  } catch (e) {}
}

interface Props {
  scrollRef: React.RefObject<Animated.ScrollView | null>;
}

export function StatusBarEdgeEffect({ scrollRef }: Props) {
  const insets = useSafeAreaInsets();
  const [scrollTag, setScrollTag] = useState<number | null>(null);

  useEffect(() => {
    // 等 ScrollView mount 完成后拿 tag
    const timer = setTimeout(() => {
      if (scrollRef.current) {
        const tag = findNodeHandle(scrollRef.current);
        if (tag) setScrollTag(tag);
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [scrollRef]);

  if (!NativeView || !scrollTag) return null;

  return (
    <NativeView
      scrollViewTag={scrollTag}
      pointerEvents="none"
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: insets.top,
        zIndex: 99,
      }}
    />
  );
}
