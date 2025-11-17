import React, { useMemo, useState } from "react";
import { Dimensions, View, Pressable, Text, Platform } from "react-native";
import Animated, { useAnimatedStyle, interpolate, useDerivedValue } from "react-native-reanimated";
import HorizontalSlide from "./HorizontalSlide";

type CardCarouselProps<T> = {
  data: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  /** 视口左右边距（让首尾居中） */
  horizontalPadding?: number; // e.g., 24
  /** 卡片之间的间距 */
  cardGap?: number; // e.g., 12
  /** 右侧露出下一张的宽度 */
  peekWidth?: number; // e.g., 32
  /** 初始索引 */
  initialIndex?: number;
  /** 受控索引 */
  index?: number;
  onIndexChange?: (idx: number) => void;
  /** 是否显示左右箭头 */
  showArrows?: boolean;
  /** 是否显示底部指示点 */
  showIndicators?: boolean;
  /** 主卡轻微放大 */
  scaleOnFocus?: boolean;
};

const { width: W } = Dimensions.get("window");

export default function CardCarousel<T>({
  data,
  renderItem,
  horizontalPadding = 24,
  cardGap = 12,
  peekWidth = 32,
  initialIndex = 0,
  index,
  onIndexChange,
  showArrows = true,
  showIndicators = true,
  scaleOnFocus = true,
}: CardCarouselProps<T>) {
  const pageWidth = useMemo(
    () => (W - horizontalPadding * 2 - peekWidth), 
    [horizontalPadding, peekWidth]
  );
  const cardWidth = pageWidth;
  const pageCount = data.length;

  const [uncontrolledIndex, setUncontrolledIndex] = useState(initialIndex);
  const currentIndex = typeof index === "number" ? index : uncontrolledIndex;

  const handleIndexChange = (i: number) => {
    if (typeof index !== "number") setUncontrolledIndex(i);
    onIndexChange?.(i);
  };

  return (
    <View style={{ width: W, paddingHorizontal: horizontalPadding }}>
      {/* 轨道容器：放置滑动区 */}
      <View style={{ height: 300, overflow: "visible" }}>
        <View style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }} pointerEvents="none" />

        <View style={{ flexDirection: "row" }}>
          <HorizontalSlide
            pageCount={pageCount}
            pageWidth={cardWidth + cardGap}
            contentInset={horizontalPadding}
            initialIndex={initialIndex}
            index={index}
            onIndexChange={handleIndexChange}
          >
            {data.map((item, i) => {
              // 聚焦卡片的轻微放大/透明度
              const style = useAnimatedStyle(() => {
                // 用 transformX 推导“当前滑动到第几页”的插值，需要父层传递或后续扩展
                // 这里简化：用指示器 currentIndex 来做离散缩放（更稳定）
                const s = scaleOnFocus ? (i === currentIndex ? 1.03 : 0.98) : 1;
                const o = i === currentIndex ? 1 : 0.9;
                return {
                  transform: [{ scale: s }],
                  opacity: o,
                };
              });
              return (
                <Animated.View
                  key={i}
                  style={{
                    width: cardWidth,
                    marginRight: i === pageCount - 1 ? 0 : cardGap,
                  }}
                >
                  <Animated.View
                    style={[
                      {
                        borderRadius: 16,
                        padding: 16,
                        backgroundColor: "#FFFFFF",
                        shadowColor: "#000",
                        shadowOpacity: 0.08,
                        shadowRadius: 12,
                        shadowOffset: { width: 0, height: 6 },
                        elevation: Platform.OS === "android" ? 4 : 0,
                      },
                      style,
                    ]}
                  >
                    {renderItem(item, i)}
                  </Animated.View>
                </Animated.View>
              );
            })}
          </HorizontalSlide>
        </View>
      </View>

      {/* 箭头 */}
      {showArrows && (
        <View style={{ marginTop: 12, flexDirection: "row", justifyContent: "space-between" }}>
          <Pressable
            accessibilityLabel="上一页"
            disabled={currentIndex <= 0}
            onPress={() => handleIndexChange(Math.max(0, currentIndex - 1))}
            style={({ pressed }) => ({
              opacity: currentIndex <= 0 ? 0.4 : pressed ? 0.7 : 1,
              paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: "#F3F4F6",
            })}
          >
            <Text>{"‹"}</Text>
          </Pressable>
          <Pressable
            accessibilityLabel="下一页"
            disabled={currentIndex >= pageCount - 1}
            onPress={() => handleIndexChange(Math.min(pageCount - 1, currentIndex + 1))}
            style={({ pressed }) => ({
              opacity: currentIndex >= pageCount - 1 ? 0.4 : pressed ? 0.7 : 1,
              paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: "#F3F4F6",
            })}
          >
            <Text>{"›"}</Text>
          </Pressable>
        </View>
      )}

      {/* 指示点 */}
      {showIndicators && (
        <View style={{ marginTop: 10, flexDirection: "row", justifyContent: "center", gap: 6 }}>
          {data.map((_, i) => (
            <View
              key={i}
              style={{
                width: i === currentIndex ? 8 : 6,
                height: i === currentIndex ? 8 : 6,
                borderRadius: 999,
                backgroundColor: i === currentIndex ? "#111827" : "#D1D5DB",
              }}
            />
          ))}
        </View>
      )}
    </View>
  );
}
