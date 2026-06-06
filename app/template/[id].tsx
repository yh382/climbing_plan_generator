// app/template/[id].tsx — Workout Template detail + Start Training CTA.
//
// TR4 Phase 4. Reachable from:
// - Activity → Training segment → Template list row (TR4b will wire)
// - Future deeplinks (climmate://template/<id>)
//
// Flow: fetch full template → render title + meta + items (phase-grouped) → user taps
// "Start Training" → useActiveWorkoutStore.startFromTemplate(...) →
// router.push("/training/exercise") which reads sessionData from the
// store. Variant resolution + session log of climb_session.template_id
// happen downstream (Phase 4 finalize_session wiring).

import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { HeaderButton } from "../../src/components/ui/HeaderButton";
import {
  HEADER_TRANSPARENT,
  NATIVE_HEADER_BASE,
  withHeaderTheme,
} from "../../src/lib/nativeHeaderOptions";
import { theme } from "../../src/lib/theme";
import { useThemeColors } from "../../src/lib/useThemeColors";
import { useSettings } from "../../src/contexts/SettingsContext";
import { exercisesApi } from "../../src/features/exercises/api";
import { workoutsApi } from "../../src/features/workouts/api";
import type { WorkoutTemplateOut } from "../../src/features/workouts/types";
import useActiveWorkoutStore from "../../src/store/useActiveWorkoutStore";

export default function TemplateDetailScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const { lang: locale, tr } = useSettings();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const params = useLocalSearchParams<{ id: string }>();
  const templateId = params.id ?? "";

  const [template, setTemplate] = useState<WorkoutTemplateOut | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Lazy lookup: action_id → display name. Filled on-demand after template
  // arrives so we don't fan out 20 requests on every render. Missing keys
  // fall back to the action_id (better than blank while loading).
  const [actionNames, setActionNames] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!templateId) return;
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await workoutsApi.get(templateId);
        if (!alive) return;
        setTemplate(data);
      } catch (e: any) {
        if (!alive) return;
        setError(e?.message ?? tr("载入失败", "Failed to load"));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [templateId, tr]);

  // Resolve action_id → human name once template arrives. Each unique
  // action_id is fetched at most once; failures silently keep the raw id
  // as the displayed label.
  useEffect(() => {
    if (!template) return;
    const ids = Array.from(
      new Set(template.items.map((it) => it.action_id)),
    );
    let alive = true;
    Promise.all(
      ids.map(async (id) => {
        try {
          const ex = await exercisesApi.getExerciseDetail(id);
          return [id, locale === "zh" ? ex.name_zh : ex.name_en] as const;
        } catch {
          return [id, id] as const;
        }
      }),
    ).then((entries) => {
      if (!alive) return;
      setActionNames(Object.fromEntries(entries));
    });
    return () => {
      alive = false;
    };
  }, [template, locale]);

  const handleStart = () => {
    if (!template) return;
    // Caller injects templateData per W1 (no cross-store import inside
    // useActiveWorkoutStore). variantSelections is empty for the MVP
    // start flow — the picker UI for per-item variants comes in TR4b
    // template builder; for now whatever variant_id is on each
    // WorkoutItem in the stored template is honored.
    useActiveWorkoutStore
      .getState()
      .startFromTemplate(template.id, template);
    router.push("/training/exercise");
  };

  // House-style transparent header w/ scrollEdge soft fade. NATIVE_HEADER_BASE
  // pulls in default sizing + native back behavior, withHeaderTheme paints
  // the back-chevron tint based on dark/light, HEADER_TRANSPARENT toggles
  // on iOS 26+ liquid glass when available.
  const headerOptions = useMemo(
    () => ({
      ...NATIVE_HEADER_BASE,
      ...withHeaderTheme(colors),
      headerTransparent: HEADER_TRANSPARENT,
      scrollEdgeEffects: { top: "soft" as const },
      title: "",
      headerLeft: () => (
        <HeaderButton icon="chevron.backward" onPress={() => router.back()} />
      ),
    }),
    [colors, router],
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <Stack.Screen options={headerOptions} />
        <ActivityIndicator size="large" color={colors.cardDark} />
      </View>
    );
  }

  if (error || !template) {
    return (
      <View style={[styles.container, styles.center]}>
        <Stack.Screen options={headerOptions} />
        <Text style={{ color: colors.textSecondary }}>
          {error ?? tr("模板未找到", "Template not found")}
        </Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 16 }}>
          <Text style={{ color: colors.cardDark, fontWeight: "700" }}>
            {tr("返回", "Go Back")}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  const shortDesc =
    locale === "zh"
      ? template.short_desc_zh ?? template.short_desc_en
      : template.short_desc_en ?? template.short_desc_zh;

  const totalItems = template.items.length;

  // Group flat items by phase for visual sectioning. Phase order is
  // canonical (warmup → main → cooldown); within a phase we keep the
  // user's authoring order so reorder support later just edits the
  // single flat array.
  const itemsByPhase = template.items.reduce(
    (acc, it) => {
      const phase = it.phase ?? "main";
      (acc[phase] ??= []).push(it);
      return acc;
    },
    {} as Record<string, typeof template.items>,
  );
  const phaseOrder = ["warmup", "main", "cooldown"] as const;

  return (
    <View style={styles.container}>
      <Stack.Screen options={headerOptions} />

      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.scrollContent}
      >
        <Text style={styles.title}>{template.title}</Text>

        <View style={styles.metaRow}>
          {template.est_duration_min ? (
            <MetaPill
              icon="time-outline"
              text={`${template.est_duration_min} min`}
              colors={colors}
            />
          ) : null}
          <MetaPill
            icon="layers-outline"
            // Avoid dynamic i18n keys (translator can't index by numeric
            // interpolation); split number from the unit word.
            text={`${totalItems} ${tr("项", "items")}`}
            colors={colors}
          />
        </View>

        {shortDesc ? <Text style={styles.subtitle}>{shortDesc}</Text> : null}

        {phaseOrder.map((phase) => {
          const phaseItems = itemsByPhase[phase];
          if (!phaseItems || phaseItems.length === 0) return null;
          return (
            <View key={phase} style={styles.section}>
              <Text style={styles.sectionTitle}>{phaseLabel(phase, tr)}</Text>
              {phaseItems.map((item, ii) => (
                <View key={ii} style={styles.itemCard}>
                  <Text style={styles.itemName}>
                    {actionNames[item.action_id] ?? item.action_id}
                  </Text>
                  <Text style={styles.itemMeta}>
                    {formatItemMeta(item, tr)}
                  </Text>
                </View>
              ))}
            </View>
          );
        })}

        <View style={{ height: 96 }} />
      </ScrollView>

      <View style={[styles.bottomBar, styles.bottomBarShadow]}>
        <TouchableOpacity style={styles.startBtn} onPress={handleStart}>
          <Ionicons name="play" size={18} color="#FFF" />
          <Text style={styles.startBtnText}>
            {tr("开始训练", "Start Training")}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Helpers ─────────────────────────────────────────────────────────────

