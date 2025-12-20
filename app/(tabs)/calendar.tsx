// app/(tabs)/calendar.tsx
import React, { useState, useCallback, useMemo } from "react";
import { View, ScrollView, TouchableOpacity, StyleSheet, RefreshControl, Text } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { startOfWeek, startOfMonth, isAfter, parseISO, format } from "date-fns";

// Components
import TopBar from "../../components/TopBar";
import ExpandableCalendar from "../../src/features/session/components/ExpandableCalendar";
import CycleProgressCard from "../../src/features/session/components/CycleProgressCard";
import DailyLogCard from "../../src/features/session/components/DailyLogCard";
import PreSessionModal from "../../src/features/session/components/PreSessionModal"; // [新增]

// Stores & Types
import { useI18N } from "../../lib/i18n";
import { PlanV3 } from "../../src/types/plan";
import useLogsStore from "../../src/store/useLogsStore"; 
import MiniWorkoutPlayer from "../../src/components/MiniWorkoutPlayer";

export default function CalendarScreen() {
  const router = useRouter();
  const { isZH } = useI18N();
  const { sessions, startSession } = useLogsStore(); // [新增] 替换为 sessions
  
  const [refreshing, setRefreshing] = useState(false);
  const [planV3, setPlanV3] = useState<PlanV3 | null>(null);
  const [timeFilter, setTimeFilter] = useState<'week'|'month'>('week'); 
  const [showStartModal, setShowStartModal] = useState(false); // [新增] 弹窗控制
  
  const loadPlan = useCallback(async () => {
      try {
        const rawV3 = await AsyncStorage.getItem("@current_plan_v3");
        setPlanV3(rawV3 ? JSON.parse(rawV3) : null);
      } catch {
        setPlanV3(null);
      }
  }, []);

  useFocusEffect(useCallback(() => { loadPlan(); }, [loadPlan]));

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPlan();
    setRefreshing(false);
  };

  const handleStartSession = (gymName: string) => {
    startSession(gymName);
    setShowStartModal(false);
    router.push("/journal");
  };

  const cycleData = useMemo(() => {
    if (!planV3) return null;
    return {
        name: planV3.meta.start_date ? `Cycle starting ${planV3.meta.start_date}` : "Current Cycle",
        totalWeeks: planV3.meta.cycle_weeks || 12,
        currentWeek: 1, 
        remainingSessions: (planV3.session_bank?.climb_sessions?.length || 0) + (planV3.session_bank?.train_sessions?.length || 0)
    };
  }, [planV3]);

  // [修改] 使用 sessions 数组渲染
  const historyList = useMemo(() => {
    if (!sessions || sessions.length === 0) return [];
    
    const now = new Date();
    const startDate = timeFilter === 'week' ? startOfWeek(now, { weekStartsOn: 1 }) : startOfMonth(now);

    return sessions
        .filter(s => {
            const d = parseISO(s.date);
            return isAfter(d, startDate) || format(d, 'yyyy-MM-dd') === format(startDate, 'yyyy-MM-dd');
        })
        .sort((a, b) => b.startTime.localeCompare(a.startTime)) // 倒序
        .map(s => ({
            id: s.id,
            dateLabel: format(parseISO(s.date), "EEE · MMM dd"),
            rawDate: s.date,
            duration: s.duration,
            sends: 0, // 暂时显示 0，或者你可以去 logs 里聚合算出这次 session 的 sends
            max: "V?" // 同上
        }));
  }, [sessions, timeFilter]);

  return (
    <View style={{ flex: 1, backgroundColor: "#FAFAFA" }}>
      
      {/* Header */}
      <View style={{ backgroundColor: '#FFFFFF', borderBottomWidth: 0.5, borderBottomColor: '#E5E7EB', zIndex: 100 }}>
        <TopBar 
          routeName="calendar_dashboard" 
          titleZH="日程" 
          titleEN="Calendar"
          rightAccessory={
            <TouchableOpacity style={{ padding: 4 }} onPress={() => router.push("/analysis")}>
                <Ionicons name="stats-chart" size={24} color="#111" />
            </TouchableOpacity>
          }
        />
      </View>

      <ScrollView 
        contentContainerStyle={{ paddingBottom: 100, paddingTop: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <ExpandableCalendar />

        {/* Current Training */}
        <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{isZH ? "当前训练" : "Current Training"}</Text>
        </View>

        {cycleData ? (
            <CycleProgressCard 
                cycleName={cycleData.name}
                totalWeeks={cycleData.totalWeeks}
                currentWeek={cycleData.currentWeek}
                remainingSessions={cycleData.remainingSessions}
                onPress={() => router.push("/library/plan-overview")} 
            />
        ) : (
            <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>No Active Plan</Text>
                <Text style={styles.emptySub}>Create a plan to start training!</Text>
                <TouchableOpacity style={styles.createBtn} onPress={() => router.push("/library/plan-overview")}>
                    <Text style={styles.createBtnText}>Generate Plan</Text>
                </TouchableOpacity>
            </View>
        )}

        {/* Log List Section */}
        <View style={styles.logSectionHeader}>
            <TouchableOpacity 
                style={styles.filterBtn}
                onPress={() => setTimeFilter(prev => prev === 'week' ? 'month' : 'week')}
            >
                <Text style={styles.sectionTitle}>
                    {timeFilter === 'week' ? (isZH?"本周攀爬":"This Week's Climbing") : (isZH?"本月攀爬":"This Month's Climbing")}
                </Text>
                <Ionicons name="chevron-down" size={16} color="#111" style={{marginTop: 2}} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.startLogBtn} onPress={() => setShowStartModal(true)}>
                <Ionicons name="add" size={18} color="#FFF" />
                <Text style={styles.startLogText}>Start Log</Text>
            </TouchableOpacity>
        </View>
        
        {/* Render Real Sessions */}
        {historyList.length > 0 ? (
            <View style={{ gap: 0 }}>
                {historyList.map((log) => (
                    <DailyLogCard 
                        key={log.id}
                        dateLabel={log.dateLabel}
                        duration={log.duration}
                        sends={log.sends} 
                        maxGrade={log.max}
                        onPress={() => {
                            router.push({
                                pathname: "/library/log-detail",
                                params: { date: log.rawDate }
                            }); 
                        }}
                    />
                ))}
            </View>
        ) : (
            <View style={{ padding: 24, alignItems: 'center', opacity: 0.5 }}>
                <Ionicons name="document-text-outline" size={32} color="#9CA3AF" />
                <Text style={{ color: '#9CA3AF', marginTop: 8 }}>
                    {isZH ? "暂无记录" : "No logs yet."}
                </Text>
            </View>
        )}
      </ScrollView>

      {/* Start Session Modal */}
      <PreSessionModal 
        visible={showStartModal} 
        onClose={() => setShowStartModal(false)}
        onStart={handleStartSession}
      />
      <MiniWorkoutPlayer />
    </View>
  );
}

const styles = StyleSheet.create({
  sectionHeader: { paddingHorizontal: 20, marginBottom: 8, marginTop: 8 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#111' },
  logSectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginTop: 24, marginBottom: 12 },
  filterBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  startLogBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#111827', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, gap: 4, shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 4, shadowOffset: {width:0, height:2}, elevation: 2 },
  startLogText: { color: '#FFF', fontWeight: '700', fontSize: 12 },
  emptyCard: { backgroundColor: '#FFF', margin: 16, padding: 24, borderRadius: 16, alignItems: 'center', borderStyle: 'dashed', borderWidth: 1, borderColor: '#E5E7EB' },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#374151', marginBottom: 4 },
  emptySub: { fontSize: 12, color: '#9CA3AF', marginBottom: 16 },
  createBtn: { backgroundColor: '#111827', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
  createBtnText: { color: '#FFF', fontWeight: '600' },
});