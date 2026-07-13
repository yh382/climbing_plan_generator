// src/features/activity/TrainingSegment.tsx
// Training segment of the Activity tab.
//
// Section order (TR4b-2 redesign):
//   Subtitle → MonthCalendar → SegmentBar → Ribbon
//   → Today card (3 states)
//   → My Templates (horizontal scroll cards — Motra style)
//   → Current Training (active plan, sunk below templates)
//   → Recent Training
//
// The inline "+" in Current Training is gone — entry to "new template"
// and "new plan" lives on the Activity tab's nav header right button now.

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "@/lib/theme";
import { useThemeColors } from "../../lib/useThemeColors";
import { useSettings } from "../../contexts/SettingsContext";
import { TrainingPlanCard } from "../../components/plancard";
import { planDetailToTrainingPlan } from "../plans/adapters";
import { usePlanStore } from "../../store/usePlanStore";
import useActiveWorkoutStore from "../../store/useActiveWorkoutStore";
import MonthCalendar from "./MonthCalendar";
import ActivitySegmentBar from "./ActivitySegmentBar";
import ActivitySubtitle from "./ActivitySubtitle";
import QuickInsightsRibbon from "./QuickInsightsRibbon";
import { useQuickInsights } from "./useQuickInsights";
import { useI18N } from "../../../lib/i18n";
import DailyGroupCard from "../dailysummary/DailyGroupCard";
import { useDailyGroupSummaries } from "../dailysummary/useDailyGroupSummaries";
import useWorkoutTemplateStore from "../workouts/store/useWorkoutTemplateStore";
import { workoutsApi } from "../workouts/api";
import { plansApi } from "../plans/api";
import { formatTagLabel, SUGGESTION_BY_WEEKDAY } from "../workouts/constants";
import type {
  WorkoutTemplateOut,
  WorkoutTemplateSummary,
} from "../workouts/types";

