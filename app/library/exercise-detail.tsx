// app/library/exercise-detail.tsx

import React, { useEffect, useLayoutEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { HEADER_TRANSPARENT } from "@/lib/nativeHeaderOptions";
import { Stack, useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { useHeaderHeight } from "@react-navigation/elements";
import { Image } from "expo-image";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
} from "react-native-reanimated";

import { theme } from "../../src/lib/theme";
import { useThemeColors } from "../../src/lib/useThemeColors";
import { useSettings } from "../../src/contexts/SettingsContext";
import { exercisesApi } from "../../src/features/exercises/api";
import type { ExerciseDetail, ProtocolVariant } from "../../src/features/exercises/types";
import { parseExerciseName } from "../../src/lib/exerciseUtils";
import { useFavoriteIds } from "../../src/features/home/exercises/favoritesApi";
import { HeaderButton } from "../../src/components/ui/HeaderButton";
import { GOAL_LABEL, LEVEL_LABEL } from "../../src/features/home/exercises/model/labels";

type ExerciseContext = "custom" | "library" | "execution";

const SCREEN_WIDTH = Dimensions.get("window").width;
const HERO_HEIGHT = SCREEN_WIDTH * 0.55;

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
}, tr: (zh: string, en: string) => string): { protocol: FieldPill[]; rest: FieldPill[]; extras: FieldPill[] } {
  const protocol: FieldPill[] = [];
  if (p.sets && p.sets > 0) protocol.push({ label: tr("组数", "SETS"), value: `${p.sets}`, mono: true });
  if (p.reps && p.reps > 0) protocol.push({ label: tr("次数", "REPS"), value: `${p.reps}`, mono: true });
  if (p.duration && p.duration > 0) protocol.push({ label: tr("时长", "DURATION"), value: formatDuration(p.duration), mono: true });

  const rest: FieldPill[] = [];
  if (p.restPerRep) rest.push({ label: tr("次间休息", "REST/REP"), value: formatDuration(p.restPerRep), mono: true });
  if (p.restPerSet) rest.push({ label: tr("组间休息", "REST/SET"), value: formatDuration(p.restPerSet), mono: true });

  const extras: FieldPill[] = [];
  if (p.target) extras.push({ label: tr("目标", "TARGET"), value: p.target });
  if (p.resistance) extras.push({ label: tr("阻力", "RESISTANCE"), value: p.resistance });
  if (p.format === "benchmark") extras.push({ label: tr("格式", "FORMAT"), value: "benchmark" });

  return { protocol, rest, extras };
}

