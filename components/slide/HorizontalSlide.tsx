import React, { useEffect, useMemo, useRef } from "react";
import { Dimensions, I18nManager, View } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from "react-native-reanimated";
import {
  Gesture,
  GestureDetector,
} from "react-native-gesture-handler";

type HorizontalSlideProps = {
  /** 卡片总数 */
  pageCount: number;
  /** 受控索引（可选） */
  index?: number;
  /** 非受控初始索引（默认0） */
  initialIndex?: number;
  /** 索引变化回调 */
  onIndexChange?: (idx: number) => void;
  /** 单页宽度（含卡片宽度 + gap），默认=屏宽 */
  pageWidth?: number;
  /** 视口左右安全留白（让首尾也能居中对齐），默认16 */
  contentInset?: number;
  /** 甩动切页速度阈值（像素/秒），默认 600 */
  snapVelocity?: number;
  /** 是否启用（默认启用） */
  enabled?: boolean;
  /** 是否从右至左布局（RTL 自动透传） */
  rtl?: boolean;
  /** 子元素（外层容器会水平移动它们） */
  children: React.ReactNode;
};

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export default function HorizontalSlide({
  pageCount,
  index,
  initialIndex = 0,
  onIndexChange,
  pageWidth = SCREEN_WIDTH,
  contentInset = 16,
  snapVelocity = 600,
  enabled = true,
  rtl = I18nManager.isRTL,
  children,
}: HorizontalSlideProps) {
  const maxIndex = Math.max(0, pageCount - 1);
  const isControlled = typeof index === "number";
  const current = useSharedValue(isControlled ? index! : initialIndex);

  const translateX = useSharedValue(-offsetForIndex(isControlled ? index! : initialIndex));
  const startX = useSharedValue(0);
  const velocityX = useSharedValue(0);

  const totalContentWidth = useMemo(
    () => pageCount * pageWidth,
    [pageCount, pageWidth]
  );

  function offsetForIndex(idx: number) {
    // 让 idx 的卡片居中：左侧偏移 = idx * pageWidth - contentInset
    return idx * pageWidth - contentInset;
  }

  // 同步受控 index
  useEffect(() => {
    if (isControlled && typeof index === "number") {
      current.value = index;
      translateX.value = withTiming(-offsetForIndex(index), { duration: 220 });
    }
  }, [isControlled, index]);

  const clampIndex = (i: number) => Math.min(Math.max(0, i), maxIndex);

  const gesture = Gesture.Pan()
    .enabled(enabled)
    .onBegin(() => {
      startX.value = translateX.value;
    })
    .onChange((e) => {
      // RTL 反向
      const dx = rtl ? -e.translationX : e.translationX;
      translateX.value = startX.value + dx;
      velocityX.value = rtl ? -e.velocityX : e.velocityX;
    })
    .onEnd(() => {
      // 计算目标 index
      const raw = -translateX.value + contentInset;
      const tentative = Math.round(raw / pageWidth);

      // 速度快速甩动时，强制 +1/-1
      let target = tentative;
      if (Math.abs(velocityX.value) > snapVelocity) {
        target = velocityX.value < 0 ? tentative + 1 : tentative - 1;
      }
      target = clampIndex(target);

      const finalOffset = -offsetForIndex(target);
      translateX.value = withSpring(finalOffset, { damping: 18, stiffness: 180 });

      if (!isControlled) {
        current.value = target;
        if (onIndexChange) runOnJS(onIndexChange)(target);
      } else {
        // 受控模式由外部驱动回弹
        if (onIndexChange && target !== index) runOnJS(onIndexChange)(target);
      }
    });

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  // 对外暴露一个 ref 方法（可选）：scrollTo
  const apiRef = useRef<{ scrollTo?: (idx: number, animated?: boolean) => void }>({});

  useEffect(() => {
    apiRef.current.scrollTo = (idx: number, animated = true) => {
      const clamped = clampIndex(idx);
      const finalOffset = -offsetForIndex(clamped);
      translateX.value = animated
        ? withTiming(finalOffset, { duration: 220 })
        : finalOffset;
      if (!isControlled) {
        current.value = clamped;
        onIndexChange?.(clamped);
      } else {
        onIndexChange?.(clamped);
      }
    };
  }, [pageWidth, contentInset]);

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        style={[
          { width: totalContentWidth, flexDirection: "row" },
          containerStyle,
        ]}
      >
        {children}
      </Animated.View>
    </GestureDetector>
  );
}
