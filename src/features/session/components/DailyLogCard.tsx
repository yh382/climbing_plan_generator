// src/features/session/components/DailyLogCard.tsx
import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface Props {
  dateLabel: string;   // e.g., "Monday, Oct 12"
  duration: string;    // e.g., "2h 30m"
  sends: number;       // e.g., 8
  maxGrade: string;    // e.g., "V5"
  onPress: () => void; // 点击进入当天的详细记录页
}

export default function DailyLogCard({ dateLabel, duration, sends, maxGrade, onPress }: Props) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      {/* 卡片头部：日期 */}
      <View style={styles.header}>
        <Text style={styles.dateText}>{dateLabel}</Text>
        <Ionicons name="chevron-forward" size={16} color="#D1D5DB" />
      </View>
      
      {/* 数据网格 */}
      <View style={styles.grid}>
        <View style={styles.item}>
            <Text style={styles.val}>{duration}</Text>
            <Text style={styles.label}>Duration</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.item}>
            <Text style={styles.val}>{sends}</Text>
            <Text style={styles.label}>Sends</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.item}>
            <Text style={[styles.val, {color: '#10B981'}]}>{maxGrade}</Text>
            <Text style={styles.label}>Best</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#FFF', marginHorizontal: 16, marginBottom: 12, borderRadius: 16, padding: 16, shadowColor: "#000", shadowOpacity: 0.02, shadowRadius: 6, shadowOffset: {width:0, height:2} },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  dateText: { fontSize: 14, fontWeight: '600', color: '#374151' },
  grid: { flexDirection: 'row', alignItems: 'center' },
  item: { flex: 1, alignItems: 'center' },
  val: { fontSize: 18, fontWeight: '800', color: '#111' },
  label: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  divider: { width: 1, height: 24, backgroundColor: '#F3F4F6' }
});