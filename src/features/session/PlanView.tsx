// src/features/session/PlanView.tsx

import React, { useCallback, useEffect, useMemo } from "react";
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  ScrollView,
  Alert
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Store
import useActiveWorkoutStore from "../../store/useActiveWorkoutStore";

// Components & Types
import { tokens } from "../../../components/ui/Theme"; 
import { PlanV3Session, PlanV3SessionItem } from "../../types/plan";

// --- 常量定义 ---
const READINESS_MAP: Record<number, { icon: string; en: string; zh: string }> = {
  1: { icon: "😫", en: "Tired", zh: "疲劳" },
  2: { icon: "😮‍💨", en: "Low", zh: "需恢复" },
  3: { icon: "🙂", en: "Ok", zh: "正常" },
  4: { icon: "💪", en: "Strong", zh: "不错" },
  5: { icon: "🔥", en: "Peak", zh: "极佳" },
};

// --- Header 组件 (完整版) ---
const PlanHeader = React.memo(({ 
  currentReadiness = 3, 
  onOpenStatus, 
  dayCompletion = 0, 
  isZH, 
  paddingTop,
  onMinimize, 
  timerValue 
}: any) => {
  const status = READINESS_MAP[currentReadiness] || READINESS_MAP[3];
  const percent = Math.round((isNaN(dayCompletion) ? 0 : dayCompletion) * 100);

  return (
    <View style={{ backgroundColor: '#FFF', paddingBottom: 16, paddingTop: paddingTop }}>
      {/* 1. TopBar: 收起 + 标题 + 计时 */}
      <View style={styles.topBarContainer}>
         <TouchableOpacity onPress={onMinimize} style={styles.backBtn}>
            <Ionicons name="chevron-down" size={28} color="#111" />
         </TouchableOpacity>
         
         <Text style={styles.headerTitle}>Active Workout</Text>
         
         <View style={styles.timerPill}>
            <Text style={styles.timerText}>{timerValue}</Text>
         </View>
      </View>

      {/* 2. Dashboard: Status + Progress (这里补全了代码) */}
      <View style={styles.dashboardContainer}>
        {/* 左侧状态 */}
        <TouchableOpacity onPress={onOpenStatus} style={styles.statusButton} activeOpacity={0.7}>
          <Text style={{ fontSize: 24 }}>{status.icon}</Text>
          <View style={{ marginLeft: 8 }}>
            <Text style={styles.statusLabelTitle}>{isZH ? "今日状态" : "STATUS"}</Text>
            <Text style={styles.statusLabelValue}>{isZH ? status.zh : status.en}</Text>
          </View>
        </TouchableOpacity>

        {/* 右侧进度条 */}
        <View style={styles.progressContainer}>
           <View style={styles.progressTextRow}>
              <Text style={styles.progressLabel}>{isZH ? "完成进度" : "Progress"}</Text>
              <Text style={styles.progressValue}>{percent}%</Text>
           </View>
           <View style={styles.progressBarTrack}>
              <View style={[styles.progressBarFill, { width: `${percent}%` }]} />
           </View>
        </View>
      </View>
    </View>
  );
});

// --- 动作卡片 ---
const ExerciseCard = ({ 
  item, index, tt, isCompleted, onToggleComplete, onOpenDetail 
}: any) => {
  const label = tt(item.label);
  const raw = item.raw || {};
  
  // 构建一行小字信息
  const parts = [];
  if (raw.sets) parts.push(`${raw.sets} sets`);
  if (raw.reps) parts.push(`${raw.reps} reps`);
  if (raw.seconds) parts.push(`${raw.seconds}s`);
  const subInfo = parts.join(" × ");

  return (
    <TouchableOpacity 
      style={[styles.simpleCard, isCompleted && styles.simpleCardCompleted]}
      onPress={() => onOpenDetail(item.raw)}
      activeOpacity={0.7}
    >
      <TouchableOpacity 
        style={[styles.checkCircle, isCompleted && styles.checkCircleActive]}
        onPress={() => onToggleComplete(index)}
      >
        {isCompleted && <Ionicons name="checkmark" size={16} color="#FFF" />}
      </TouchableOpacity>
      <View style={styles.cardContent}>
        <Text style={[styles.cardTitle, isCompleted && styles.textCompleted]}>{label}</Text>
        <Text style={styles.cardSub}>{subInfo}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#E5E7EB" />
    </TouchableOpacity>
  );
};

// --- 主页面 ---
type Props = {
  todaySession: PlanV3Session | null;
  selectedDate: string;
  onMinimize: () => void;
  onFinishWorkout: (data: any) => void;
  onOpenDetail: (item: PlanV3SessionItem) => void;
  // Status Callbacks (需要加上)
  currentReadiness: number;
  onOpenStatus: () => void;
  
  isZH: boolean;
  tt: (v: any) => string;
};

