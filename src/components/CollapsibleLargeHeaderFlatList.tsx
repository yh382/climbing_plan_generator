// components/CollapsibleLargeHeaderFlatList.tsx
import React, { ReactNode } from "react";
import { View, Text, StyleSheet, StyleProp, ViewStyle, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import { GlassView } from "expo-glass-effect";
import Animated, {
  Extrapolate,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";

type CollapsibleLargeHeaderFlatListProps<ItemT> = {
  // Header content
  largeTitle: ReactNode;
  subtitle?: ReactNode;
  smallTitle: ReactNode;

  // Actions
  leftActions?: ReactNode;
  rightActions?: ReactNode;

  // Layout tuning
  leftSlotWidth?: number;
  rightSlotWidth?: number;
  threshold?: number;
  headerHeight?: number;
  backgroundColor?: string;

  // List config
  data: ReadonlyArray<ItemT>;
  renderItem: any;
  keyExtractor: (item: ItemT, index: number) => string;

  // List header below big title
  listHeader?: ReactNode;

  // Styles
  contentContainerStyle?: StyleProp<ViewStyle>;
  bottomInsetExtra?: number;

  // FlatList passthrough
  showsVerticalScrollIndicator?: boolean;
};

export default function CollapsibleLargeHeaderFlatList<ItemT>({
  largeTitle,
  subtitle,
  smallTitle,
  leftActions,
  rightActions,
  leftSlotWidth = 48,
  rightSlotWidth,
  threshold = 44,
  headerHeight = 44,
  backgroundColor = "#FFFFFF",

  data,
  renderItem,
  keyExtractor,

  listHeader,

  contentContainerStyle,
  bottomInsetExtra = 28,

  showsVerticalScrollIndicator = false,
}: CollapsibleLargeHeaderFlatListProps<ItemT>) {
  const insets = useSafeAreaInsets();
  const rightW = rightSlotWidth ?? leftSlotWidth;

  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });

  // Header blur in
  const headerBlurStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [0, threshold], [0, 1], Extrapolate.CLAMP),
  }));

  // Center small title in
  const headerTitleStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [threshold - 10, threshold + 10], [0, 1], Extrapolate.CLAMP),
    transform: [
      { translateY: interpolate(scrollY.value, [threshold - 10, threshold + 10], [10, 0], Extrapolate.CLAMP) },
    ],
  }));

  // Big title fade out
  const bigTitleStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [0, threshold], [1, 0], Extrapolate.CLAMP),
    transform: [
      { scale: interpolate(scrollY.value, [0, threshold], [1, 0.94], Extrapolate.CLAMP) },
      { translateY: interpolate(scrollY.value, [0, threshold], [0, -10], Extrapolate.CLAMP) },
    ],
  }));

  const renderSmallTitle = () => {
    if (typeof smallTitle === "string") {
      return <Text style={styles.headerTitleText}>{smallTitle}</Text>;
    }
    return smallTitle;
  };

  const HeaderSpacer = <View style={{ height: insets.top + 10 }} />;

  return (
    <View style={[styles.page, { backgroundColor }]}>
      {/* Fixed header */}
      <View style={[styles.fixedHeader, { height: insets.top + headerHeight }]}>
        <Animated.View style={[StyleSheet.absoluteFill, headerBlurStyle]}>
          {Platform.OS === "ios" ? (
            <GlassView glassEffectStyle="regular" style={StyleSheet.absoluteFill} />
          ) : (
            <BlurView intensity={80} tint="light" style={StyleSheet.absoluteFill} />
          )}
          <View style={styles.headerBorder} />
        </Animated.View>

        <View style={[styles.headerContent, { marginTop: insets.top }]}>
          {/* left */}
          <View style={[styles.slot, { width: leftSlotWidth }]}>{leftActions ?? null}</View>

          {/* center */}
          <Animated.View style={[styles.headerTitleContainer, headerTitleStyle]} pointerEvents="none">
            {renderSmallTitle()}
          </Animated.View>

          {/* right */}
          <View style={[styles.slot, styles.headerRightRow, { width: rightW }]}>
            {rightActions ?? null}
          </View>
        </View>
      </View>

      <Animated.FlatList
        data={data as any}
        renderItem={renderItem}
        keyExtractor={keyExtractor as any}
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={showsVerticalScrollIndicator}
        ListHeaderComponent={
          <View>
            {HeaderSpacer}

            <View style={styles.bigTitleRow}>
              <Animated.View style={[styles.bigHeaderArea, bigTitleStyle]}>
                {largeTitle}
                {subtitle ? <View style={{ marginTop: 4 }}>{subtitle}</View> : null}
              </Animated.View>
              <View style={{ width: rightW }} />
            </View>

            {listHeader ? <View>{listHeader}</View> : null}
          </View>
        }
        contentContainerStyle={[
          {
            paddingBottom: insets.bottom + bottomInsetExtra,
          },
          contentContainerStyle as any,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },

  fixedHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
  },
  headerBorder: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: "rgba(0,0,0,0.05)",
  },
  headerContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
  },
  slot: {
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitleContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
  },
  headerTitleText: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111",
  },
  headerRightRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 6,
  },

  bigTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  bigHeaderArea: {
    flex: 1,
    paddingTop: 35, // ✅ 控制大标题纵向位置（次级页面统一从这里调）
  },
});