export default function ExerciseDetailScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const colors = useThemeColors();
  const { lang: locale, tr } = useSettings();
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

  // TR1: selected variant. Defaults to the first variant when an exercise
  // has 2+ variants — `null` means "use base protocol" (single-variant or
  // pure simple action). UI picker only renders when there are 2+.
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);

  // Scroll + parallax
  const scrollY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });
  const heroParallaxStyle = useAnimatedStyle(() => {
    const adjustedScrollY = scrollY.value + headerHeight;
    if (adjustedScrollY >= 0) return {};
    const absScroll = -adjustedScrollY;
    return {
      transform: [
        { scale: 1 + absScroll / HERO_HEIGHT },
        { translateY: adjustedScrollY / 2 },
      ],
    };
  });

  // Native transparent header with scroll edge effect
  useLayoutEffect(() => {
    navigation.setOptions({
      headerTransparent: HEADER_TRANSPARENT,
      headerTitle: "",
      headerLeft: () => <HeaderButton icon="chevron.backward" onPress={() => router.back()} />,
      scrollEdgeEffects: { top: "soft" },
    });
  }, [navigation, router]);

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

        // TR1: pre-select first variant when 2+ variants exist; single or
        // none keeps `null` (base protocol only). Picker UI mirrors this.
        const variants = data.protocol_variants;
        if (variants && variants.length > 1) {
          setSelectedVariantId(variants[0].id);
        } else {
          setSelectedVariantId(null);
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
        // TR1: when a variant is selected, pipe its id forward so the
        // timer + log can resolve `Exercise.protocol_variants[variantId]`
        // for actual sets/reps/rest. Empty string when on base protocol.
        variantId: selectedVariantId ?? "",
        exerciseIndex: params.exerciseIndex ?? "-1",
        sessionItem: params.sessionItem ?? "",
      },
    } as any);
  };

  const handleAddToPlan = () => {
    router.back();
    // TR1: snapshot the variant-resolved values so a plan that includes
    // this exercise pins the load the user picked at add-time. Variant
    // id is also stored so downstream consumers can look up the variant
    // when the underlying Exercise definition evolves.
    const eSets = activeVariant?.sets ?? sets;
    const eReps = activeVariant?.reps ?? reps;
    const eRest = activeVariant?.rest_sec ?? restSec;
    const payload = JSON.stringify({
      action_id: exerciseId,
      variant_id: selectedVariantId ?? undefined,
      sets: eSets || undefined,
      reps: eReps || undefined,
      rest_sec: eRest || undefined,
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

  // Helper components
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

  function VariantPicker({
    variants,
    selected,
    onSelect,
    locale,
  }: {
    variants: ProtocolVariant[];
    selected: string | null;
    onSelect: (id: string) => void;
    locale: "zh" | "en";
  }) {
    // `colors` / `s` closed over from parent scope — same pattern as
    // FieldPillItem / ProtocolCard below.
    return (
      <View style={s.variantRow}>
        {variants.map((v) => {
          const isActive = v.id === selected;
          // Defensive fallback: BE marks label_zh/label_en as required
          // non-empty strings, but harden against empty/whitespace.
          const label =
            (locale === "zh" ? v.label_zh : v.label_en) ||
            v.label_en ||
            v.label_zh ||
            v.id;
          return (
            <TouchableOpacity
              key={v.id}
              onPress={() => onSelect(v.id)}
              style={[
                s.variantPill,
                isActive
                  ? { backgroundColor: colors.cardDark, borderColor: colors.cardDark }
                  : { borderColor: colors.border },
              ]}
              accessibilityRole="button"
              accessibilityLabel={label}
              accessibilityState={{ selected: isActive }}
            >
              <Text style={[
                s.variantPillText,
                { color: isActive ? "#FFF" : colors.textPrimary },
              ]}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  }

  function ProtocolCard({ fields }: { fields: ReturnType<typeof buildProtocolFields> }) {
    return (
      <View style={s.protocolDetails}>
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
        {fields.rest.length > 0 ? (
          <View style={s.fieldRow}>
            {fields.rest.map((f, i) => (
              <FieldPillItem key={i} field={f} />
            ))}
          </View>
        ) : null}
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
      <View style={s.container}>
        <View style={s.center}>
          <ActivityIndicator size="large" color={colors.cardDark} />
        </View>
      </View>
    );
  }

  if (error || !exercise) {
    return (
      <View style={s.container}>
        <View style={s.center}>
          <Text style={{ color: colors.textSecondary, fontSize: 15 }}>
            {error || tr("动作未找到", "Exercise not found")}
          </Text>
          <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 16 }}>
            <Text style={{ color: colors.cardDark, fontWeight: "700" }}>
              {tr("返回", "Go Back")}
            </Text>
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

  // TR1: variant resolution. variants[selected] overrides base protocol
  // fields one-by-one (any field left null on the variant inherits from
  // base). For the compound `subExercises` branch we don't apply variants
  // — sub-exercises have their own per-row params.
  const variants: ProtocolVariant[] = exercise.protocol_variants ?? [];
  const activeVariant: ProtocolVariant | null =
    variants.find((v) => v.id === selectedVariantId) ?? null;
  const showVariantPicker = variants.length > 1;

  const goalLabel = (GOAL_LABEL as any)?.[locale]?.[exercise.goal] ?? exercise.goal;
  const levelLabel = (LEVEL_LABEL as any)?.[locale]?.[exercise.level] ?? exercise.level;

  return (
    <View style={s.container}>
      {context === "custom" && (
        <Stack.Toolbar placement="right">
          <Stack.Toolbar.Button
            icon="plus.circle"
            onPress={handleAddToPlan}
          />
        </Stack.Toolbar>
      )}

      <Animated.ScrollView
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
      >
        {/* Hero Media — extends behind transparent nav bar */}
        <Animated.View style={[heroParallaxStyle, { marginTop: -headerHeight, overflow: "hidden" }]}>
          <View style={[s.heroContainer, { height: HERO_HEIGHT }]}>
            {imgUrl ? (
              <Image
                source={{ uri: imgUrl }}
                style={StyleSheet.absoluteFill}
                contentFit="cover"
                transition={200}
              />
            ) : (
              <View style={s.mediaPlaceholder}>
                <Ionicons name="barbell-outline" size={56} color={colors.textTertiary} />
              </View>
            )}
          </View>
        </Animated.View>

        {/* Title & Meta */}
        <View style={s.section}>
          <Text style={s.title}>{title}</Text>

          {subtitle ? (
            <Text style={s.cuesText} numberOfLines={2}>{subtitle}</Text>
          ) : null}

          <View style={s.metaRow}>
            <View style={s.metaPill}>
              <Ionicons name="fitness-outline" size={14} color={colors.textSecondary} />
              <Text style={s.metaText}>{goalLabel}</Text>
            </View>
            <View style={s.metaPill}>
              <Ionicons name="speedometer-outline" size={14} color={colors.textSecondary} />
              <Text style={s.metaText}>{levelLabel}</Text>
            </View>
            {estDuration ? (
              <View style={s.metaPill}>
                <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
                <Text style={s.metaText}>~{estDuration} min</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Exercises Section */}
        {isCompound ? (
          <View style={s.section}>
            <Text style={s.sectionTitle}>
              {tr("训练内容", "Exercises")}
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
                }, tr)} />
              </View>
            ))}
          </View>
        ) : (() => {
          let eSets = sets;
          let eReps = reps;
          let eRest = restSec;
          let eDuration = repDuration;
          if (context === "execution") {
            let si: any = null;
            try { si = params.sessionItem ? JSON.parse(params.sessionItem) : null; } catch {}
            eSets = si?.sets || sets;
            eReps = si?.reps || reps;
            eRest = si?.rest_sec || restSec;
          }
          // TR1: variant overrides any base / session-item values for the
          // dimensions it declares. null fields fall through to base.
          if (activeVariant) {
            if (activeVariant.sets != null) eSets = activeVariant.sets;
            if (activeVariant.reps != null) eReps = activeVariant.reps;
            if (activeVariant.rest_sec != null) eRest = activeVariant.rest_sec;
            if (activeVariant.seconds != null) eDuration = activeVariant.seconds;
          }
          const hasProtocol = eSets > 0 || eReps > 0 || eRest > 0 || eDuration > 0 || restPerRep > 0 || protocol?.target || protocol?.resistance || protocol?.format || !!activeVariant;
          if (!hasProtocol) return null;

          const cardTitle = detailName || goalLabel;
          // Surface variant load (% or label) and rpe alongside the
          // existing target/resistance extras so the user sees what
          // they're committing to.
          const variantResistance = activeVariant?.load_label
            ?? (activeVariant?.load_pct != null
              ? `${activeVariant.load_pct}%`
              : protocol?.resistance);
          const variantTarget = activeVariant?.rpe != null
            ? tr(`目标 RPE ${activeVariant.rpe}`, `Target RPE ${activeVariant.rpe}`)
            : protocol?.target;

          return (
            <View style={s.section}>
              <Text style={s.sectionTitle}>
                {tr("训练内容", "Exercises")}
              </Text>
              {showVariantPicker ? (
                <VariantPicker
                  variants={variants}
                  selected={selectedVariantId}
                  onSelect={setSelectedVariantId}
                  locale={locale}
                />
              ) : null}
              <View style={s.exerciseCard}>
                <View style={s.exerciseCardHeader}>
                  <Text style={s.exerciseCardTitle} numberOfLines={2}>{cardTitle}</Text>
                  <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
                </View>
                <ProtocolCard fields={buildProtocolFields({
                  sets: eSets,
                  reps: eReps,
                  duration: eDuration,
                  restPerRep,
                  restPerSet: eRest,
                  resistance: variantResistance,
                  target: variantTarget,
                  format: protocol?.format,
                }, tr)} />
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
              {tr("详细描述", "Description")}
            </Text>
            <Text style={s.descText}>{cues}</Text>
          </View>
        ) : null}

        {/* Equipment / Muscles */}
        {exercise.equipment.length > 0 || exercise.muscles.length > 0 ? (
          <View style={s.section}>
            {exercise.equipment.length > 0 ? (
              <View style={{ marginBottom: 12 }}>
                <Text style={s.tagLabel}>{tr("器械", "Equipment")}</Text>
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
                <Text style={s.tagLabel}>{tr("目标肌群", "Muscles")}</Text>
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
      </Animated.ScrollView>
      {/* Bottom CTA */}
      <View style={[s.bottomFloat, { paddingBottom: insets.bottom + 12 }]}>
        {context === "custom" ? (
          <TouchableOpacity style={s.mainBtn} onPress={handleAddToPlan} activeOpacity={0.8}>
            <Ionicons name="add-circle-outline" size={20} color="#FFF" />
            <Text style={s.mainBtnText}>
              {tr("添加到计划", "Add to Plan")}
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
                {tr("开始训练", "Start")}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={[s.mainBtn, isFav ? s.unfavoriteBtn : s.favoriteBtn]} onPress={() => toggleFavorite(exerciseId)} activeOpacity={0.8}>
            <Ionicons name={isFav ? "heart" : "heart-outline"} size={20} color="#FFF" />
            <Text style={s.favoriteBtnText}>
              {isFav
                ? tr("已收藏", "Favorited")
                : tr("收藏", "Add to Favorites")}
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

  // Hero media
  heroContainer: {
    width: "100%",
    backgroundColor: colors.backgroundSecondary,
    overflow: "hidden",
  },
  mediaPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.backgroundSecondary,
  },

  // Title section
  section: { paddingHorizontal: 20, paddingTop: 16 },
  title: { fontSize: 22, fontFamily: theme.fonts.black, color: colors.textPrimary, marginBottom: 4 },
  cuesText: { fontSize: 14, fontFamily: theme.fonts.regular, color: colors.textSecondary, lineHeight: 20, marginBottom: 8 },

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

  // TR1: variant picker — pills above the exercise card so the user
  // toggles intensity (e.g. 40%/60%/80%) before reading the resolved
  // sets/reps. Pill style mirrors the dark-pill action button family.
  variantRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  variantPill: {
    borderWidth: 1,
    borderRadius: theme.borderRadius.pill,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  variantPillText: {
    fontSize: 13,
    fontFamily: theme.fonts.medium,
    fontWeight: "700",
  },

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