export default function PlanView(props: Props) {
  const {
    todaySession, selectedDate, 
    onMinimize, onFinishWorkout, onOpenDetail, 
    currentReadiness, onOpenStatus, // 接收状态 Props
    isZH, tt 
  } = props;

  const insets = useSafeAreaInsets();
  
  // 连接 Store
  const { 
    seconds, isPaused, pauseWorkout, resumeWorkout, 
    sessionData, updateSessionData 
  } = useActiveWorkoutStore();

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60).toString().padStart(2, '0');
    const sec = (s % 60).toString().padStart(2, '0');
    return `${m}:${sec}`;
  };

  // 初始化数据
  useEffect(() => {
    if (sessionData.length === 0 && todaySession?.blocks) {
        const items: any[] = [];
        todaySession.blocks.forEach(b => {
             b.items?.forEach(it => {
                 items.push({
                     label: it.name_override || { en: it.action_id, zh: it.action_id }, 
                     raw: it,
                     completed: false
                 });
             });
        });
        updateSessionData(items);
    }
  }, [todaySession]);

  const toggleComplete = useCallback((index: number) => {
    const newData = [...sessionData];
    newData[index].completed = !newData[index].completed;
    updateSessionData(newData);
  }, [sessionData, updateSessionData]);

  // 计算进度传给 Header
  const completedCount = sessionData.filter((i:any) => i.completed).length;
  const progress = sessionData.length > 0 ? completedCount / sessionData.length : 0;

  const togglePause = () => {
    if (isPaused) resumeWorkout();
    else pauseWorkout();
  };

  const handleFinishPress = () => {
    Alert.alert(
      isZH ? "完成训练?" : "Finish Workout?",
      isZH ? "确认结束并保存记录吗？" : "Are you sure you want to finish?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Finish", onPress: () => onFinishWorkout(sessionData) }
      ]
    );
  };

  if (!todaySession) return null;

  return (
    <View style={{ flex: 1, backgroundColor: "#FAFAFA" }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        <PlanHeader 
          paddingTop={insets.top}
          onMinimize={onMinimize}
          timerValue={formatTime(seconds)}
          // 传递状态数据
          currentReadiness={currentReadiness}
          onOpenStatus={onOpenStatus}
          dayCompletion={progress}
          isZH={isZH}
        />

        <View style={{ paddingHorizontal: 16 }}>
            {sessionData.map((item: any, index: number) => (
                <ExerciseCard 
                    key={`${selectedDate}_${index}`}
                    index={index}
                    item={item}
                    tt={tt}
                    isCompleted={item.completed}
                    onToggleComplete={toggleComplete}
                    onOpenDetail={onOpenDetail} 
                />
            ))}
        </View>
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom || 20 }]}>
          <TouchableOpacity 
            style={[styles.pauseBtn, isPaused && styles.resumeBtn]} 
            onPress={togglePause}
          >
              <Ionicons name={isPaused ? "play" : "pause"} size={24} color={isPaused ? "#FFF" : "#F59E0B"} />
              <Text style={[styles.pauseText, isPaused && {color: '#FFF'}]}>
                 {isPaused ? (isZH ? "继续" : "RESUME") : (isZH ? "暂停" : "PAUSE")}
              </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.finishBtn} onPress={handleFinishPress}>
              <Text style={styles.finishText}>{isZH ? "完成训练" : "FINISH"}</Text>
              <Ionicons name="checkmark-circle" size={20} color="#FFF" />
          </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Header
  topBarContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, marginBottom: 12, height: 44 },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'flex-start' },
  headerTitle: { fontSize: 17, fontWeight: '600', color: '#111', flex: 1, textAlign: 'center' },
  timerPill: { backgroundColor: '#F3F4F6', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  timerText: { color: '#111', fontWeight: '700', fontVariant: ['tabular-nums'], fontSize: 14 },
  
  // Dashboard (Status & Progress) - 找回的样式
  dashboardContainer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 12 },
  statusButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', padding: 8, paddingRight: 16, borderRadius: 16, minWidth: 110, borderWidth: 1, borderColor: '#F3F4F6' },
  statusLabelTitle: { fontSize: 9, color: '#6B7280', fontWeight: '700', textTransform: 'uppercase' },
  statusLabelValue: { fontSize: 13, fontWeight: '600', color: '#111' },
  progressContainer: { flex: 1, justifyContent: 'center' },
  progressTextRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  progressLabel: { fontSize: 12, fontWeight: '600', color: '#374151' },
  progressValue: { fontSize: 12, fontWeight: '700', color: '#306E6F' },
  progressBarTrack: { height: 8, backgroundColor: '#E5E7EB', borderRadius: 4, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: '#A5D23D', borderRadius: 4 },

  // Cards
  simpleCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', marginBottom: 12, borderRadius: 16, padding: 16, borderWidth: 0.5, borderColor: '#E5E7EB', shadowColor: "#000", shadowOpacity: 0.02, shadowRadius: 4, shadowOffset: {width:0, height:2} },
  simpleCardCompleted: { opacity: 0.6, backgroundColor: '#F9FAFB' },
  checkCircle: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: '#D1D5DB', alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  checkCircleActive: { borderColor: '#10B981', backgroundColor: '#10B981', borderWidth: 0 },
  cardContent: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#111', marginBottom: 4 },
  cardSub: { fontSize: 12, color: '#6B7280', fontWeight: '500' },
  textCompleted: { textDecorationLine: 'line-through', color: '#9CA3AF' },

  // Bottom Bar
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#E5E7EB', padding: 16, flexDirection: 'row', gap: 12 },
  pauseBtn: { flex: 1, height: 56, borderRadius: 28, backgroundColor: '#FFF9E6', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, borderWidth: 1, borderColor: '#F59E0B' },
  resumeBtn: { backgroundColor: '#F59E0B', borderColor: '#F59E0B' },
  pauseText: { color: '#F59E0B', fontSize: 15, fontWeight: '700' },
  finishBtn: { flex: 2, height: 56, borderRadius: 28, backgroundColor: '#111827', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 10 },
  finishText: { color: '#FFF', fontSize: 15, fontWeight: '700', letterSpacing: 0.5 }
});