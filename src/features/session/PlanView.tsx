// src/features/session/PlanView.tsx

import React, { useCallback, useEffect } from "react";
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
import { PlanV3Session, PlanV3SessionItem } from "../../types/plan";
import { ExerciseItemCard } from "../../components/shared/ExerciseItemCard";

// --- Header: minimize + title + timer + progress ---
const PlanHeader = React.memo(({
  dayCompletion = 0,
  isZH,
  paddingTop,
  onMinimize,
  timerValue
}: {
  dayCompletion: number;
  isZH: boolean;
  paddingTop: number;
  onMinimize: () => void;
  timerValue: string;
}) => {
  const percent = Math.round((isNaN(dayCompletion) ? 0 : dayCompletion) * 100);

  return (
    <View style={{ backgroundColor: '#FFF', paddingBottom: 16, paddingTop }}>
      {/* TopBar: minimize + title + timer */}
      <View style={styles.topBarContainer}>
         <TouchableOpacity onPress={onMinimize} style={styles.backBtn}>
            <Ionicons name="chevron-down" size={28} color="#111" />
         </TouchableOpacity>

         <Text style={styles.headerTitle}>{isZH ? "训练中" : "Active Workout"}</Text>

         <View style={styles.timerPill}>
            <Text style={styles.timerText}>{timerValue}</Text>
         </View>
      </View>

      {/* Progress bar */}
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
  );
});

// ExerciseCard maps sessionData item → ExerciseItemCard props
const ExerciseCard = ({
  item, index, isZH, isCompleted, onNavigate
}: {
  item: any;
  index: number;
  isZH: boolean;
  isCompleted: boolean;
  onNavigate: (index: number) => void;
}) => {
  const raw = item.raw || {};
  return (
    <ExerciseItemCard
      item={{
        action_id: raw.action_id,
        sets: raw.sets,
        reps: raw.reps,
        seconds: raw.seconds,
        rest_sec: raw.rest_sec,
        name_override: raw.name_override,
        media: raw.media,
        cues: raw.cues,
      }}
      mode="execution"
      locale={isZH ? "zh" : "en"}
      completed={isCompleted}
      onPress={() => onNavigate(index)}
    />
  );
};

// --- Main ---
type Props = {
  todaySession: PlanV3Session | null;
  selectedDate: string;
  onMinimize: () => void;
  onFinishWorkout: (data: any) => void;
  onExerciseNavigate: (item: PlanV3SessionItem, index: number) => void;
  isZH: boolean;
  tt: (v: any) => string;
};

export default function PlanView(props: Props) {
  const {
    todaySession, selectedDate,
    onMinimize, onFinishWorkout, onExerciseNavigate,
    isZH
  } = props;

  const insets = useSafeAreaInsets();

  // Store
  const {
    seconds, isPaused, pauseWorkout, resumeWorkout,
    sessionData, updateSessionData
  } = useActiveWorkoutStore();

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60).toString().padStart(2, '0');
    const sec = (s % 60).toString().padStart(2, '0');
    return `${m}:${sec}`;
  };

  // Init data
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

  const handleNavigate = useCallback((index: number) => {
    const item = sessionData[index];
    if (item?.raw) {
      onExerciseNavigate(item.raw, index);
    }
  }, [sessionData, onExerciseNavigate]);

  // Progress
  const completedCount = sessionData.filter((i: any) => i.completed).length;
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
    <View style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        <PlanHeader
          paddingTop={insets.top}
          onMinimize={onMinimize}
          timerValue={formatTime(seconds)}
          dayCompletion={progress}
          isZH={isZH}
        />

        <View style={{ paddingHorizontal: 16 }}>
            {sessionData.map((item: any, index: number) => (
                <ExerciseCard
                    key={`${selectedDate}_${index}`}
                    index={index}
                    item={item}
                    isZH={isZH}
                    isCompleted={item.completed}
                    onNavigate={handleNavigate}
                />
            ))}
        </View>
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom || 20 }]}>
          <TouchableOpacity
            style={[styles.pauseBtn, isPaused && styles.resumeBtn]}
            onPress={togglePause}
          >
              <Ionicons name={isPaused ? "play" : "pause"} size={24} color={isPaused ? "#FFF" : "#1C1C1E"} />
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
  headerTitle: { fontSize: 17, fontFamily: 'DMSans_700Bold', color: '#111', flex: 1, textAlign: 'center' },
  timerPill: { backgroundColor: '#F7F7F7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  timerText: { color: '#111', fontFamily: 'DMMono_500Medium', fontVariant: ['tabular-nums'], fontSize: 14 },

  // Progress
  progressContainer: { paddingHorizontal: 16 },
  progressTextRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  progressLabel: { fontSize: 12, fontFamily: 'DMSans_500Medium', color: '#888888' },
  progressValue: { fontSize: 12, fontFamily: 'DMMono_500Medium', color: '#111' },
  progressBarTrack: { height: 3, backgroundColor: 'rgba(0,0,0,0.08)', borderRadius: 2, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: '#306E6F', borderRadius: 2 },

  // Bottom Bar
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.08)', padding: 16, flexDirection: 'row', gap: 12 },
  pauseBtn: { flex: 1, height: 56, borderRadius: 28, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, borderWidth: 1.5, borderColor: '#1C1C1E' },
  resumeBtn: { backgroundColor: '#1C1C1E', borderColor: '#1C1C1E' },
  pauseText: { color: '#1C1C1E', fontSize: 15, fontFamily: 'DMSans_700Bold' },
  finishBtn: { flex: 2, height: 56, borderRadius: 28, backgroundColor: '#1C1C1E', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  finishText: { color: '#FFF', fontSize: 15, fontFamily: 'DMSans_700Bold', letterSpacing: 0.5 }
});
