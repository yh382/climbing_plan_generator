// app/community/arrange.tsx
// Drag-to-reorder media before posting. Custom 2D grid DnD with reanimated.

import React, {
  useState,
  useMemo,
  useCallback,
  useLayoutEffect,
  useRef,
} from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Dimensions,
  ScrollView,
} from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useNavigation } from "@react-navigation/native";
import { useThemeColors } from "src/lib/useThemeColors";
import { theme } from "src/lib/theme";
import { consumePostDraft } from "src/features/community/pendingPostDraft";
import { submitPostInBackground } from "src/features/community/postUploadManager";
import type { PickedMediaItem } from "src/features/community/types";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  type SharedValue,
} from "react-native-reanimated";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import * as Haptics from "expo-haptics";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const COLUMNS = 3;
const GAP = 8;
const PADDING_H = 16;
const ITEM_SIZE = (SCREEN_WIDTH - PADDING_H * 2 - (COLUMNS - 1) * GAP) / COLUMNS;

const SPRING_CONFIG = { damping: 20, stiffness: 200, mass: 0.5 };

// ── Worklet helpers ──

function getPosition(order: number) {
  "worklet";
  const o = typeof order === "number" && !isNaN(order) ? order : 0;
  return {
    x: (o % COLUMNS) * (ITEM_SIZE + GAP),
    y: Math.floor(o / COLUMNS) * (ITEM_SIZE + GAP),
  };
}

function getOrder(posX: number, posY: number, maxOrder: number) {
  "worklet";
  const centerX = posX + ITEM_SIZE / 2;
  const centerY = posY + ITEM_SIZE / 2;
  const col = Math.min(
    Math.max(Math.floor(centerX / (ITEM_SIZE + GAP)), 0),
    COLUMNS - 1,
  );
  const row = Math.max(Math.floor(centerY / (ITEM_SIZE + GAP)), 0);
  const order = row * COLUMNS + col;
  return Math.min(Math.max(order, 0), maxOrder);
}

function reorderPositions(
  current: number[],
  fromOrder: number,
  toOrder: number,
): number[] {
  "worklet";
  const result = current.slice();
  for (let i = 0; i < result.length; i++) {
    const o = result[i];
    if (o === fromOrder) {
      result[i] = toOrder;
    } else if (fromOrder < toOrder && o > fromOrder && o <= toOrder) {
      result[i] = o - 1;
    } else if (fromOrder > toOrder && o >= toOrder && o < fromOrder) {
      result[i] = o + 1;
    }
  }
  return result;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// ── SortableItem ──

type SortableItemProps = {
  item: PickedMediaItem;
  index: number;
  positions: SharedValue<number[]>;
  itemCount: number;
  onDragEnd: (positions: number[]) => void;
  styles: ReturnType<typeof createStyles>;
};

function SortableItem({
  item,
  index,
  positions,
  itemCount,
  onDragEnd,
  styles,
}: SortableItemProps) {
  const isDragging = useSharedValue(false);
  const dragStartX = useSharedValue(0);
  const dragStartY = useSharedValue(0);
  const offsetX = useSharedValue(0);
  const offsetY = useSharedValue(0);
  const itemScale = useSharedValue(1);

  const triggerHaptic = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, []);

  const finishDrag = useCallback(
    (finalPositions: number[]) => {
      onDragEnd(finalPositions);
    },
    [onDragEnd],
  );

  const gesture = Gesture.Pan()
    .activateAfterLongPress(200)
    .onStart(() => {
      isDragging.value = true;
      const pos = getPosition(positions.value[index]);
      dragStartX.value = pos.x;
      dragStartY.value = pos.y;
      offsetX.value = 0;
      offsetY.value = 0;
      itemScale.value = withSpring(0.9, SPRING_CONFIG);
      runOnJS(triggerHaptic)();
    })
    .onUpdate((e) => {
      offsetX.value = e.translationX;
      offsetY.value = e.translationY;

      const currentX = dragStartX.value + e.translationX;
      const currentY = dragStartY.value + e.translationY;
      const newOrder = getOrder(currentX, currentY, itemCount - 1);
      const myOrder = positions.value[index];

      if (newOrder !== myOrder) {
        positions.value = reorderPositions(positions.value, myOrder, newOrder);
      }
    })
    .onEnd(() => {
      const finalPos = getPosition(positions.value[index]);
      offsetX.value = withSpring(finalPos.x - dragStartX.value, SPRING_CONFIG);
      offsetY.value = withSpring(
        finalPos.y - dragStartY.value,
        SPRING_CONFIG,
        () => {
          isDragging.value = false;
        },
      );
      itemScale.value = withSpring(1, SPRING_CONFIG);
      runOnJS(finishDrag)(positions.value.slice());
    })
    .onFinalize(() => {
      if (isDragging.value) {
        const finalPos = getPosition(positions.value[index]);
        offsetX.value = withSpring(
          finalPos.x - dragStartX.value,
          SPRING_CONFIG,
        );
        offsetY.value = withSpring(
          finalPos.y - dragStartY.value,
          SPRING_CONFIG,
          () => {
            isDragging.value = false;
          },
        );
        itemScale.value = withSpring(1, SPRING_CONFIG);
      }
    });

  const animatedStyle = useAnimatedStyle(() => {
    const pos = getPosition(positions.value[index]);

    const isActive = isDragging.value;
    const tx = isActive
      ? dragStartX.value + offsetX.value
      : withSpring(pos.x, SPRING_CONFIG);
    const ty = isActive
      ? dragStartY.value + offsetY.value
      : withSpring(pos.y, SPRING_CONFIG);

    return {
      transform: [
        { translateX: tx },
        { translateY: ty },
        { scale: itemScale.value },
      ],
      zIndex: isActive ? 100 : 0,
      shadowColor: "#000",
      shadowOpacity: withTiming(isActive ? 0.25 : 0, { duration: 200 }),
      shadowRadius: isActive ? 10 : 0,
      shadowOffset: { width: 0, height: isActive ? 5 : 0 },
      elevation: isActive ? 10 : 0,
    };
  });

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        style={[
          styles.cell,
          { width: ITEM_SIZE, height: ITEM_SIZE, position: "absolute" },
          animatedStyle,
        ]}
      >
        <Image
          source={{ uri: (item.mediaType === 'video' && item.coverUri) ? item.coverUri : item.uri }}
          style={styles.cellImage}
          recyclingKey={item.id}
        />

        {/* Number badge */}
        <View style={styles.numberBadge}>
          <Text style={styles.numberBadgeText}>
            {(positions.value[index] ?? index) + 1}
          </Text>
        </View>

        {/* Video duration */}
        {item.mediaType === "video" && item.duration && item.duration > 0 && (
          <View style={styles.durationBadge}>
            <Text style={styles.durationText}>
              {formatDuration(item.duration)}
            </Text>
          </View>
        )}
      </Animated.View>
    </GestureDetector>
  );
}

