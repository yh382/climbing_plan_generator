import React, { useMemo, useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import MonthPickerSheet from "./MonthPickerSheet";

export default function AscentsHeaderBar({
  monthLabel,
  selectedMonth,
  onChangeMonth,
  ascentType,
  onChangeAscentType,
}: {
  monthLabel: string;
  selectedMonth: Date;
  onChangeMonth: (d: Date) => void;
  ascentType: "bouldering" | "routes";
  onChangeAscentType: (v: "bouldering" | "routes") => void;
}) {
  const [open, setOpen] = useState(false);
  const segmentedValue = useMemo(() => ascentType, [ascentType]);
  const router = useRouter();

  return (
    <>
      <View style={s.row}>
        {/* Month selector: 非胶囊、字号更大 */}
        <Pressable style={s.monthBtn} onPress={() => setOpen(true)} hitSlop={8}>
          <Text style={s.monthText}>{monthLabel}</Text>
          <Text style={s.monthChevron}>▾</Text>
        </Pressable>

        {/* Segmented control */}
        <View style={s.segmentOuter}>
          <Pressable
            style={[s.segmentItem, segmentedValue === "bouldering" && s.segmentItemActive]}
            onPress={() => onChangeAscentType("bouldering")}
          >
            <Text style={[s.segmentText, segmentedValue === "bouldering" && s.segmentTextActive]}>
              Bouldering
            </Text>
          </Pressable>

          <Pressable
            style={[s.segmentItem, segmentedValue === "routes" && s.segmentItemActive]}
            onPress={() => onChangeAscentType("routes")}
          >
            <Text style={[s.segmentText, segmentedValue === "routes" && s.segmentTextActive]}>
              Routes
            </Text>
          </Pressable>
        </View>

        {/* Analysis icon entry */}
        <Pressable
          style={s.analysisBtn}
          onPress={() => router.push("/(tabs)/analysis")}
          hitSlop={10}
        >
          <MaterialCommunityIcons name="chart-bar" size={22} color="#111" />
        </Pressable>
      </View>

      <MonthPickerSheet
        visible={open}
        initialMonth={selectedMonth}
        onClose={() => setOpen(false)}
        onSelect={(d) => {
          onChangeMonth(d);
          setOpen(false);
        }}
      />
    </>
  );
}

const s = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },

  // Month button: 去胶囊（无背景/无边框），更大字号
  monthBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 2,
  },
  monthText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111",
  },
  monthChevron: {
    fontSize: 14,
    color: "#666",
    marginTop: 1,
  },

  // Segmented pill
  segmentOuter: {
    flex: 1,
    height: 40,
    borderRadius: 999,
    backgroundColor: "#E7E9E6",
    padding: 4,
    flexDirection: "row",
  },
  segmentItem: {
    flex: 1,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  segmentItemActive: {
    backgroundColor: "#FFFFFF",
  },
  segmentText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
  },
  segmentTextActive: {
    color: "#111",
  },

  analysisBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
});