function todayLocalIsoDate(): string {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

export default function TrainingSegment() {
  const router = useRouter();
  const colors = useThemeColors();
  const { tr } = useSettings();
  const { isZH } = useI18N();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const insightCards = useQuickInsights({ isZH, segment: "training" });

  const recentTraining = useDailyGroupSummaries({
    activityType: "train",
    limit: 30,
  });

  const { activePlan: activePlanData, fetchActivePlan } = usePlanStore();
  const {
    isActive: workoutActive,
    isMinimized: workoutMinimized,
    seconds: workoutSeconds,
    sessionJson: workoutSessionJson,
  } = useActiveWorkoutStore();

  const {
    officialList,
    myList,
    fetchOfficial,
    fetchMine,
  } = useWorkoutTemplateStore();

  // Today section state
  const [scheduleByDate, setScheduleByDate] = useState<
    Record<string, string[]>
  >({});
  const [todayTemplate, setTodayTemplate] =
    useState<WorkoutTemplateSummary | null>(null);
  const [startingToday, setStartingToday] = useState(false);

  useFocusEffect(
    useCallback(() => {
      fetchActivePlan();
      fetchMine();
      fetchOfficial();
    }, [fetchActivePlan, fetchMine, fetchOfficial]),
  );

  const activePlan = useMemo(() => {
    if (!activePlanData) return null;
    return planDetailToTrainingPlan(activePlanData);
  }, [activePlanData]);

  // Fetch this month's schedule when activePlan changes.
  useEffect(() => {
    if (!activePlanData?.id) {
      setScheduleByDate({});
      return;
    }
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    let alive = true;
    (async () => {
      try {
        const resp = await plansApi.getSchedule(activePlanData.id, month);
        if (!alive) return;
        setScheduleByDate(resp?.days ?? {});
      } catch {
        if (alive) setScheduleByDate({});
      }
    })();
    return () => {
      alive = false;
    };
  }, [activePlanData?.id]);

  // Resolve today's first planned template id → summary, with a
  // ref-cache so repeated store updates don't refire the fetch.
  const resolvedTodayCacheRef = useRef<
    Map<string, WorkoutTemplateSummary>
  >(new Map());
  const todayPlannedId =
    scheduleByDate[todayLocalIsoDate()]?.[0] ?? null;

  useEffect(() => {
    if (!todayPlannedId) {
      setTodayTemplate(null);
      return;
    }
    const cached = resolvedTodayCacheRef.current.get(todayPlannedId);
    if (cached) {
      setTodayTemplate(cached);
      return;
    }
    const storeState = useWorkoutTemplateStore.getState();
    const lookup =
      storeState.myList.find((t) => t.id === todayPlannedId) ??
      storeState.officialList.find((t) => t.id === todayPlannedId);
    if (lookup) {
      resolvedTodayCacheRef.current.set(todayPlannedId, lookup);
      setTodayTemplate(lookup);
      return;
    }
    let alive = true;
    (async () => {
      try {
        const detail = await workoutsApi.get(todayPlannedId);
        if (!alive) return;
        const summary: WorkoutTemplateSummary = {
          id: detail.id,
          title: detail.title,
          source: detail.source,
          goal_tags: detail.goal_tags,
          equipment: detail.equipment,
          est_duration_min: detail.est_duration_min,
          short_desc_zh: detail.short_desc_zh,
          short_desc_en: detail.short_desc_en,
          cover_image_url: detail.cover_image_url,
          author_name: detail.author_name,
        };
        resolvedTodayCacheRef.current.set(todayPlannedId, summary);
        setTodayTemplate(summary);
      } catch {
        if (alive) setTodayTemplate(null);
      }
    })();
    return () => {
      alive = false;
    };
  }, [todayPlannedId]);

  // Weekday → suggested official template.
  const suggestedTemplate = useMemo<WorkoutTemplateSummary | null>(() => {
    if (officialList.length === 0) return null;
    const weekday = new Date().getDay();
    const goal = SUGGESTION_BY_WEEKDAY[weekday];
    const match = officialList.find((t) => t.goal_tags.includes(goal));
    return match ?? officialList[0];
  }, [officialList]);

  const handleStartTemplate = useCallback(
    async (template: WorkoutTemplateSummary) => {
      if (startingToday) return;
      setStartingToday(true);
      try {
        const detail: WorkoutTemplateOut = await workoutsApi.get(template.id);
        useActiveWorkoutStore.getState().startFromTemplate(detail.id, detail);
        router.push("/training/exercise" as any);
      } catch (e: any) {
        Alert.alert(
          tr("启动失败", "Failed to start"),
          e?.message ?? tr("请稍后再试", "Please try again"),
        );
      } finally {
        setStartingToday(false);
      }
    },
    [router, startingToday, tr],
  );

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ paddingBottom: 140 }}
    >
      <ActivitySubtitle />
      <MonthCalendar />
      <ActivitySegmentBar />

      <QuickInsightsRibbon cards={insightCards} />

      {/* Today — 3-state card */}
      <TodaySection
        styles={styles}
        colors={colors}
        tr={tr}
        locale={isZH ? "zh" : "en"}
        hasActivePlan={!!activePlanData}
        scheduleByDate={scheduleByDate}
        todayTemplate={todayTemplate}
        suggestedTemplate={suggestedTemplate}
        startingToday={startingToday}
        onStart={handleStartTemplate}
      />

      {/* My Templates — horizontal scroll, top 5 + New placeholder card.
          Section header: "My Templates" + "View All" link on the right. */}
      <MyTemplatesSection
        styles={styles}
        colors={colors}
        tr={tr}
        lang={isZH ? "zh" : "en"}
        myList={myList}
        onViewAll={() => router.push("/library/my-templates" as any)}
        onTapTemplate={(id) =>
          router.push({ pathname: "/template/[id]", params: { id } } as any)
        }
        onNew={() => router.push("/library/template-builder" as any)}
      />

      {/* Current Training (sunk below templates per UX redesign).
          Header no longer has an inline + button; entry is the Activity
          tab's nav-header + button. */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>
          {tr("当前训练", "Current Training")}
        </Text>
      </View>

      {activePlan ? (
        <View style={{ paddingHorizontal: 16 }}>
          <TrainingPlanCard
            plan={activePlan}
            variant="active"
            context="personal"
            workoutTimer={
              workoutActive && workoutMinimized
                ? `${String(Math.floor(workoutSeconds / 60)).padStart(2, "0")}:${String(workoutSeconds % 60).padStart(2, "0")}`
                : undefined
            }
            handlers={{
              onPress: () =>
                router.push({
                  pathname: "/library/plan-overview",
                  params: { planId: activePlanData?.id, source: "user" },
                } as any),
              primaryAction: {
                action: { type: "continue", label: tr("查看计划", "View Plan") },
                onAction: () =>
                  router.push({
                    pathname: "/library/plan-overview",
                    params: { planId: activePlanData?.id, source: "user" },
                  } as any),
              },
              onResumeWorkout: workoutSessionJson
                ? () =>
                    router.push({
                      pathname: "/library/plan-view",
                      params: { sessionJson: workoutSessionJson },
                    } as any)
                : undefined,
            }}
            display={{ showSourceBadge: true, showVisibilityBadge: false }}
          />
        </View>
      ) : (
        <View style={styles.emptyHint}>
          <Text style={styles.emptyHintText}>
            {tr(
              "暂无训练计划 — 用上方 + 创建一个",
              "No active plan — tap + above to create one",
            )}
          </Text>
        </View>
      )}

      {/* Recent Training */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>
          {tr("最近训练", "Recent Training")}
        </Text>
      </View>
      {recentTraining.length > 0 ? (
        <View style={{ gap: 0 }}>
          {recentTraining.map((grp) => (
            <DailyGroupCard
              key={grp.date}
              summary={grp}
              displayContext="training"
              onPress={() =>
                router.push({
                  pathname: "/daily-summary",
                  params: { date: grp.date },
                } as any)
              }
            />
          ))}
        </View>
      ) : (
        <View style={styles.emptyHint}>
          <Text style={styles.emptyHintText}>
            {tr("还没有训练记录", "No training sessions yet")}
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────

type TrStyles = ReturnType<typeof createStyles>;
type TrColors = ReturnType<typeof useThemeColors>;
type Tr = (zh: string, en: string) => string;

function templateDescription(
  t: WorkoutTemplateSummary | null,
  locale: "zh" | "en",
): string {
  if (!t) return "";
  const desc =
    locale === "zh"
      ? t.short_desc_zh ?? t.short_desc_en
      : t.short_desc_en ?? t.short_desc_zh;
  return desc ?? "";
}

interface TodaySectionProps {
  styles: TrStyles;
  colors: TrColors;
  tr: Tr;
  locale: "zh" | "en";
  hasActivePlan: boolean;
  scheduleByDate: Record<string, string[]>;
  todayTemplate: WorkoutTemplateSummary | null;
  suggestedTemplate: WorkoutTemplateSummary | null;
  startingToday: boolean;
  onStart: (template: WorkoutTemplateSummary) => void;
}

function TodaySection({
  styles,
  colors,
  tr,
  locale,
  hasActivePlan,
  scheduleByDate,
  todayTemplate,
  suggestedTemplate,
  startingToday,
  onStart,
}: TodaySectionProps) {
  const todayIso = todayLocalIsoDate();
  const plannedIds = scheduleByDate[todayIso];

  // (1) Plan + today has a planned template
  if (hasActivePlan && todayTemplate) {
    return (
      <View style={styles.todayCard}>
        <Text style={styles.todayKicker}>
          {tr("今日训练", "Today's Workout")}
        </Text>
        <Text style={styles.todayTitle} numberOfLines={2}>
          {todayTemplate.title}
        </Text>
        {templateDescription(todayTemplate, locale) ? (
          <Text style={styles.todaySub} numberOfLines={2}>
            {templateDescription(todayTemplate, locale)}
          </Text>
        ) : null}
        <TouchableOpacity
          style={[styles.todayCta, startingToday && { opacity: 0.5 }]}
          onPress={() => onStart(todayTemplate)}
          disabled={startingToday}
          accessibilityRole="button"
          accessibilityState={{ disabled: startingToday }}
          accessibilityLabel={tr("开始训练", "Start Training")}
        >
          {startingToday ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <>
              <Ionicons name="play" size={16} color="#FFF" />
              <Text style={styles.todayCtaText}>
                {tr("开始训练", "Start Training")}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    );
  }

  // (2) Plan + today is rest day
  if (hasActivePlan && plannedIds !== undefined && plannedIds.length === 0) {
    return (
      <View style={styles.todayCard}>
        <Text style={styles.todayKicker}>{tr("今日", "Today")}</Text>
        <Text style={styles.todayTitle}>{tr("🌿 休息日", "🌿 Rest Day")}</Text>
        <Text style={styles.todaySub}>
          {tr(
            "好好恢复，明天再战。",
            "Take it easy and let your body recover.",
          )}
        </Text>
        {suggestedTemplate ? (
          <TouchableOpacity
            style={styles.todayLink}
            onPress={() => onStart(suggestedTemplate)}
            disabled={startingToday}
            accessibilityRole="button"
            accessibilityLabel={tr("照样训练", "Train anyway")}
          >
            <Text style={styles.todayLinkText}>
              {tr("照样训练 →", "Train anyway →")}
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>
    );
  }

  // (3) No active plan → suggested for today
  if (!hasActivePlan && suggestedTemplate) {
    return (
      <View style={styles.todayCard}>
        <Text style={styles.todayKicker}>
          {tr("今日推荐", "Suggested for Today")}
        </Text>
        <Text style={styles.todayTitle} numberOfLines={2}>
          {suggestedTemplate.title}
        </Text>
        {templateDescription(suggestedTemplate, locale) ? (
          <Text style={styles.todaySub} numberOfLines={2}>
            {templateDescription(suggestedTemplate, locale)}
          </Text>
        ) : null}
        <TouchableOpacity
          style={[styles.todayCta, startingToday && { opacity: 0.5 }]}
          onPress={() => onStart(suggestedTemplate)}
          disabled={startingToday}
          accessibilityRole="button"
          accessibilityState={{ disabled: startingToday }}
          accessibilityLabel={tr("开始训练", "Start Training")}
        >
          {startingToday ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <>
              <Ionicons name="play" size={16} color="#FFF" />
              <Text style={styles.todayCtaText}>
                {tr("开始训练", "Start Training")}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    );
  }

  return null;
}

interface MyTemplatesSectionProps {
  styles: TrStyles;
  colors: TrColors;
  tr: Tr;
  lang: "zh" | "en";
  myList: WorkoutTemplateSummary[];
  onViewAll: () => void;
  onTapTemplate: (id: string) => void;
  onNew: () => void;
}

const TEMPLATES_PREVIEW_LIMIT = 5;

function MyTemplatesSection({
  styles,
  colors,
  tr,
  lang,
  myList,
  onViewAll,
  onTapTemplate,
  onNew,
}: MyTemplatesSectionProps) {
  const preview = myList.slice(0, TEMPLATES_PREVIEW_LIMIT);
  const showViewAll = myList.length > TEMPLATES_PREVIEW_LIMIT;
  return (
    <View style={{ marginTop: 4 }}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>
          {tr("我的模板", "My Templates")}
        </Text>
        {showViewAll || myList.length > 0 ? (
          <TouchableOpacity
            onPress={onViewAll}
            accessibilityRole="button"
            accessibilityLabel={tr("查看全部", "View All")}
          >
            <Text style={styles.viewAllLink}>
              {tr("查看全部", "View All")}
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.hScrollContent}
      >
        {preview.map((t) => (
          <TouchableOpacity
            key={t.id}
            style={styles.bigCard}
            onPress={() => onTapTemplate(t.id)}
            accessibilityRole="button"
            accessibilityLabel={t.title}
          >
            {t.cover_image_url ? (
              <Image
                source={{ uri: t.cover_image_url }}
                style={styles.bigCardImg}
              />
            ) : (
              <View
                style={[
                  styles.bigCardImg,
                  styles.bigCardImgFallback,
                ]}
              >
                <Ionicons
                  name="barbell"
                  size={28}
                  color={colors.textSecondary}
                />
              </View>
            )}
            <View style={styles.bigCardBody}>
              <Text style={styles.bigCardTitle} numberOfLines={2}>
                {t.title}
              </Text>
              <View style={styles.bigCardMetaRow}>
                {t.goal_tags[0] ? (
                  <Text style={styles.bigCardMeta} numberOfLines={1}>
                    {formatTagLabel(t.goal_tags[0], lang)}
                  </Text>
                ) : null}
                {t.est_duration_min ? (
                  <View style={styles.bigCardDurationPill}>
                    <Text style={styles.bigCardDurationText}>
                      {t.est_duration_min}m
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>
          </TouchableOpacity>
        ))}

        {/* "+ New" placeholder card — always last, Motra style */}
        <TouchableOpacity
          style={[styles.bigCard, styles.bigCardNew]}
          onPress={onNew}
          accessibilityRole="button"
          accessibilityLabel={tr("新建模板", "New template")}
        >
          <Ionicons name="add" size={28} color={colors.textSecondary} />
          <Text style={styles.bigCardNewText}>
            {tr("新建", "+ New")}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    sectionHeader: {
      paddingHorizontal: 16,
      paddingTop: 14,
      paddingBottom: 10,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    // DL v1 — section headers speak in the micro-label voice.
    sectionTitle: {
      ...theme.textStyles.microLabel,
      color: colors.textSecondary,
    },
    viewAllLink: {
      color: colors.accent,
      fontFamily: theme.fonts.medium,
      fontSize: 13,
    },
    emptyHint: {
      paddingHorizontal: 16,
      paddingVertical: 20,
      alignItems: "center",
    },
    emptyHintText: {
      color: colors.textTertiary,
      fontFamily: theme.fonts.regular,
      fontSize: 14,
      textAlign: "center",
    },

    // Today — today's planned session is an object → white card (DL §2.1).
    todayCard: {
      marginHorizontal: 16,
      marginTop: 4,
      marginBottom: 4,
      backgroundColor: colors.cardBackground,
      borderRadius: theme.borderRadius.card,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      padding: 16,
      ...theme.shadow.card,
    },
    todayKicker: {
      ...theme.textStyles.microLabel,
      color: colors.textTertiary,
      marginBottom: 6,
    },
    todayTitle: {
      fontSize: 17,
      fontFamily: theme.fonts.bold,
      letterSpacing: -0.3,
      color: colors.textPrimary,
    },
    todaySub: {
      marginTop: 6,
      fontSize: 13,
      color: colors.textSecondary,
      fontFamily: theme.fonts.regular,
      lineHeight: 18,
    },
    // The Training view's single primary capsule (DL §2.4).
    todayCta: {
      marginTop: 14,
      alignSelf: "flex-start",
      backgroundColor: colors.pillBackground,
      borderRadius: theme.borderRadius.pill,
      paddingHorizontal: 18,
      paddingVertical: 10,
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    todayCtaText: {
      color: colors.pillText,
      fontFamily: theme.fonts.bold,
      fontSize: 14,
    },
    todayLink: {
      marginTop: 10,
      alignSelf: "flex-start",
    },
    todayLinkText: {
      color: colors.accent,
      fontFamily: theme.fonts.bold,
      fontWeight: "700",
      fontSize: 13,
    },

    // My Templates horizontal scroller
    hScrollContent: {
      paddingHorizontal: 16,
      gap: 12,
    },
    // Template cards are objects → white cards (DL §2.1).
    bigCard: {
      width: 220,
      backgroundColor: colors.cardBackground,
      borderRadius: theme.borderRadius.card,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      overflow: "hidden",
      ...theme.shadow.card,
    },

    bigCardImg: {
      width: "100%",
      height: 160,
    },
    bigCardImgFallback: {
      backgroundColor: colors.cardDarkImage ?? colors.backgroundSecondary,
      alignItems: "center",
      justifyContent: "center",
    },
    bigCardBody: {
      padding: 12,
    },
    bigCardTitle: {
      fontSize: 14,
      fontFamily: theme.fonts.bold,
      color: colors.textPrimary,
    },
    bigCardMetaRow: {
      marginTop: 8,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 8,
    },
    bigCardMeta: {
      flex: 1,
      color: colors.textSecondary,
      fontFamily: theme.fonts.medium,
      fontSize: 12,
    },
    bigCardDurationPill: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 999,
      backgroundColor: colors.background,
    },
    bigCardDurationText: {
      color: colors.textSecondary,
      fontFamily: theme.fonts.medium,
      fontSize: 11,
    },
    bigCardNew: {
      width: 140,
      alignItems: "center",
      justifyContent: "center",
      height: 220,
      borderStyle: "dashed",
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: "transparent",
      gap: 6,
    },
    bigCardNewText: {
      color: colors.textSecondary,
      fontFamily: theme.fonts.bold,
      fontSize: 14,
    },
  });
