// app/library/exercise-detail.tsx

import React, { useEffect, useMemo, useState } from "react";
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
import { theme } from "../../src/lib/theme";
import { useThemeColors } from "../../src/lib/useThemeColors";
import { exercisesApi } from "../../src/features/exercises/api";
import type { ExerciseDetail } from "../../src/features/exercises/types";
import { parseExerciseName } from "../../src/lib/exerciseUtils";
import { useFavoriteIds } from "../../src/features/home/exercises/favoritesApi";

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

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const ss = sec % 60;
  return `${String(m).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
}

interface SubExercise {
  name: { zh?: string; en: string };
  sets: number;
  reps_per_set?: number;
  rep_duration_sec?: number;
  rest_between_reps_sec?: number;
  rest_between_sets_sec?: number;
  resistance?: string;
  target?: string;
}

interface FieldPill {
  label: string;
  value: string;
  mono?: boolean;
}

function buildProtocolFields(p: {
  sets?: number;
  reps?: number;
  duration?: number;
  restPerRep?: number;
  restPerSet?: number;
  resistance?: string;
  target?: string;
  format?: string;
}): { protocol: FieldPill[]; rest: FieldPill[]; extras: FieldPill[] } {
  const protocol: FieldPill[] = [];
  if (p.sets && p.sets > 0) protocol.push({ label: "Sets", value: `${p.sets}`, mono: true });
  if (p.reps && p.reps > 0) protocol.push({ label: "Reps", value: `${p.reps}`, mono: true });
  if (p.duration && p.duration > 0) protocol.push({ label: "Duration", value: formatDuration(p.duration), mono: true });

  const rest: FieldPill[] = [];
  if (p.restPerRep) rest.push({ label: "Rest/rep", value: formatDuration(p.restPerRep), mono: true });
  if (p.restPerSet) rest.push({ label: "Rest/set", value: formatDuration(p.restPerSet), mono: true });

  const extras: FieldPill[] = [];
  if (p.target) extras.push({ label: "Target", value: p.target });
  if (p.resistance) extras.push({ label: "Resistance", value: p.resistance });
  if (p.format === "benchmark") extras.push({ label: "Format", value: "benchmark" });

  return { protocol, rest, extras };
}

export default function ExerciseDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const locale = useMemo(() => detectLocale(), []);
  const colors = useThemeColors();
  const s = useMemo(() => createStyles(colors), [colors]);

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
  const { isFavorite, toggle: toggleFavorite } = useFavoriteIds();
  const isFav = exerciseId ? isFavorite(exerciseId) : false;

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
          setSets(p.sets ?? 0);
          setReps(p.reps_per_set ?? p.reps ?? 0);
          setRestSec(p.rest_between_sets_sec ?? 0);
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

  // Helper components moved inside for closure access to `s` and `colors`
  function FieldPillItem({ field }: { field: FieldPill }) {
    return (
      <View style={s.fieldItem}>
        <Text style={s.fieldLabel}>{field.label}</Text>
        <View style={s.fieldPill}>
          <Text style={[s.fieldValue, !field.mono && s.fieldValueText]}>{field.value}</Text>
        </View>
      </View>
    );
  }

  function ProtocolCard({ fields }: { fields: ReturnType<typeof buildProtocolFields> }) {
    return (
      <View style={s.protocolDetails}>
        {/* Row 1: protocol pills connected with x */}
        {fields.protocol.length > 0 ? (
          <View style={s.fieldRow}>
            {fields.protocol.map((f, i) => (
              <React.Fragment key={i}>
                {i > 0 ? <Text style={s.fieldSeparator}>{"\u00D7"}</Text> : null}
                <FieldPillItem field={f} />
              </React.Fragment>
            ))}
          </View>
        ) : null}
        {/* Row 2: rest pills */}
        {fields.rest.length > 0 ? (
          <View style={s.fieldRow}>
            {fields.rest.map((f, i) => (
              <FieldPillItem key={i} field={f} />
            ))}
          </View>
        ) : null}
        {/* Row 3: extras */}
        {fields.extras.length > 0 ? (
          <View style={s.fieldRow}>
            {fields.extras.map((f, i) => (
              <FieldPillItem key={i} field={f} />
            ))}
          </View>
        ) : null}
      </View>
    );
  }

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
          <ActivityIndicator size="large" color={colors.cardDark} />
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
          <Text style={{ color: colors.textSecondary, fontSize: 15 }}>{error || "Exercise not found"}</Text>
          <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 16 }}>
            <Text style={{ color: colors.cardDark, fontWeight: "700" }}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const rawTitle = locale === "zh" ? exercise.name_zh : exercise.name_en;
  const { shortName: title, detailName } = parseExerciseName(rawTitle);
  const cues = locale === "zh" ? exercise.cues_zh : exercise.cues_en;
  const cuesSummary = cues?.split(/[.。！!？?]/)[0]?.trim() || "";
  const shortDesc = locale === "zh"
    ? (exercise.short_desc_zh || exercise.short_desc_en)
    : exercise.short_desc_en;
  const subtitle = shortDesc || (cuesSummary.length > 0 && cuesSummary !== cues?.trim() ? cuesSummary : null);
  const imgUrl = getMediaUrl(exercise.media);
  const rpeRange = exercise.rpe_range;
  const estDuration = exercise.duration_min ?? exercise.protocol?.estimated_minutes ?? exercise.protocol?.minutes ?? null;
  const protocol = exercise.protocol;
  const repDuration = protocol?.rep_duration_sec ?? 0;
  const restPerRep = protocol?.rest_between_reps_sec ?? 0;
  const subExercises = protocol?.sub_exercises as SubExercise[] | undefined;
  const isCompound = subExercises && subExercises.length > 0;

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
              <Ionicons name="barbell-outline" size={48} color={colors.textTertiary} />
            </View>
          )}
        </View>

        {/* Title & Meta */}
        <View style={s.section}>
          <Text style={s.title}>{title}</Text>

          {subtitle ? (
            <Text style={s.cues} numberOfLines={2}>{subtitle}</Text>
          ) : null}

          <View style={s.metaRow}>
            <View style={s.metaPill}>
              <Ionicons name="fitness-outline" size={14} color={colors.textSecondary} />
              <Text style={s.metaText}>{formatGoal(exercise.goal)}</Text>
            </View>
            <View style={s.metaPill}>
              <Ionicons name="speedometer-outline" size={14} color={colors.textSecondary} />
              <Text style={s.metaText}>{exercise.level}</Text>
            </View>
            {estDuration ? (
              <View style={s.metaPill}>
                <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
                <Text style={s.metaText}>~{estDuration} min</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Exercises Section -- compound or standard protocol card */}
        {isCompound ? (
          <View style={s.section}>
            <Text style={s.sectionTitle}>
              {locale === "zh" ? "训练内容" : "Exercises"}
            </Text>
            {subExercises.map((sub, idx) => (
              <View key={idx} style={[s.exerciseCard, { marginBottom: 10 }]}>
                <View style={s.exerciseCardHeader}>
                  <Text style={s.exerciseCardTitle}>{sub.name?.[locale] || sub.name?.en}</Text>
                  <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
                </View>
                <ProtocolCard fields={buildProtocolFields({
                  sets: sub.sets,
                  reps: sub.reps_per_set,
                  duration: sub.rep_duration_sec,
                  restPerRep: sub.rest_between_reps_sec,
                  restPerSet: sub.rest_between_sets_sec,
                  resistance: sub.resistance,
                  target: sub.target,
                })} />
              </View>
            ))}
          </View>
        ) : (() => {
          // Standard single-card protocol display
          let eSets = sets;
          let eReps = reps;
          let eRest = restSec;
          if (context === "execution") {
            let si: any = null;
            try { si = params.sessionItem ? JSON.parse(params.sessionItem) : null; } catch {}
            eSets = si?.sets || sets;
            eReps = si?.reps || reps;
            eRest = si?.rest_sec || restSec;
          }
          const hasProtocol = eSets > 0 || eReps > 0 || eRest > 0 || repDuration > 0 || restPerRep > 0 || protocol?.target || protocol?.resistance || protocol?.format;
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
                  <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
                </View>
                <ProtocolCard fields={buildProtocolFields({
                  sets: eSets,
                  reps: eReps,
                  duration: repDuration,
                  restPerRep,
                  restPerSet: eRest,
                  resistance: protocol?.resistance,
                  target: protocol?.target,
                  format: protocol?.format,
                })} />
              </View>
            </View>
          );
        })()}

        {/* RPE Range */}
        {rpeRange && rpeRange.length === 2 ? (
          <View style={s.section}>
            <View style={s.rpeRow}>
              <Ionicons name="pulse-outline" size={18} color={colors.textSecondary} />
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
            <TouchableOpacity style={s.favBtn} onPress={() => toggleFavorite(exerciseId)} activeOpacity={0.8}>
              <Ionicons name={isFav ? "heart" : "heart-outline"} size={20} color={isFav ? colors.accent : colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity style={s.startBtn} onPress={handleStartExercise} activeOpacity={0.8}>
              <Ionicons name="play-circle" size={20} color="#FFF" />
              <Text style={s.startBtnText}>
                {locale === "zh" ? "开始训练" : "Start"}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={[s.mainBtn, isFav ? s.unfavoriteBtn : s.favoriteBtn]} onPress={() => toggleFavorite(exerciseId)} activeOpacity={0.8}>
            <Ionicons name={isFav ? "heart" : "heart-outline"} size={20} color="#FFF" />
            <Text style={s.favoriteBtnText}>
              {isFav
                ? (locale === "zh" ? "已收藏" : "Favorited")
                : (locale === "zh" ? "收藏" : "Add to Favorites")}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const createStyles = (colors: ReturnType<typeof useThemeColors>) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },

  // Media
  mediaWrap: {
    width: "100%",
    height: 220,
    backgroundColor: colors.backgroundSecondary,
  },
  mediaImg: { width: "100%", height: "100%" },
  mediaPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.backgroundSecondary,
  },

  // Title section
  section: { paddingHorizontal: 20, paddingTop: 16 },
  title: { fontSize: 22, fontFamily: theme.fonts.black, color: colors.textPrimary, marginBottom: 4 },
  cues: { fontSize: 14, fontFamily: theme.fonts.regular, color: colors.textSecondary, lineHeight: 20, marginBottom: 8 },

  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
  metaPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: theme.borderRadius.cardSmall,
    backgroundColor: colors.backgroundSecondary,
  },
  metaText: { fontSize: 12, fontFamily: theme.fonts.medium, color: colors.textSecondary },

  // Section
  sectionTitle: { fontSize: 16, fontFamily: theme.fonts.bold, color: colors.textPrimary, marginBottom: 12 },

  // Exercise card
  exerciseCard: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: theme.borderRadius.card,
    padding: 16,
  },
  exerciseCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  exerciseCardTitle: { fontSize: 16, fontFamily: theme.fonts.bold, color: colors.textPrimary, flex: 1, marginRight: 8 },

  // Protocol details
  protocolDetails: { gap: 10 },
  fieldRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "flex-end", gap: 10 },
  fieldItem: {},
  fieldLabel: {
    fontSize: 11,
    fontFamily: theme.fonts.medium,
    color: colors.textTertiary,
    marginBottom: 3,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  fieldPill: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  fieldValue: {
    fontSize: 13,
    fontFamily: theme.fonts.monoMedium,
    color: colors.textPrimary,
  },
  fieldValueText: {
    fontFamily: theme.fonts.medium,
  },
  fieldSeparator: {
    fontSize: 14,
    fontFamily: theme.fonts.medium,
    color: colors.textTertiary,
    marginBottom: 4,
  },

  // RPE
  rpeRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  rpeText: { fontSize: 15, fontFamily: theme.fonts.monoMedium, color: colors.textSecondary },

  // Description
  descText: { fontSize: 14, fontFamily: theme.fonts.regular, color: colors.textPrimary, lineHeight: 22 },

  // Tags
  tagLabel: { fontSize: 13, fontFamily: theme.fonts.medium, color: colors.textSecondary, marginBottom: 6 },
  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: theme.borderRadius.pill,
  },
  tagText: { fontSize: 12, fontFamily: theme.fonts.medium, color: colors.textSecondary },

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
    backgroundColor: colors.cardDark,
    height: 54,
    borderRadius: theme.borderRadius.pill,
  },
  mainBtnText: { color: "#FFF", fontFamily: theme.fonts.bold, fontSize: 16 },

  favoriteBtn: {
    backgroundColor: colors.cardDark,
    borderWidth: 0,
    borderColor: "transparent",
  },
  unfavoriteBtn: {
    backgroundColor: colors.accent,
    borderWidth: 0,
    borderColor: "transparent",
  },
  favoriteBtnText: { color: "#FFF", fontFamily: theme.fonts.bold, fontSize: 16 },

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
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  startBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.cardDark,
    height: 54,
    borderRadius: theme.borderRadius.pill,
  },
  startBtnText: { color: "#FFF", fontFamily: theme.fonts.bold, fontSize: 16 },

});
