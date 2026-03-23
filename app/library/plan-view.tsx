// app/library/plan-view.tsx

import React, { useMemo, useState, useEffect, useCallback } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Modal, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

import PlanView from "../../src/features/session/PlanView";
import SelfAssessment, { type SelfAssessmentData } from "../../src/features/session/components/SelfAssessment";
import { useI18N } from "../../lib/i18n";
import { PlanV3Session, PlanV3SessionItem } from "../../src/types/plan";
import useActiveWorkoutStore from "../../src/store/useActiveWorkoutStore";
import { plansApi } from "../../src/features/plans/api";

// Fallback mock data (only used when no sessionJson param)
const MOCK_SESSION: PlanV3Session = {
  id: "mock-id-001",
  session_id: "mock-session-001",
  type: "train",
  name: "Workout",
  blocks: [
    {
      block_type: "Linear",
      items: [
        { action_id: "Barbell Bench Press", name_override: { en: "Barbell Bench Press", zh: "杠铃卧推" }, sets: 3, reps: 8 },
        { action_id: "Weighted Pull-ups", name_override: { en: "Weighted Pull-ups", zh: "负重引体向上" }, sets: 3, reps: 6 },
        { action_id: "DB Shoulder Press", name_override: { en: "DB Shoulder Press", zh: "哑铃推举" }, sets: 3, reps: 10 },
      ],
    },
  ],
};

export default function PlanViewRoute() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { isZH } = useI18N();

  const { isActive, isMinimized, startWorkout, minimizeWorkout, maximizeWorkout, finishWorkout, tick } = useActiveWorkoutStore();

  const [showAssessment, setShowAssessment] = useState(false);

  const tt = (v: any) => {
    if (!v) return "";
    if (typeof v === "string") return v;
    return isZH ? (v.zh || v.en) : (v.en || v.zh);
  };

  const todaySession = useMemo((): PlanV3Session => {
    const raw = Array.isArray(params.sessionJson) ? params.sessionJson[0] : params.sessionJson;
    if (raw) {
      try {
        return JSON.parse(raw) as PlanV3Session;
      } catch { /* fall through to mock */ }
    }
    return MOCK_SESSION;
  }, [params.sessionJson]);

  useEffect(() => {
    if (isActive && isMinimized) {
      // Returning from minimized state — just maximize
      maximizeWorkout();
      return;
    }
    // Fresh start — init workout with session data
    const items: any[] = [];
    todaySession.blocks?.forEach(b => {
      b.items?.forEach(it => {
        items.push({
          label: it.name_override || { en: it.action_id, zh: it.action_id },
          raw: it,
          completed: false,
        });
      });
    });
    const raw = Array.isArray(params.sessionJson) ? params.sessionJson[0] : params.sessionJson;
    startWorkout(todaySession.name || "Workout", items, raw || "");
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
       tick();
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleFinish = useCallback((data: any) => {
    setShowAssessment(true);
  }, []);

  const planId = Array.isArray(params.planId) ? params.planId[0] : params.planId;
  const planSessionId = Array.isArray(params.planSessionId) ? params.planSessionId[0] : params.planSessionId;

  const handleAssessmentSubmit = useCallback(async (assessment: SelfAssessmentData) => {
    const { sessionData, seconds } = useActiveWorkoutStore.getState();
    const completedCount = sessionData.filter((i: any) => i.completed).length;
    const totalCount = sessionData.length;

    // Persist exercise completion marks for plan-overview
    if (planId) {
      for (const item of sessionData) {
        if (item.completed && item.raw?.action_id) {
          await AsyncStorage.setItem(
            `exercise_completion_${planId}_${item.raw.action_id}`,
            "true"
          );
        }
      }
    }

    // Sync plan session completion to backend
    if (planId && planSessionId) {
      try {
        await plansApi.completePlanSession(planId, {
          planned_session_id: planSessionId,
          planned_session_type: todaySession.type || "train",
        });
      } catch { /* best-effort — don't block navigation */ }
    }

    finishWorkout();
    setShowAssessment(false);

    router.push({
      pathname: "/training/summary",
      params: {
        duration: String(seconds),
        completedCount: String(completedCount),
        totalCount: String(totalCount),
        rpe: String(assessment.rpe),
        feeling: String(assessment.feeling),
      },
    } as any);
  }, [finishWorkout, router, planId, planSessionId, todaySession.type]);

  const handleMinimize = useCallback(() => {
    minimizeWorkout();
    router.dismissAll();
    router.navigate("/(tabs)/calendar");
  }, [minimizeWorkout, router]);

  const handleExerciseNavigate = useCallback((item: PlanV3SessionItem, index: number) => {
    router.push({
      pathname: "/library/exercise-detail",
      params: {
        exerciseId: item.action_id,
        context: "execution",
        sessionItem: JSON.stringify(item),
        exerciseIndex: String(index),
      },
    } as any);
  }, [router]);

  return (
    <>
      <PlanView
        todaySession={todaySession}
        selectedDate={new Date().toISOString().split('T')[0]}
        onMinimize={handleMinimize}
        onFinishWorkout={handleFinish}
        onExerciseNavigate={handleExerciseNavigate}
        isZH={isZH}
        tt={tt}
      />

      <Modal visible={showAssessment} animationType="slide" presentationStyle="pageSheet">
        <View style={{ flex: 1, backgroundColor: "#FFF", justifyContent: "center" }}>
          <SelfAssessment onSubmit={handleAssessmentSubmit} isZH={isZH} />
        </View>
      </Modal>
    </>
  );
}
