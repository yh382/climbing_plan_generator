// app/library/exercise-detail.tsx

import { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";

import TopBar from "../../components/TopBar";
import { exercisesApi } from "../../src/features/exercises/api";
import type { ExerciseDetail } from "../../src/features/exercises/types";
import { parseExerciseName } from "../../src/lib/exerciseUtils";

type ExerciseContext = "custom" | "library" | "execution";

function detectLocale(): "zh" | "en" {
  try {
    const loc = Intl.DateTimeFormat().resolvedOptions().locale || "en";
    return loc.toLowerCase().startsWith("zh") ? "zh" : "en";
  } catch {
    return "en";
  }
}

function getMediaUrl(media: ExerciseDetail["media"]): string | null {
  if (!media) return null;
  return (
    (media as any)?.thumbnail_url ||
    (media as any)?.image_url ||
    (media as any)?.thumb ||
    (media as any)?.image ||
    media?.video ||
    null
  );
}

function formatGoal(goal: string): string {
  const map: Record<string, string> = {
    strength_power: "Strength & Power",
    power_endurance: "Power Endurance",
    endurance: "Endurance",
    conditioning: "Conditioning",
  };
  return map[goal] || goal;
}

export default function ExerciseDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const locale = useMemo(() => detectLocale(), []);

  const params = useLocalSearchParams<{
    exerciseId: string;
    context: string;
    planId?: string;
    sessionId?: string;
    blockIndex?: string;
    sessionItem?: string;
    exerciseIndex?: string;
  }>();

  const exerciseId = params.exerciseId ?? "";
  const context = (params.context as ExerciseContext) || "library";

  const [exercise, setExercise] = useState<ExerciseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Adjustable protocol values
  const [sets, setSets] = useState(0);
  const [reps, setReps] = useState(0);
  const [restSec, setRestSec] = useState(0);

  useEffect(() => {
    if (!exerciseId) return;
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await exercisesApi.getExerciseDetail(exerciseId);
        if (!alive) return;
        setExercise(data);

        // Init protocol values
        const p = data.protocol;
        if (p) {
          setSets(p.sets ?? p.num_sets ?? 0);
          setReps(p.reps ?? p.num_reps ?? 0);
          setRestSec(p.rest_between_sets_min ? Math.round(p.rest_between_sets_min * 60) : p.rest_sec ?? 0);
        }
      } catch (e: any) {
        if (!alive) return;
        setError(e?.message || "Failed to load exercise");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => { alive = false; };
  }, [exerciseId]);

  const handleStartExercise = () => {
    router.push({
      pathname: "/training/exercise",
      params: {
        exerciseId,
        exerciseIndex: params.exerciseIndex ?? "-1",
        sessionItem: params.sessionItem ?? "",
      },
    } as any);
  };

  const handleAddToPlan = () => {
    // Return exercise data to the builder via router params
    router.back();
    // The builder will read the selected exercise from a temp store or params
    // For now, we set a global flag via AsyncStorage
    const payload = JSON.stringify({
      action_id: exerciseId,
      sets: sets || undefined,
      reps: reps || undefined,
      rest_sec: restSec || undefined,
      name_override: exercise
        ? { zh: exercise.name_zh, en: exercise.name_en }
        : undefined,
      media: exercise?.media || undefined,
      cues: exercise
        ? { zh: exercise.cues_zh || "", en: exercise.cues_en || "" }
        : undefined,
    });
    AsyncStorage.setItem("__pending_exercise__", payload);
  };

  if (loading) {
    return (
      <View style={[s.container, { paddingTop: insets.top }]}>
        <TopBar
          routeName="exercise_detail"
          title=""
          useSafeArea={false}
          leftControls={{ mode: "back", onBack: () => router.back() }}
        />
        <View style={s.center}>
          <ActivityIndicator size="large" color="#111" />
        </View>
      </View>
    );
  }

  if (error || !exercise) {
    return (
      <View style={[s.container, { paddingTop: insets.top }]}>
        <TopBar
          routeName="exercise_detail"
          title=""
          useSafeArea={false}
          leftControls={{ mode: "back", onBack: () => router.back() }}
        />
        <View style={s.center}>
          <Text style={{ color: "#9CA3AF", fontSize: 15 }}>{error || "Exercise not found"}</Text>
          <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 16 }}>
            <Text style={{ color: "#4F46E5", fontWeight: "700" }}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const rawTitle = locale === "zh" ? exercise.name_zh : exercise.name_en;
  const { shortName: title, detailName } = parseExerciseName(rawTitle);
  const cues = locale === "zh" ? exercise.cues_zh : exercise.cues_en;
  const imgUrl = getMediaUrl(exercise.media);
  const rpeRange = exercise.rpe_range;
  const estDuration = exercise.duration_min ?? exercise.protocol?.estimated_minutes ?? exercise.protocol?.minutes ?? null;
  const protocol = exercise.protocol;

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <TopBar
        routeName="exercise_detail"
        title={title}
        useSafeArea={false}
        leftControls={{ mode: "back", onBack: () => router.back() }}
        rightAccessory={
          context === "custom" ? (
            <TouchableOpacity onPress={handleAddToPlan} hitSlop={10}>
              <Ionicons name="add-circle-outline" size={26} color="#111" />
            </TouchableOpacity>
          ) : null
        }
      />

      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}>
        {/* Media */}
        <View style={s.mediaWrap}>
          {imgUrl ? (
            <Image source={{ uri: imgUrl }} style={s.mediaImg} resizeMode="cover" />
          ) : (
            <View style={s.mediaPlaceholder}>
              <Ionicons name="barbell-outline" size={48} color="#D1D5DB" />
            </View>
          )}
        </View>

        {/* Title & Meta */}
        <View style={s.section}>
          <Text style={s.title}>{title}</Text>

          {cues ? (
            <Text style={s.cues} numberOfLines={3}>{cues}</Text>
          ) : null}

          <View style={s.metaRow}>
            <View style={s.metaPill}>
              <Ionicons name="fitness-outline" size={14} color="#6B7280" />
              <Text style={s.metaText}>{formatGoal(exercise.goal)}</Text>
            </View>
            <View style={s.metaPill}>
              <Ionicons name="speedometer-outline" size={14} color="#6B7280" />
              <Text style={s.metaText}>{exercise.level}</Text>
            </View>
            {estDuration ? (
              <View style={s.metaPill}>
                <Ionicons name="time-outline" size={14} color="#6B7280" />
                <Text style={s.metaText}>~{estDuration} min</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Exercises Section — protocol displayed as a card */}
        {(() => {
          // In execution mode, prefer sessionItem params
          let eSets = sets;
          let eReps = reps;
          let eSeconds = 0;
          let eRest = restSec;
          if (context === "execution") {
            let si: any = null;
            try { si = params.sessionItem ? JSON.parse(params.sessionItem) : null; } catch {}
            eSets = si?.sets || sets;
            eReps = si?.reps || reps;
            eSeconds = si?.seconds || 0;
            eRest = si?.rest_sec || restSec;
          }
          const hasProtocol = eSets > 0 || eReps > 0 || eSeconds > 0 || eRest > 0 || protocol?.target_grade || protocol?.duration_min;
          if (!hasProtocol) return null;

          const cardTitle = detailName || formatGoal(exercise.goal);

          return (
            <View style={s.section}>
              <Text style={s.sectionTitle}>
                {locale === "zh" ? "训练内容" : "Exercises"}
              </Text>
              <View style={s.exerciseCard}>
                <View style={s.exerciseCardHeader}>
                  <Text style={s.exerciseCardTitle} numberOfLines={2}>{cardTitle}</Text>
                  <Ionicons name="chevron-forward" size={18} color="#D1D5DB" />
                </View>
                <View style={s.exerciseCardDetails}>
                  {eSets > 0 ? (
                    <Text style={s.exerciseCardDetail}>
                      {eSets} {eSets === 1 ? "set" : "sets"}
                      {eReps > 0 ? ` x ${eReps} reps` : ""}
                      {eSeconds > 0 ? ` x ${eSeconds}s` : ""}
                    </Text>
                  ) : null}
                  {eRest > 0 ? (
                    <Text style={s.exerciseCardDetail}>
                      Rest {eRest >= 60 ? `${Math.round(eRest / 60)} min` : `${eRest}s`} per set
                    </Text>
                  ) : null}
                  {protocol?.target_grade ? (
                    <Text style={s.exerciseCardDetail}>
                      Target: {protocol.target_grade}
                    </Text>
                  ) : null}
                  {protocol?.duration_min && !estDuration ? (
                    <Text style={s.exerciseCardDetail}>
                      ~{protocol.duration_min} min
                    </Text>
                  ) : null}
                </View>
              </View>
            </View>
          );
        })()}

        {/* RPE Range */}
        {rpeRange && rpeRange.length === 2 ? (
          <View style={s.section}>
            <View style={s.rpeRow}>
              <Ionicons name="pulse-outline" size={18} color="#F59E0B" />
              <Text style={s.rpeText}>RPE {rpeRange[0]}–{rpeRange[1]}</Text>
            </View>
          </View>
        ) : null}

        {/* Full description */}
        {cues ? (
          <View style={s.section}>
            <Text style={s.sectionTitle}>
              {locale === "zh" ? "详细描述" : "Description"}
            </Text>
            <Text style={s.descText}>{cues}</Text>
          </View>
        ) : null}

        {/* Equipment / Muscles */}
        {exercise.equipment.length > 0 || exercise.muscles.length > 0 ? (
          <View style={s.section}>
            {exercise.equipment.length > 0 ? (
              <View style={{ marginBottom: 12 }}>
                <Text style={s.tagLabel}>{locale === "zh" ? "器械" : "Equipment"}</Text>
                <View style={s.tagRow}>
                  {exercise.equipment.map((eq) => (
                    <View key={eq} style={s.tag}>
                      <Text style={s.tagText}>{eq}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}
            {exercise.muscles.length > 0 ? (
              <View>
                <Text style={s.tagLabel}>{locale === "zh" ? "目标肌群" : "Muscles"}</Text>
                <View style={s.tagRow}>
                  {exercise.muscles.map((m) => (
                    <View key={m} style={s.tag}>
                      <Text style={s.tagText}>{m}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}
          </View>
        ) : null}
      </ScrollView>

      {/* Bottom CTA */}
      <View style={[s.bottomFloat, { paddingBottom: insets.bottom + 12 }]}>
        {context === "custom" ? (
          <TouchableOpacity style={s.mainBtn} onPress={handleAddToPlan} activeOpacity={0.8}>
            <Ionicons name="add-circle-outline" size={20} color="#FFF" />
            <Text style={s.mainBtnText}>
              {locale === "zh" ? "添加到计划" : "Add to Plan"}
            </Text>
          </TouchableOpacity>
        ) : context === "execution" ? (
          <View style={s.executionRow}>
            <TouchableOpacity style={s.favBtn} activeOpacity={0.8}>
              <Ionicons name="heart-outline" size={20} color="#6B7280" />
            </TouchableOpacity>
            <TouchableOpacity style={s.startBtn} onPress={handleStartExercise} activeOpacity={0.8}>
              <Ionicons name="play-circle" size={20} color="#FFF" />
              <Text style={s.startBtnText}>
                {locale === "zh" ? "开始训练" : "Start"}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={[s.mainBtn, s.favoriteBtn]} activeOpacity={0.8}>
            <Ionicons name="heart-outline" size={20} color="#111" />
            <Text style={s.favoriteBtnText}>{locale === "zh" ? "收藏" : "Add to Favorites"}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FAFAFA" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },

  // Media
  mediaWrap: {
    width: "100%",
    height: 220,
    backgroundColor: "#F3F4F6",
  },
  mediaImg: { width: "100%", height: "100%" },
  mediaPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F4F6",
  },

  // Title section
  section: { paddingHorizontal: 20, paddingTop: 16 },
  title: { fontSize: 22, fontWeight: "800", color: "#111", marginBottom: 4 },
  cues: { fontSize: 14, color: "#6B7280", lineHeight: 20, marginBottom: 8 },

  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
  metaPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
  },
  metaText: { fontSize: 12, color: "#6B7280", fontWeight: "500" },

  // Section
  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#111", marginBottom: 12 },

  // Exercise card
  exerciseCard: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  exerciseCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  exerciseCardTitle: { fontSize: 16, fontWeight: "700", color: "#111", flex: 1, marginRight: 8 },
  exerciseCardDetails: { gap: 4 },
  exerciseCardDetail: { fontSize: 14, color: "#6B7280", lineHeight: 20 },

  // RPE
  rpeRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  rpeText: { fontSize: 15, fontWeight: "700", color: "#F59E0B" },

  // Description
  descText: { fontSize: 14, color: "#374151", lineHeight: 22 },

  // Tags
  tagLabel: { fontSize: 13, fontWeight: "600", color: "#6B7280", marginBottom: 6 },
  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: "#F3F4F6",
    borderRadius: 8,
  },
  tagText: { fontSize: 12, color: "#374151" },

  // Bottom CTA
  bottomFloat: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    backgroundColor: "transparent",
    paddingTop: 12,
  },
  mainBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#111",
    height: 54,
    borderRadius: 27,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 6,
  },
  mainBtnText: { color: "#FFF", fontWeight: "700", fontSize: 16 },

  favoriteBtn: {
    backgroundColor: "#F3F4F6",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: -2 },
    elevation: 4,
  },
  favoriteBtnText: { color: "#111", fontWeight: "700", fontSize: 16 },

  // Execution context
  executionRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  favBtn: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  startBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#22C55E",
    height: 54,
    borderRadius: 27,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  startBtnText: { color: "#FFF", fontWeight: "700", fontSize: 16 },

});
