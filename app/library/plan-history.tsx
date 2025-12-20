// app/library/plan-history.tsx

import React from "react";
import { View, StyleSheet, FlatList, Text } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import TopBar from "../../components/TopBar"; 
import PlanCard, { PlanProps } from "../../components/PlanCard";

// Mock Data: 历史计划（已完成）
const HISTORY_PLANS: PlanProps[] = [
  { 
    id: 'h1', 
    title: 'Beginner Core', 
    author: 'ClimMate', 
    level: 'V0-V2', 
    duration: 'Completed', // 显示状态
    users: 8500, 
    type: 'Core', 
    rating: 4.2, 
    color: '#DB2777', 
    image: 'https://images.unsplash.com/photo-1599058945522-28d584b6f0ff?auto=format&fit=crop&w=800&q=80' 
  },
  { 
    id: 'h2', 
    title: 'Finger Rehab', 
    author: 'Hooper\'s Beta', 
    level: 'All', 
    duration: 'Completed', 
    users: 2100, 
    type: 'Recovery', 
    rating: 4.9, 
    color: '#D97706', 
    image: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=800&q=80' 
  }
];

export default function PlanHistoryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: '#FFF' }}>
      <View style={{ paddingTop: insets.top }}>
        <TopBar 
            routeName="plan_history" 
            title="Plan History" 
            useSafeArea={false}
            leftControls={{ mode: "back", onBack: () => router.back() }} 
        />
      </View>

      <FlatList
        data={HISTORY_PLANS}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
            <View style={{ marginBottom: 16 }}>
                {/* 复用 PlanCard，点击也可以进入详情查看当时的数据 */}
                <PlanCard 
                    item={item} 
                    onPress={() => router.push({
                        pathname: "/library/plan-overview",
                        params: { planId: item.id, source: 'history' } // source='history' 也不显示添加按钮
                    })} 
                />
                {/* 可选：在卡片下方增加完成时间等额外信息 */}
                <View style={styles.historyMeta}>
                    <Ionicons name="checkmark-done-circle" size={14} color="#10B981" />
                    <Text style={styles.historyText}>Finished on Oct 24, 2025</Text>
                </View>
            </View>
        )}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={
            <View style={styles.emptyContainer}>
                <Ionicons name="time-outline" size={48} color="#E5E7EB" />
                <Text style={styles.emptyText}>No completed plans yet.</Text>
            </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
    historyMeta: { flexDirection: 'row', alignItems: 'center', marginTop: -8, marginBottom: 8, paddingHorizontal: 4, gap: 4 },
    historyText: { fontSize: 12, color: '#6B7280', fontWeight: '500' },
    emptyContainer: { alignItems: 'center', justifyContent: 'center', marginTop: 100 },
    emptyText: { marginTop: 12, color: '#9CA3AF', fontSize: 14 }
});