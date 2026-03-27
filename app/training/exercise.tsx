// app/training/exercise.tsx — ExerciseTrainingScreen (minimal timer page)

import React, { useState, useCallback, useMemo, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Modal,
  Pressable,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { HeaderButton } from "../../src/components/ui/HeaderButton";

import ExerciseTimer from "../../src/features/session/components/ExerciseTimer";
import LogWorkoutSheet from "../../src/features/session/components/LogWorkoutSheet";
import { useI18N } from "../../lib/i18n";
import type { PlanV3SessionItem } from "../../src/types/plan";
import useActiveWorkoutStore from "../../src/store/useActiveWorkoutStore";
import { exercisesApi } from "../../src/features/exercises/api";

export default function ExerciseTrainingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const { isZH, tt } = useI18N();

  const { sessionData, updateSessionData } = useActiveWorkoutStore();

  // Parse route params
  const exerciseId = Array.isArray(params.exerciseId) ? params.exerciseId[0] : params.exerciseId;
  const exerciseIndex = params.exerciseIndex ? Number(params.exerciseIndex) : -1;

  const sessionItem: PlanV3SessionItem | null = useMemo(() => {
    if (params.sessionItem) {
      try {
        const raw = Array.isArray(params.sessionItem) ? params.sessionItem[0] : params.sessionItem;
        return JSON.parse(raw);
      } catch { return null; }
    }
    return null;
  }, [params.sessionItem]);

  const [showLogSheet, setShowLogSheet] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [allDone, setAllDone] = useState(false);
  const [enrichedImage, setEnrichedImage] = useState<string | null>(null);

  // Fetch backend image if missing
  useEffect(() => {
    if (exerciseId && sessionItem && !sessionItem.media?.image && !(sessionItem.media as any)?.thumbnail_url) {
      exercisesApi.getExerciseDetail(exerciseId).then(detail => {
        const media = detail.media as any;
        const img = media?.thumbnail_url || media?.image_url || media?.image || null;
        if (img) setEnrichedImage(img);
      }).catch(() => {});
    }
  }, [exerciseId, sessionItem]);

  const totalSets = sessionItem?.sets || 1;
  const totalReps = sessionItem?.reps || 1;
  const workSeconds = sessionItem?.seconds || 0;
  const restSec = sessionItem?.rest_sec || 60;
  const exerciseName = tt(sessionItem?.name_override) || exerciseId || "";
  const imageUrl = sessionItem?.media?.image || (sessionItem?.media as any)?.thumbnail_url || enrichedImage;

  const handleAllComplete = useCallback(() => {
    setAllDone(true);
  }, []);

  const markExerciseCompleted = useCallback(() => {
    if (exerciseIndex >= 0 && sessionData[exerciseIndex]) {
      const newData = [...sessionData];
      newData[exerciseIndex] = { ...newData[exerciseIndex], completed: true };
      updateSessionData(newData);
    }
    router.dismiss(2);
  }, [exerciseIndex, sessionData, updateSessionData, router]);

  const handleLogSave = useCallback((data: any) => {
    setShowLogSheet(false);
    markExerciseCompleted();
  }, [markExerciseCompleted]);

  if (!sessionItem) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.center}>
          <Text style={styles.errorText}>{isZH ? "未找到动作数据" : "Exercise data not found"}</Text>
          <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 12 }}>
            <Text style={styles.linkText}>{isZH ? "返回" : "Go back"}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <HeaderButton icon="chevron.backward" onPress={() => router.back()} />
        <Text style={styles.headerTitle} numberOfLines={1}>{exerciseName}</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Image (compact) */}
      <View style={styles.imageContainer}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={[styles.image, styles.imagePlaceholder]}>
            <Ionicons name="barbell-outline" size={32} color="#888888" />
          </View>
        )}
      </View>

      {/* Timer area (fills remaining space) */}
      <View style={styles.timerArea}>
        {/* "?" info button */}
        <TouchableOpacity style={styles.infoBtn} onPress={() => setShowInfo(true)}>
          <Ionicons name="help-circle-outline" size={24} color="#9CA3AF" />
        </TouchableOpacity>

        <ExerciseTimer
          sets={totalSets}
          reps={totalReps}
          seconds={workSeconds}
          restSec={restSec}
          onAllComplete={handleAllComplete}
          isZH={isZH}
        />
      </View>

      {/* Bottom bar: Log button */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom || 16 }]}>
        {allDone ? (
          <TouchableOpacity
            style={styles.logBtnComplete}
            onPress={() => setShowLogSheet(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="checkmark-circle" size={20} color="#FFF" />
            <Text style={styles.logBtnCompleteText}>
              {isZH ? "完成并记录" : "Complete & Log"}
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.logBtnDefault}
            onPress={() => setShowLogSheet(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="clipboard-outline" size={18} color="#6B7280" />
            <Text style={styles.logBtnDefaultText}>
              {isZH ? "记录" : "Log"}
            </Text>
            <Text style={styles.logHint}>
              {isZH ? "完成后记录" : "Log after finish"}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* "?" Info Modal */}
      <Modal visible={showInfo} transparent animationType="fade" onRequestClose={() => setShowInfo(false)}>
        <Pressable style={styles.infoOverlay} onPress={() => setShowInfo(false)}>
          <Pressable style={styles.infoCard} onPress={() => {}}>
            <View style={styles.infoHeader}>
              <Text style={styles.infoTitle}>{exerciseName}</Text>
              <TouchableOpacity onPress={() => setShowInfo(false)}>
                <Ionicons name="close" size={22} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>{isZH ? "目标 RPE" : "Target RPE"}</Text>
              <Text style={styles.infoValue}>{sessionItem.rpe_target || "-"}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>{isZH ? "休息时间" : "Rest Time"}</Text>
              <Text style={styles.infoValue}>{restSec}s</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>{isZH ? "组数 × 次数" : "Sets × Reps"}</Text>
              <Text style={styles.infoValue}>{totalSets} × {totalReps}</Text>
            </View>

            {sessionItem.cues && (
              <View style={styles.infoCuesSection}>
                <Text style={styles.infoCuesLabel}>{isZH ? "动作要点" : "Cues"}</Text>
                <Text style={styles.infoCuesText}>{tt(sessionItem.cues)}</Text>
              </View>
            )}

            {sessionItem.notes && (
              <View style={styles.infoCuesSection}>
                <Text style={styles.infoCuesLabel}>{isZH ? "备注" : "Notes"}</Text>
                <Text style={styles.infoCuesText}>{tt(sessionItem.notes)}</Text>
              </View>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Log Workout Sheet */}
      <LogWorkoutSheet
        visible={showLogSheet}
        exerciseName={exerciseName}
        onSave={handleLogSave}
        onClose={() => setShowLogSheet(false)}
        isZH={isZH}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  errorText: { fontSize: 16, color: "#888888", textAlign: "center" },
  linkText: { fontSize: 16, color: "#306E6F", textAlign: "center" },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 8,
    backgroundColor: "#FFF",
    borderBottomWidth: 0.5,
    borderBottomColor: "rgba(0,0,0,0.08)",
  },
  backBtn: { padding: 8, width: 40 },
  headerTitle: { flex: 1, fontSize: 17, fontFamily: "DMSans_700Bold", color: "#000000", textAlign: "center" },

  // Image
  imageContainer: {
    alignItems: "center",
    paddingVertical: 12,
    backgroundColor: "#FFF",
  },
  image: {
    width: 120,
    height: 120,
    borderRadius: 14,
  },
  imagePlaceholder: {
    backgroundColor: "#272727",
    alignItems: "center",
    justifyContent: "center",
  },

  // Timer area
  timerArea: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
    justifyContent: "center",
  },
  infoBtn: {
    position: "absolute",
    top: 12,
    right: 20,
    zIndex: 10,
    padding: 4,
  },

  // Bottom bar
  bottomBar: {
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: "#F7F7F7",
    borderTopWidth: 0,
  },
  logBtnDefault: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    backgroundColor: "#FFF",
  },
  logBtnDefaultText: {
    fontSize: 15,
    fontFamily: "DMSans_500Medium",
    color: "#888888",
  },
  logHint: {
    fontSize: 11,
    color: "#BBBBBB",
  },
  logBtnComplete: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#1C1C1E",
  },
  logBtnCompleteText: {
    fontSize: 16,
    fontFamily: "DMSans_700Bold",
    color: "#FFF",
  },

  // Info modal
  infoOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  infoCard: {
    backgroundColor: "#FFF",
    borderRadius: 20,
    padding: 24,
  },
  infoHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  infoTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111",
    flex: 1,
    marginRight: 12,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: "#F3F4F6",
  },
  infoLabel: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
  },
  infoValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111",
  },
  infoCuesSection: {
    marginTop: 16,
  },
  infoCuesLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 6,
  },
  infoCuesText: {
    fontSize: 14,
    color: "#4B5563",
    lineHeight: 22,
  },
});
