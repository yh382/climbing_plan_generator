import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  Dimensions,
  Animated,
  PanResponder,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";

const SCREEN_HEIGHT = Dimensions.get("window").height;

const SHEET_HEIGHT = Math.round(SCREEN_HEIGHT * 0.3); // ~2/5
const ITEM_HEIGHT = 44;
const VISIBLE_ITEMS = 5;

type MonthItem = { key: string; label: string; date: Date };

export default function MonthPickerSheet({
  visible,
  initialMonth,
  onClose,
  onSelect,
}: {
  visible: boolean;
  initialMonth: Date;
  onClose: () => void;
  onSelect: (d: Date) => void;
}) {
  const insets = useSafeAreaInsets();
  const bottomPad = Math.min(insets.bottom, 10) - 30; // ✅ 更小的安全区视觉占用

  const months = useMemo(() => buildMonthOptions(initialMonth, 24), [initialMonth]);

  const [showModal, setShowModal] = useState(visible);
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  const listRef = useRef<Animated.FlatList<MonthItem> | null>(null);
  const scrollY = useRef(new Animated.Value(0)).current;

  const initialIndex = useMemo(() => {
    const target = new Date(initialMonth.getFullYear(), initialMonth.getMonth(), 1);
    const idx = months.findIndex(
      (m) => m.date.getFullYear() === target.getFullYear() && m.date.getMonth() === target.getMonth()
    );
    return idx >= 0 ? idx : 0;
  }, [initialMonth, months]);

  const [selectedIndex, setSelectedIndex] = useState(initialIndex);

  useEffect(() => {
    setSelectedIndex(initialIndex);
  }, [initialIndex]);

  useEffect(() => {
    if (visible) {
      setShowModal(true);

      // ✅ 关键：一显示就把 scrollY 置到目标 offset，避免“慢一拍”
      scrollY.setValue(initialIndex * ITEM_HEIGHT);

      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        damping: 20,
        stiffness: 90,
      }).start();
    } else if (showModal) {
      closeWithAnimation(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const closeWithAnimation = (commit: boolean) => {
    Animated.timing(translateY, {
      toValue: SCREEN_HEIGHT,
      duration: 220,
      useNativeDriver: true,
    }).start(() => {
      setShowModal(false);
      translateY.setValue(SCREEN_HEIGHT);

      if (commit) {
        const picked = months[selectedIndex]?.date;
        if (picked) onSelect(picked);
      }
      onClose();
    });
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => g.dy > 6,
      onPanResponderMove: (_, g) => {
        if (g.dy > 0) translateY.setValue(g.dy);
      },
      onPanResponderRelease: (_, g) => {
        if (g.vy > 0.5 || g.dy > 110) {
          closeWithAnimation(false);
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            damping: 20,
            stiffness: 220,
          }).start();
        }
      },
    })
  ).current;

  const onMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;
    const idx = clamp(Math.round(y / ITEM_HEIGHT), 0, months.length - 1);
    setSelectedIndex(idx);
  };

  const renderItem = ({ item, index }: { item: MonthItem; index: number }) => {
    const inputRange = [
      (index - 2) * ITEM_HEIGHT,
      (index - 1) * ITEM_HEIGHT,
      index * ITEM_HEIGHT,
      (index + 1) * ITEM_HEIGHT,
      (index + 2) * ITEM_HEIGHT,
    ];

    const opacity = scrollY.interpolate({
      inputRange,
      outputRange: [0.35, 0.6, 1, 0.6, 0.35],
      extrapolate: "clamp",
    });

    const scale = scrollY.interpolate({
      inputRange,
      outputRange: [0.92, 0.96, 1.05, 0.96, 0.92],
      extrapolate: "clamp",
    });

    return (
      <Animated.View style={[s.itemRow, { opacity, transform: [{ scale }] }]}>
        <Text style={s.itemText}>{item.label}</Text>
      </Animated.View>
    );
  };

  const centerPadding = Math.floor(VISIBLE_ITEMS / 2) * ITEM_HEIGHT;

  return (
    <Modal transparent animationType="fade" visible={showModal} onRequestClose={() => closeWithAnimation(false)}>
      <View style={s.overlay}>
        <Pressable style={StyleSheet.absoluteFillObject} onPress={() => closeWithAnimation(false)} />

        <Animated.View
          style={[
            s.sheet,
            {
              height: SHEET_HEIGHT + insets.bottom,
              paddingBottom: bottomPad,
              transform: [{ translateY }],
            },
          ]}
        >
          <View style={s.topRow} {...panResponder.panHandlers}>
            <Pressable onPress={() => closeWithAnimation(false)} hitSlop={10} style={s.iconBtn}>
              <MaterialCommunityIcons name="close" size={22} color="#111" />
            </Pressable>

            <View style={{ flex: 1 }} />

            <Pressable onPress={() => closeWithAnimation(true)} hitSlop={10} style={s.iconBtn}>
              <MaterialCommunityIcons name="check" size={24} color="#111" />
            </Pressable>
          </View>

          <View style={s.wheelWrap}>
            <View pointerEvents="none" style={s.selectionBox} />

            <Animated.FlatList
              ref={(r) => {
                listRef.current = r;
              }}
              data={months}
              keyExtractor={(it) => it.key}
              renderItem={renderItem}
              showsVerticalScrollIndicator={false}
              bounces={false}
              decelerationRate="fast"
              snapToInterval={ITEM_HEIGHT}
              snapToAlignment="start"
              onMomentumScrollEnd={onMomentumEnd}
              getItemLayout={(_, index) => ({
                length: ITEM_HEIGHT,
                offset: ITEM_HEIGHT * index,
                index,
              })}
              // ✅ 关键：一开始就滚到目标位置（不等动画结束）
              initialScrollIndex={initialIndex}
              onScrollToIndexFailed={() => {
                listRef.current?.scrollToOffset({
                  offset: initialIndex * ITEM_HEIGHT,
                  animated: false,
                });
              }}
              contentContainerStyle={{
                paddingTop: centerPadding,
                paddingBottom: centerPadding,
              }}
              onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
                useNativeDriver: true,
              })}
              scrollEventThrottle={16}
            />
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

function buildMonthOptions(initial: Date, backCount: number): MonthItem[] {
  const now = new Date();
  const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const initMonth = new Date(initial.getFullYear(), initial.getMonth(), 1);
  const anchor = initMonth.getTime() > currentMonth.getTime() ? initMonth : currentMonth;

  const list: MonthItem[] = [];
  for (let i = 0; i < backCount; i++) {
    const d = new Date(anchor.getFullYear(), anchor.getMonth() - i, 1);
    const label = `${d.toLocaleString("en-US", { month: "short" })} ${d.getFullYear()}`;
    list.push({ key: `${d.getFullYear()}-${d.getMonth()}`, label, date: d });
  }
  return list;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingHorizontal: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },

  topRow: {
    height: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 2,
  },
  iconBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },

  wheelWrap: {
    height: ITEM_HEIGHT * VISIBLE_ITEMS,
    position: "relative",
    overflow: "hidden",
  },
  selectionBox: {
    position: "absolute",
    top: ITEM_HEIGHT * Math.floor(VISIBLE_ITEMS / 2),
    left: 0,
    right: 0,
    height: ITEM_HEIGHT,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E5E5",
    backgroundColor: "rgba(0,0,0,0.02)",
  },
  itemRow: {
    height: ITEM_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
  },
  itemText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111",
  },
});
