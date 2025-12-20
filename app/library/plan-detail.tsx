// app/library/plan-detail.tsx
import React from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import TopBar from "../../components/TopBar"; 

// 模拟数据
const MOCK_WEEKS = [
  { week: 1, focus: "Hypertrophy", status: "completed", sessions: 3 },
  { week: 2, focus: "Max Strength", status: "current", sessions: 4 },
  { week: 3, focus: "Power", status: "locked", sessions: 3 },
  { week: 4, focus: "Deload", status: "locked", sessions: 2 },
];

export default function PlanDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: "#FAFAFA" }}>
      {/* TopBar 区域 */}
      <View style={{ 
          backgroundColor: '#FFF',
          paddingTop: insets.top // 保持安全区域处理
      }}>
        <TopBar 
            routeName="plan_detail" 
            title="Training Plan"
            useSafeArea={false}
            leftControls={{ mode: "back", onBack: () => router.back() }}
        />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        
        {/* 计划概览 */}
        <View style={styles.heroCard}>
            <View style={styles.heroContent}>
                <View style={styles.tagRow}>
                    <View style={styles.tag}><Text style={styles.tagText}>Strength</Text></View>
                    <View style={styles.tag}><Text style={styles.tagText}>8 Weeks</Text></View>
                </View>
                <Text style={styles.planTitle}>Winter Power Endurance</Text>
                <Text style={styles.planDesc}>
                    Focuses on finger strength and core tension. Designed for V4-V6 climbers looking to break plateau.
                </Text>
                
                <View style={styles.progressRow}>
                    <Text style={styles.progressLabel}>35% Completed</Text>
                    <View style={styles.progressBarBg}>
                        <View style={[styles.progressBarFill, { width: '35%' }]} />
                    </View>
                </View>
            </View>
        </View>

        {/* Schedule */}
        <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Schedule</Text>
        </View>

        <View style={styles.weekList}>
            {MOCK_WEEKS.map((item) => (
                <TouchableOpacity 
                    key={item.week} 
                    style={[styles.weekCard, item.status === 'current' && styles.weekCardActive]}
                    // 点击跳转到周详情 (三级页面)
                    onPress={() => router.push({
                        pathname: "/library/plan-overview",
                        params: { week: item.week }
                    })}
                >
                    <View style={styles.weekHeader}>
                        <View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
                            <View style={[styles.statusDot, 
                                item.status === 'completed' ? {backgroundColor: '#10B981'} : 
                                item.status === 'current' ? {backgroundColor: '#3B82F6'} : {backgroundColor: '#D1D5DB'}
                            ]} />
                            <Text style={styles.weekTitle}>Week {item.week} · {item.focus}</Text>
                        </View>
                        {item.status === 'locked' ? (
                            <Ionicons name="lock-closed" size={16} color="#9CA3AF" />
                        ) : (
                            <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
                        )}
                    </View>
                    <Text style={styles.weekSub}>{item.sessions} Sessions</Text>
                </TouchableOpacity>
            ))}
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  heroCard: { backgroundColor: '#FFF', margin: 16, borderRadius: 20, overflow: 'hidden', shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 10, elevation: 5 },
  heroContent: { padding: 20 },
  tagRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  tag: { backgroundColor: '#F3F4F6', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  tagText: { fontSize: 10, fontWeight: '600', color: '#4B5563', textTransform: 'uppercase' },
  planTitle: { fontSize: 22, fontWeight: '800', color: '#111', marginBottom: 8 },
  planDesc: { fontSize: 14, color: '#6B7280', lineHeight: 20, marginBottom: 20 },
  progressRow: { marginTop: 'auto' },
  progressLabel: { fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 6 },
  progressBarBg: { height: 8, backgroundColor: '#F3F4F6', borderRadius: 4 },
  progressBarFill: { height: 8, backgroundColor: '#10B981', borderRadius: 4 },
  
  sectionHeader: { paddingHorizontal: 20, marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#111' },
  
  weekList: { paddingHorizontal: 16, gap: 12 },
  weekCard: { backgroundColor: '#FFF', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  weekCardActive: { borderColor: '#3B82F6', backgroundColor: '#EFF6FF' },
  weekHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  weekTitle: { fontSize: 16, fontWeight: '600', color: '#111' },
  weekSub: { fontSize: 12, color: '#6B7280', marginLeft: 16 },
});