function MetaPill({
  icon,
  text,
  colors,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  text: string;
  colors: ReturnType<typeof useThemeColors>;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        backgroundColor: colors.backgroundSecondary,
        borderRadius: theme.borderRadius.pill,
        paddingHorizontal: 12,
        paddingVertical: 6,
      }}
    >
      <Ionicons name={icon} size={14} color={colors.textSecondary} />
      <Text
        style={{
          color: colors.textSecondary,
          fontFamily: theme.fonts.medium,
          fontSize: 13,
        }}
      >
        {text}
      </Text>
    </View>
  );
}

function formatItemMeta(
  item: WorkoutTemplateOut["items"][number],
  tr: (zh: string, en: string) => string,
): string {
  const parts: string[] = [];
  if (item.sets) parts.push(`${item.sets} ${tr("组", "sets")}`);
  if (item.reps) parts.push(`${item.reps} ${tr("次", "reps")}`);
  if (item.seconds) parts.push(`${item.seconds}s`);
  if (item.rest_sec) parts.push(`${tr("休息", "rest")} ${item.rest_sec}s`);
  return parts.join(" · ");
}

/** Localized label for a workout phase. */
function phaseLabel(
  phase: string,
  tr: (zh: string, en: string) => string,
): string {
  switch (phase) {
    case "warmup":    return tr("热身", "Warm-up");
    case "main":      return tr("主体", "Main");
    case "cooldown":  return tr("放松", "Cooldown");
    default:          return phase;
  }
}

// ── Styles ─────────────────────────────────────────────────────────────

const createStyles = (colors: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    center: { alignItems: "center", justifyContent: "center" },
    scrollContent: { padding: 16, paddingTop: 80 },
    title: {
      fontSize: 28,
      fontFamily: theme.fonts.black,
      color: colors.textPrimary,
      marginBottom: 12,
    },
    metaRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginBottom: 16,
    },
    subtitle: {
      fontSize: 14,
      color: colors.textSecondary,
      fontFamily: theme.fonts.regular,
      marginBottom: 20,
      lineHeight: 20,
    },
    section: { marginBottom: 20 },
    sectionTitle: {
      fontSize: 13,
      letterSpacing: 1.2,
      textTransform: "uppercase",
      color: colors.textTertiary,
      fontFamily: theme.fonts.bold,
      marginBottom: 10,
    },
    itemCard: {
      backgroundColor: colors.backgroundSecondary,
      borderRadius: theme.borderRadius.cardSmall,
      padding: 14,
      marginBottom: 8,
    },
    itemName: {
      fontSize: 15,
      fontFamily: theme.fonts.bold,
      color: colors.textPrimary,
      marginBottom: 4,
    },
    itemMeta: {
      fontSize: 13,
      color: colors.textSecondary,
      fontFamily: theme.fonts.medium,
    },
    bottomBar: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 32,
      backgroundColor: colors.background,
    },
    bottomBarShadow: {
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    startBtn: {
      backgroundColor: colors.cardDark,
      borderRadius: theme.borderRadius.pill,
      paddingHorizontal: 24,
      paddingVertical: 14,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
    },
    startBtnText: {
      color: "#FFF",
      fontFamily: theme.fonts.bold,
      fontWeight: "800",
      fontSize: 16,
    },
  });
