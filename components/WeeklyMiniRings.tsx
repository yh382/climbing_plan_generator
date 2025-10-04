// components/WeeklyMiniRings.tsx
import React from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  useColorScheme,
  ViewStyle,
} from "react-native";
import * as Haptics from "expo-haptics";

export type DayInfo = { date: Date; count: number };

type Props = {
  days: DayInfo[];                 // 连续 7 天（周一~周日或周日~周六）
  selectedDate: Date;              // 当前选中
  onSelect: (d: Date) => void;     // 选中某天
  style?: ViewStyle;
};

const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

export default function WeeklyMiniRings({ days, selectedDate, onSelect, style }: Props) {
  const isDark = useColorScheme() === "dark";
  const track = isDark ? "#4B5563" : "#D1D5DB"; // 环描边
  const text = isDark ? "#E5E7EB" : "#111827";

  return (
    <View style={[styles.row, style]}>
      {days.map(({ date, count }) => {
        const today = new Date();
        const selected = isSameDay(date, selectedDate);
        const isToday = isSameDay(date, today);
        const hasData = count > 0;

        return (
          <Pressable
            key={date.toISOString()}
            onPress={() => {
              Haptics.selectionAsync();
              onSelect(date);
            }}
            style={styles.item}
          >
            {/* 选中时：蓝色描边更粗 + 外层淡淡的 halo */}
            <View
              style={[
                styles.halo,
                selected && { borderColor: "rgba(37,99,235,0.28)" },
              ]}
            >
              <View
                style={[
                  styles.ring,
                  { borderColor: track },
                  selected && { borderColor: "#2563EB", borderWidth: 2 },
                  isToday && !selected && { borderColor: "#93C5FD" }, // 今天（未选中）：浅蓝描边
                ]}
              >
                {/* 有记录就显示一个蓝色内点；无记录不显示 */}
                {hasData && <View style={styles.dot} />}
              </View>
            </View>

            {/* 日号 */}
            <Text style={[styles.dayText, { color: text }]}>
              {date.getDate()}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const SIZE = 24;

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  item: {
    alignItems: "center",
    justifyContent: "center",
    width: 44,
  },
  halo: {
    width: SIZE + 6,
    height: SIZE + 6,
    borderRadius: (SIZE + 6) / 2,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 0, // 选中时才显示淡淡的 halo
  },
  ring: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#2563EB",
  },
  dayText: {
    fontSize: 11,
    marginTop: 4,
    fontWeight: "600",
  },
});