// ── Main screen ──

export default function ArrangeScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const navigation = useNavigation();

  const draftRef = useRef(consumePostDraft());
  const [items, setItems] = useState<PickedMediaItem[]>(
    () => draftRef.current?.mediaList ?? [],
  );
  const positions = useSharedValue<number[]>(
    draftRef.current?.mediaList.map((_, i) => i) ?? [],
  );

  // Sync number badges after drag ends
  const handleDragEnd = useCallback((_newPositions: number[]) => {
    // Trigger re-render so number badges update
    setItems((prev) => [...prev]);
  }, []);

  // --- Post handler: sort media, kick off background upload, dismiss to community ---
  const handlePost = useCallback(() => {
    const draft = draftRef.current;
    if (!draft) return;

    const currentPositions = positions.value;
    const sorted = items
      .map((it, i) => ({ it, order: currentPositions[i] ?? i }))
      .sort((a, b) => a.order - b.order)
      .map(({ it }) => it);

    // Fire upload in background, then navigate back to community tab
    submitPostInBackground(draft, sorted);
    router.dismissAll();
    router.navigate("/(tabs)/community");
  }, [items, router]);

  // --- Stable ref for header ---
  const handlePostRef = useRef(handlePost);
  handlePostRef.current = handlePost;

  // --- Native header ---
  useLayoutEffect(() => {
    navigation.setOptions({
      title: "Arrange",
      headerTransparent: true,
      scrollEdgeEffects: { top: "soft" },
      headerRight: () => (
        <Pressable
          onPress={() => handlePostRef.current()}
          disabled={items.length === 0}
          style={({ pressed }) => [
            styles.headerPill,
            items.length === 0 && styles.headerPillDisabled,
            { opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <Text style={styles.headerPillText}>Post</Text>
        </Pressable>
      ),
    });
  }, [navigation, items.length]);

  const gridHeight =
    Math.ceil(items.length / COLUMNS) * (ITEM_SIZE + GAP) - GAP;

  return (
    <GestureHandlerRootView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
      >
        {/* Hint */}
        <View style={styles.hintRow}>
          <Text style={styles.hintText}>Long press and drag to reorder</Text>
          <Text style={styles.hintCount}>{items.length} items</Text>
        </View>
        <View style={[styles.gridContainer, { height: gridHeight }]}>
          {items.map((item, index) => (
            <SortableItem
              key={item.id}
              item={item}
              index={index}
              positions={positions}
              itemCount={items.length}
              onDragEnd={handleDragEnd}
              styles={styles}
            />
          ))}
        </View>
      </ScrollView>
    </GestureHandlerRootView>
  );
}

// ── Styles ──

const createStyles = (colors: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },

    // --- Hint bar ---
    hintRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: PADDING_H,
      paddingVertical: 10,
    },
    hintText: {
      fontSize: 13,
      fontFamily: theme.fonts.regular,
      color: colors.textSecondary,
    },
    hintCount: {
      fontSize: 13,
      fontFamily: theme.fonts.medium,
      fontWeight: "600",
      color: colors.accent,
    },

    // --- Grid ---
    scrollContent: {
      paddingHorizontal: PADDING_H,
      paddingBottom: 40,
    },
    gridContainer: {
      position: "relative",
    },
    cell: {
      borderRadius: 12,
      overflow: "hidden",
    },
    cellImage: {
      width: "100%",
      height: "100%",
    },
    numberBadge: {
      position: "absolute",
      top: 6,
      right: 6,
      width: 26,
      height: 26,
      borderRadius: 13,
      backgroundColor: "#306E6F",
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 2,
      borderColor: "#fff",
    },
    numberBadgeText: {
      color: "#fff",
      fontSize: 11,
      fontWeight: "700",
      fontFamily: theme.fonts.bold,
    },
    durationBadge: {
      position: "absolute",
      bottom: 5,
      right: 5,
      backgroundColor: "rgba(0,0,0,0.55)",
      borderRadius: 4,
      paddingHorizontal: 5,
      paddingVertical: 2,
    },
    durationText: {
      color: "#fff",
      fontSize: 10,
      fontFamily: theme.fonts.monoMedium,
    },

    // --- Header ---
    headerPill: {
      paddingVertical: 4,
      paddingHorizontal: 8,
    },
    headerPillDisabled: {
      opacity: 0.35,
    },
    headerPillText: {
      color: colors.accent,
      fontSize: 17,
      fontWeight: "600",
    },
  });
