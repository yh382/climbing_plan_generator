import React, { useState } from "react";
import { View, StyleSheet, TouchableOpacity, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { GlassView } from "expo-glass-effect";

export type PeopleFilter = "all" | "following";
export type GenderFilter = "all" | "male" | "female";

// 优化后的胶囊按钮：黑底白字选中态，更清晰
function Pill({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      style={[styles.pill, active && styles.pillActive]}
    >
      <Text style={[styles.pillText, active ? styles.pillTextActive : styles.pillTextInactive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export default function LeaderboardFilters({
  people,
  gender,
  onChangePeople,
  onChangeGender,
}: {
  people: PeopleFilter;
  gender: GenderFilter;
  onChangePeople: (v: PeopleFilter) => void;
  onChangeGender: (v: GenderFilter) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    // 使用 zIndex 确保弹窗在最上层
    <View style={{ position: "relative", zIndex: 100 }}>
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => setOpen((v) => !v)}
        style={[styles.filterBtn, open && styles.filterBtnActive]}
      >
        {/* 只有未打开时显示玻璃效果，打开时显示实色，避免视觉干扰 */}
        {!open && <GlassView glassEffectStyle="regular" style={StyleSheet.absoluteFill} />}
        <Ionicons name="options-outline" size={18} color={open ? "#FFF" : "#111"} />
      </TouchableOpacity>

      {open ? (
        <>
          {/* 点击外部关闭遮罩 (可选，增加体验) */}
          <Pressable 
            style={styles.backdrop} 
            onPress={() => setOpen(false)} 
          />
          
          {/* 绝对定位的浮层 */}
          <View style={styles.popover}>
            <View style={styles.group}>
              <Text style={styles.groupTitle}>Show People</Text>
              <View style={styles.row}>
                <Pill label="All" active={people === "all"} onPress={() => onChangePeople("all")} />
                <Pill label="Following" active={people === "following"} onPress={() => onChangePeople("following")} />
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.group}>
              <Text style={styles.groupTitle}>Filter by Gender</Text>
              <View style={styles.row}>
                <Pill label="All" active={gender === "all"} onPress={() => onChangeGender("all")} />
                <Pill label="Male" active={gender === "male"} onPress={() => onChangeGender("male")} />
                <Pill label="Female" active={gender === "female"} onPress={() => onChangeGender("female")} />
              </View>
            </View>
          </View>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  // 透明全屏遮罩，用于点击外部关闭
  backdrop: {
    position: 'absolute',
    top: -1000,
    left: -1000,
    right: -1000,
    bottom: -1000,
    zIndex: -1, 
  },
  
  filterBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.6)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.5)",
  },
  filterBtnActive: {
    backgroundColor: "#111", // 打开时变黑
    borderColor: "#111",
  },

  popover: {
    position: "absolute", // 关键：绝对定位
    top: 42, // 按钮高度 + 间距
    right: 0, // 右对齐
    width: 260,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    
    // 阴影效果 (卡片感)
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
    
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
    zIndex: 100,
  },

  group: { gap: 10 },
  groupTitle: { fontSize: 11, fontWeight: "700", color: "#6B7280", textTransform: "uppercase", letterSpacing: 0.5 },
  
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },

  pill: {
    paddingHorizontal: 14,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F4F6", // 默认浅灰
    borderWidth: 1,
    borderColor: "transparent",
  },
  pillActive: { 
    backgroundColor: "#111827", // 选中变深黑
    borderColor: "#111827",
  },
  
  pillText: { fontSize: 13, fontWeight: "600" },
  pillTextActive: { color: "#FFF" }, // 选中白字
  pillTextInactive: { color: "#374151" }, // 未选中深灰

  divider: { height: 1, backgroundColor: "#F3F4F6", marginVertical: 12 },
});