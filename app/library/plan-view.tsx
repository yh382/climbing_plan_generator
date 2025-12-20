// app/library/plan-view.tsx

import React, { useMemo, useState, useEffect } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";

import PlanView from "../../src/features/session/PlanView";
import ActionDetailModal from "../../src/features/calendar/ActionDetailModal";
import { useI18N } from "../../lib/i18n"; 
import { PlanV3Session, PlanV3SessionItem } from "../../src/types/plan";
import useActiveWorkoutStore from "../../src/store/useActiveWorkoutStore";

// Mock Data
const getMockSession = (id: string, title: string): PlanV3Session => ({
  id: id || "mock-id-001",
  session_id: id || "mock-session-001",
  type: "train", 
  name: title || "Workout",
  blocks: [
    {
      block_type: "Linear", 
      items: [
        {
          action_id: "Barbell Bench Press",
          name_override: { en: "Barbell Bench Press", zh: "杠铃卧推" },
          sets: 3,
          reps: 8,
          notes: { en: "Focus on chest", zh: "专注于胸肌发力" },
          media: { video: "https://example.com/bench.mp4" } 
        },
        {
          action_id: "Weighted Pull-ups",
          name_override: { en: "Weighted Pull-ups", zh: "负重引体向上" },
          sets: 3,
          reps: 6,
        },
        {
          action_id: "Dumbbell Shoulder Press",
          name_override: { en: "DB Shoulder Press", zh: "哑铃推举" },
          sets: 3,
          reps: 10,
        }
      ]
    }
  ]
});

export default function PlanViewRoute() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { isZH } = useI18N(); 
  
  const { startWorkout, minimizeWorkout, finishWorkout, isActive, tick } = useActiveWorkoutStore();

  const [detailVisible, setDetailVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState<PlanV3SessionItem | null>(null);

  const tt = (v: any) => {
    if (!v) return "";
    if (typeof v === "string") return v;
    return isZH ? (v.zh || v.en) : (v.en || v.zh);
  };

  const todaySession = useMemo(() => {
    const sid = Array.isArray(params.id) ? params.id[0] : params.id;
    const stitle = Array.isArray(params.title) ? params.title[0] : params.title;
    return getMockSession(sid || "", stitle || "");
  }, [params.id, params.title]);

  useEffect(() => {
    if (!isActive) {
      startWorkout(todaySession.name || "Workout", []);
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
       tick();
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleFinish = (data: any) => {
    finishWorkout(); 
    router.dismissAll(); 
    router.navigate("/(tabs)/calendar");
  };

  // [修改] 统一返回逻辑
  const handleMinimize = () => {
    minimizeWorkout(); 
    
    // 强制回到日历 Tab，而不是简单的 back()
    // dismissAll() 有助于清理堆栈，防止用户按安卓物理返回键又回到这里
    router.dismissAll(); 
    router.navigate("/(tabs)/calendar");     
  };

  const handleOpenDetail = (item: PlanV3SessionItem) => {
    setSelectedItem(item);
    setDetailVisible(true);
  };

  return (
    <>
      <PlanView
        todaySession={todaySession}
        selectedDate={new Date().toISOString().split('T')[0]}
        
        // 传递回调
        onMinimize={handleMinimize}
        onFinishWorkout={handleFinish}
        onOpenDetail={handleOpenDetail}
        
        currentReadiness={3}
        onOpenStatus={() => console.log("Open Status Picker")}
        
        isZH={isZH}
        tt={tt}
      />

      <ActionDetailModal 
        visible={detailVisible}
        onClose={() => setDetailVisible(false)}
        item={selectedItem}
        isZH={isZH}
      />
    </>
  );
}