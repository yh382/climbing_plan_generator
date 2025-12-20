// src/features/session/components/CycleProgressCard.tsx
import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

// 这里的 Props 可以根据你的后端 Plan 数据结构进行扩展
interface Props {
  cycleName: string; // e.g., "Strength Phase 1"
  totalWeeks: number;
  currentWeek: number;
  remainingSessions: number;
  onPress: () => void;
}

export default function CycleProgressCard({ cycleName, totalWeeks, currentWeek, remainingSessions, onPress }: Props) {
  const progress = currentWeek / totalWeeks;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      {/* 头部：周期信息 */}
      <View style={styles.header}>
        <View>
            <Text style={styles.label}>CURRENT CYCLE</Text>
            <Text style={styles.title}>{cycleName}</Text>
        </View>
        <View style={styles.weekBadge}>
            <Text style={styles.weekText}>Week {currentWeek} / {totalWeeks}</Text>
        </View>
      </View>

      {/* 进度条 */}
      <View style={styles.progressBarBg}>
        <View style={[styles.progressBarFill, { width: `${progress * 100}%` }]} />
      </View>

      {/* 底部：行动号召 */}
      <View style={styles.footer}>
        <View style={styles.infoCol}>
            <Text style={styles.infoVal}>{remainingSessions}</Text>
            <Text style={styles.infoLabel}>Sessions Left</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.infoCol}>
            <Text style={styles.infoVal}>3</Text>
            <Text style={styles.infoLabel}>Claimable</Text>
        </View>
        
        {/* Start 按钮 */}
        <TouchableOpacity style={styles.startBtn}>
            <Text style={styles.startBtnText}>View Plan</Text>
            <Ionicons name="arrow-forward" size={14} color="#FFF" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#FFF', marginHorizontal: 16, marginBottom: 16, borderRadius: 16, padding: 16, shadowColor: "#000", shadowOpacity: 0.03, shadowRadius: 8, shadowOffset: {width:0, height:2} },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  label: { fontSize: 10, color: '#9CA3AF', fontWeight: '700', letterSpacing: 0.5 },
  title: { fontSize: 16, fontWeight: '700', color: '#111', marginTop: 2 },
  weekBadge: { backgroundColor: '#EEF2FF', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  weekText: { fontSize: 12, color: '#4F46E5', fontWeight: '600' },
  
  progressBarBg: { height: 6, backgroundColor: '#F3F4F6', borderRadius: 3, marginBottom: 16 },
  progressBarFill: { height: 6, backgroundColor: '#4F46E5', borderRadius: 3 },
  
  footer: { flexDirection: 'row', alignItems: 'center' },
  infoCol: { alignItems: 'flex-start' },
  infoVal: { fontSize: 18, fontWeight: '700', color: '#111' },
  infoLabel: { fontSize: 11, color: '#6B7280' },
  divider: { width: 1, height: 24, backgroundColor: '#E5E7EB', marginHorizontal: 16 },
  
  startBtn: { marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', backgroundColor: '#111827', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, gap: 4 },
  startBtnText: { color: '#FFF', fontSize: 12, fontWeight: '600' }
});