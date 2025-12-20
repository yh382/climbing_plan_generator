// app/library/plan-overview.tsx

import React, { useState, useRef } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import TopBar from "../../components/TopBar";

// --- Mock Data ---
const WEEK_META: Record<string, { focus: string; sessionsCount: number }> = {
  "1": { focus: "Hypertrophy", sessionsCount: 3 },
  "2": { focus: "Max Strength", sessionsCount: 3 },
  "3": { focus: "Power", sessionsCount: 3 },
  "4": { focus: "Deload", sessionsCount: 2 },
  "5": { focus: "Power Endu", sessionsCount: 3 },
  "6": { focus: "Performance", sessionsCount: 2 },
};

const PLAN_WEEKS: Record<string, any[]> = {
  "1": [
    { id: 'w1-1', title: "Base Fitness A", focus: "Aerobic Capacity", duration: "45m" },
    { id: 'w1-2', title: "Core & Mobility", focus: "Recovery", duration: "30m" },
    { id: 'w1-3', title: "Technique Drills", focus: "Footwork", duration: "60m" },
  ],
  // ... 其他周数据
};

const TOTAL_WEEKS = 6;
const WEEKS_ARRAY = Array.from({ length: TOTAL_WEEKS }, (_, i) => i + 1);

export default function PlanOverviewScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  // 1. 获取路由参数
  // source: 'market' (来自广场，显示添加按钮) | 'user' (来自我的计划，隐藏按钮) | 'history' (来自历史)
  const { planTitle, planId, source } = useLocalSearchParams<{ planTitle: string, planId: string, source: string }>();

  const [selectedWeek, setSelectedWeek] = useState(1);
  const scrollViewRef = useRef<ScrollView>(null);

  const currentSessions = PLAN_WEEKS[String(selectedWeek)] || [];
  const currentMeta = WEEK_META[String(selectedWeek)] || { focus: "General", sessionsCount: 0 };

  // 判断是否应该显示 "Add to My Plans"
  // 逻辑：只有当 source 明确为 'market' 时才显示。
  // 如果是从 My Plans ('user') 或 History ('history') 进来，都不显示。
  const showAddButton = source === 'market';

  const handleAddToMyPlans = () => {
      Alert.alert("Success", "Plan added to your library!", [
          { text: "OK", onPress: () => router.push("/library/my-plans") }
      ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#FAFAFA" }}>
      
      {/* TopBar */}
      <View style={{ backgroundColor: '#FFF', paddingTop: insets.top }}>
        <TopBar 
            routeName="plan_overview" 
            title="Plan Overview" 
            useSafeArea={false}
            leftControls={{ mode: "back", onBack: () => router.back() }}
            // 如果是用户自己的计划，显示更多设置按钮；如果是市场的计划，显示空或者分享
            rightAccessory={
                source === 'user' ? (
                    <TouchableOpacity onPress={() => Alert.alert("Settings", "Edit Schedule / Remove Plan")}>
                        <Ionicons name="ellipsis-horizontal" size={24} color="#111" />
                    </TouchableOpacity>
                ) : null
            }
        />
      </View>

      <ScrollView stickyHeaderIndices={[1]} contentContainerStyle={{ paddingBottom: 120 }}>
        
        {/* Plan Info */}
        <View style={styles.heroContainer}>
            <Text style={styles.planTitle}>{planTitle || "Winter Power Endurance"}</Text>
            
            <View style={styles.metaRow}>
                <View style={styles.metaTag}>
                    <Ionicons name="calendar-outline" size={14} color="#6B7280" />
                    <Text style={styles.metaText}>{TOTAL_WEEKS} Weeks</Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.metaTag}>
                    <Ionicons name="barbell-outline" size={14} color="#6B7280" />
                    <Text style={styles.metaText}>~3 Sessions/Wk</Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.metaTag}>
                    <Ionicons name="stats-chart-outline" size={14} color="#6B7280" />
                    <Text style={styles.metaText}>V4-V6</Text>
                </View>
            </View>

            {/* 只有在 'user' 模式下才显示进度条，市场预览模式不需要看进度 */}
            {source === 'user' && (
                <View style={styles.progressWrapper}>
                    <View style={{flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6}}>
                        <Text style={styles.progressLabel}>Plan Progress</Text>
                        <Text style={styles.progressVal}>15%</Text>
                    </View>
                    <View style={styles.progressTrack}>
                        <View style={[styles.progressFill, { width: '15%' }]} />
                    </View>
                </View>
            )}
        </View>

        {/* Week Navigator */}
        <View style={styles.navWrapper}>
            <ScrollView 
                ref={scrollViewRef}
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.navContent}
            >
                {WEEKS_ARRAY.map((w) => {
                    const isActive = w === selectedWeek;
                    const meta = WEEK_META[String(w)];
                    return (
                        <TouchableOpacity 
                            key={w} 
                            style={[styles.weekCard, isActive && styles.weekCardActive]}
                            onPress={() => setSelectedWeek(w)}
                            activeOpacity={0.7}
                        >
                            <Text style={[styles.weekNum, isActive && styles.weekNumActive]}>W{w}</Text>
                            <Text style={[styles.weekFocus, isActive && styles.weekFocusActive]} numberOfLines={1}>
                                {meta?.focus || "Training"}
                            </Text>
                            <View style={styles.dotsRow}>
                                {Array.from({ length: meta?.sessionsCount || 0 }).map((_, i) => (
                                    <View key={i} style={[styles.dot, isActive && styles.dotActive]} />
                                ))}
                            </View>
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>
        </View>

        {/* Session List */}
        <View style={styles.listContainer}>
            <View style={styles.weekHeader}>
                <Text style={styles.weekHeaderTitle}>Week {selectedWeek} · {currentMeta.focus}</Text>
            </View>

            {currentSessions.length > 0 ? (
                currentSessions.map((item, index) => (
                    <TouchableOpacity 
                        key={index} 
                        style={styles.card}
                        onPress={() => {
                            // 只有已经是用户的计划才能点击进入 Session 详情
                            if (source === 'user') {
                                router.push({
                                    pathname: "/library/session-detail", // 假设的 Session 详情页
                                    params: { id: item.id, title: item.title }
                                });
                            } else {
                                Alert.alert("Locked", "Add this plan to your library to view session details.");
                            }
                        }}
                    >
                        <View style={styles.cardIndex}>
                            <Text style={styles.indexText}>{index + 1}</Text>
                        </View>
                        <View style={styles.cardCenter}>
                            <Text style={styles.cardTitle}>{item.title}</Text>
                            <Text style={styles.cardSub}>{item.focus} · {item.duration}</Text>
                        </View>
                        <View style={styles.cardRight}>
                           {/* 市场预览模式下，全部显示锁 */}
                           {source === 'market' ? (
                               <Ionicons name="lock-closed-outline" size={18} color="#D1D5DB" />
                           ) : (
                               index === 0 ? (
                                 <View style={styles.startBadge}><Text style={styles.startText}>START</Text></View>
                               ) : (
                                 <Ionicons name="lock-closed-outline" size={18} color="#D1D5DB" />
                               )
                           )}
                        </View>
                    </TouchableOpacity>
                ))
            ) : (
                <View style={styles.emptyBox}>
                    <Text style={styles.emptyText}>No sessions planned for this week.</Text>
                </View>
            )}
        </View>
      </ScrollView>

      {/* 2. 底部悬浮按钮区 [核心逻辑] */}
      {showAddButton && (
        <View style={[styles.bottomFloat, { paddingBottom: insets.bottom + 12 }]}>
            <TouchableOpacity 
                style={styles.mainBtn} 
                activeOpacity={0.8}
                onPress={handleAddToMyPlans}
            >
                <Text style={styles.mainBtnText}>Add to My Plans</Text>
            </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  heroContainer: { padding: 20, backgroundColor: '#FFF', paddingBottom: 24 },
  planTitle: { fontSize: 22, fontWeight: '800', color: '#111', marginBottom: 12 },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  metaTag: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontSize: 13, color: '#4B5563', fontWeight: '500' },
  divider: { width: 1, height: 12, backgroundColor: '#E5E7EB', marginHorizontal: 12 },
  
  progressWrapper: {},
  progressLabel: { fontSize: 12, fontWeight: '600', color: '#374151' },
  progressVal: { fontSize: 12, fontWeight: '700', color: '#111' },
  progressTrack: { height: 6, backgroundColor: '#F3F4F6', borderRadius: 3, marginTop: 4 },
  progressFill: { height: '100%', backgroundColor: '#10B981', borderRadius: 3 },

  navWrapper: { backgroundColor: '#FAFAFA', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  navContent: { paddingHorizontal: 16, gap: 10 },
  weekCard: { 
    width: 80, height: 74, 
    backgroundColor: '#FFF', borderRadius: 12, padding: 8, 
    justifyContent: 'space-between', alignItems: 'center',
    borderWidth: 1, borderColor: '#F3F4F6',
  },
  weekCardActive: { backgroundColor: '#111', borderColor: '#111', transform: [{scale: 1.05}] },
  weekNum: { fontSize: 12, color: '#9CA3AF', fontWeight: '600' },
  weekNumActive: { color: '#6B7280' },
  weekFocus: { fontSize: 11, fontWeight: '700', color: '#111', textAlign: 'center' },
  weekFocusActive: { color: '#FFF' },
  dotsRow: { flexDirection: 'row', gap: 3 },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#E5E7EB' },
  dotActive: { backgroundColor: '#34D399' },

  listContainer: { padding: 20 },
  weekHeader: { marginBottom: 16 },
  weekHeaderTitle: { fontSize: 16, fontWeight: '700', color: '#374151' },
  
  card: { 
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', 
    padding: 16, borderRadius: 16, marginBottom: 12,
    shadowColor: "#000", shadowOpacity: 0.02, shadowRadius: 8, shadowOffset: {width:0, height:2} 
  },
  cardIndex: { width: 28, height: 28, borderRadius: 8, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  indexText: { fontSize: 12, fontWeight: '700', color: '#6B7280' },
  cardCenter: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#111', marginBottom: 2 },
  cardSub: { fontSize: 12, color: '#6B7280' },
  cardRight: {},
  startBadge: { backgroundColor: '#EEF2FF', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  startText: { color: '#4F46E5', fontSize: 10, fontWeight: '800' },

  emptyBox: { padding: 40, alignItems: 'center' },
  emptyText: { color: '#9CA3AF' },

  // Bottom Float Button
  bottomFloat: { 
      position: 'absolute', bottom: 0, left: 0, right: 0, 
      paddingHorizontal: 20, 
      backgroundColor: 'transparent',
      alignItems: 'center'
  },
  mainBtn: { 
      backgroundColor: '#111', 
      width: '100%', 
      height: 54, 
      borderRadius: 27, 
      alignItems: 'center', 
      justifyContent: 'center', 
      shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 10, shadowOffset: {width: 0, height: 5},
      elevation: 6
  },
  mainBtnText: { color: '#FFF', fontWeight: '700', fontSize: 16 }
});