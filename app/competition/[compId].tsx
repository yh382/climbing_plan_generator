// P2-F — competition hub (register · self-score · live standings · gallery).
// Reached from the 活动/Programs list (P2-H), the gym page, or a deep link.
// Layout mirrors the Event detail screen: parallax cover → floating organizer
// avatar → title + info rows → standings / gallery. Backed by routers/comp_app.py.
import React, { useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  Pressable,
  ActivityIndicator,
  ViewStyle,
  Alert,
} from "react-native";
import { HEADER_TRANSPARENT } from "@/lib/nativeHeaderOptions";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useNavigation } from "@react-navigation/native";
import { useHeaderHeight } from "@react-navigation/elements";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";

import { HeaderButton } from "@/components/ui/HeaderButton";
import { NativeSegmentedControl } from "@/components/ui/NativeSegmentedControl";
import { HeroCover } from "@/components/shared/HeroCover";
import { theme } from "@/lib/theme";
import { useThemeColors } from "@/lib/useThemeColors";
import { useSettings } from "@/contexts/SettingsContext";
import { useUserStore } from "@/store/useUserStore";
import { useComp, useStandings } from "@/features/community/competitions/hooks";
import { compApi } from "@/features/community/competitions/api";
import CompScoreSheet, {
  type CompScoreSheetHandle,
} from "@/features/community/competitions/CompScoreSheet";
import {
  divisionsOf,
  formatSummary,
} from "@/features/community/competitions/types";

const COVER_H = 260;
const THUMB_SIZE = 52;
const SIDE = 16;

type GalleryItem = { id: string; uri: string; type: "image" | "video" };

// Lightweight info row (mirrors EventDetailScreen InfoRow).
function InfoRow({
  icon,
  children,
  isLast = false,
  colors,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  children: React.ReactNode;
  isLast?: boolean;
  colors: ReturnType<typeof useThemeColors>;
}) {
  return (
    <View
      style={[
        {
          flexDirection: "row",
          alignItems: "center",
          paddingVertical: 13,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        } as ViewStyle,
        isLast && { borderBottomWidth: 0 },
      ]}
    >
      <View style={{ width: 26, alignItems: "center", marginRight: 10 }}>
        <Ionicons name={icon} size={21} color={colors.textSecondary} />
      </View>
      <View style={{ flex: 1 }}>{children}</View>
    </View>
  );
}

export default function CompetitionScreen() {
  const { compId } = useLocalSearchParams<{ compId: string }>();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { tr } = useSettings();
  const router = useRouter();
  const navigation = useNavigation();
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const myId = useUserStore((s) => s.user?.id);
  const scoreSheet = useRef<CompScoreSheetHandle>(null);

  const { comp, loading, refetch } = useComp(compId);
  const active = comp?.status === "active";
  const { standings, refetch: refetchStandings } = useStandings(
    compId,
    active ? 8000 : undefined,
  );

  const [tab, setTab] = useState<"standings" | "gallery">("standings");
  const [division, setDivision] = useState<string | null>(null);
  const [viewDiv, setViewDiv] = useState<string | null>(null);
  const [waiver, setWaiver] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  // gallery: beta videos participants upload while logging on the comp's
  // routes. Backend aggregation endpoint lands next; empty for now.
  const [gallery] = useState<GalleryItem[]>([]);

  // ===== Scroll parallax (hooks before early return) =====
  const scrollY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler((e) => {
    scrollY.value = e.contentOffset.y;
  });
  const coverParallax = useAnimatedStyle(() => {
    const adj = scrollY.value + headerHeight;
    if (adj >= 0) return {};
    const abs = -adj;
    // Clamp the pull-to-zoom so a hard drag can't blow the cover past bounds.
    return { transform: [{ scale: Math.min(1 + abs / COVER_H, 1.4) }, { translateY: adj / 2 }] };
  });

  const dateLabel = useMemo(() => {
    const fmt = (s?: string | null) => (s ? s.slice(0, 10) : null);
    const st = fmt(comp?.start_at);
    const en = fmt(comp?.end_at);
    if (comp?.status === "finished" && en) return `${tr("结束于", "Ended")} ${en}`;
    if (st && en) return `${st} – ${en}`;
    if (en) return `${tr("截止", "Ends")} ${en}`;
    if (st) return `${tr("开始", "From")} ${st}`;
    return null;
  }, [comp, tr]);

  // Header: static (no async title) → back button never relayouts / jitters.
  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: true,
      headerTransparent: HEADER_TRANSPARENT,
      headerTitle: "",
      headerLeft: () => (
        <HeaderButton icon="chevron.backward" onPress={() => router.back()} />
      ),
      scrollEdgeEffects: { top: "soft" },
    });
  }, [navigation, router]);

  if (loading) {
    return (
      <View style={[styles.fill, styles.center]}>
        <ActivityIndicator color={colors.textSecondary} />
      </View>
    );
  }
  if (!comp) {
    return (
      <View style={[styles.fill, styles.center]}>
        <Text style={styles.muted}>{tr("找不到比赛", "Competition not found")}</Text>
      </View>
    );
  }

  const divisions = divisionsOf(comp.config);
  const divOptions = divisions.length ? divisions : [{ id: "open", label: "Open" }];
  const enrolled = comp.my_enrollment;
  const myDiv = enrolled?.division_id ?? null;
  const shownDiv = viewDiv ?? myDiv ?? divOptions[0].id;
  const rows = standings?.divisions?.[shownDiv] ?? [];

  async function register() {
    const div = division ?? divOptions[0].id;
    setBusy("register");
    try {
      await compApi.enroll(comp!.id, div, waiver);
      await refetch();
      await refetchStandings();
    } catch {
      Alert.alert(
        tr("报名失败", "Couldn't register"),
        tr("请检查网络后重试", "Check your connection and try again."),
      );
    } finally {
      setBusy(null);
    }
  }

  const onScored = () => {
    refetch();
    refetchStandings();
  };

  const orgName = comp.organizer?.name ?? tr("主办方", "Organizer");
  const statusText = active
    ? tr("进行中", "Live")
    : comp.status === "finished"
      ? tr("已结束", "Ended")
      : tr("报名中", "Open");

  return (
    <View style={styles.fill}>
      <StatusBar style="light" />
      <Animated.ScrollView
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ paddingBottom: 40 + insets.bottom }}
        showsVerticalScrollIndicator={false}
      >
        {/* ===== Hero: cover (placeholder) + floating organizer avatar ===== */}
        <View style={styles.heroWrap}>
          <Animated.View style={[coverParallax, { marginTop: -headerHeight, overflow: "hidden" }]}>
            <View style={[styles.cover, { height: COVER_H }]}>
              <HeroCover coverUrl={null} />
            </View>
          </Animated.View>

          {/* Reserve layout height below the cover for the floating row. */}
          <View style={styles.organizerSpacer} />

          {/* Floating organizer row — avatar + a two-line column (主办 <org> /
              status pin), both vertically centered on the avatar, straddling the
              cover's resting bottom. */}
          <View style={[styles.organizerRow, { top: COVER_H - THUMB_SIZE / 2 - headerHeight }]}>
            <View style={styles.thumbOuter}>
              {comp.organizer?.logo_url ? (
                <Image source={{ uri: comp.organizer.logo_url }} style={styles.thumbImg} resizeMode="cover" />
              ) : (
                <View style={[styles.thumbImg, styles.thumbPlaceholder]}>
                  <Text style={styles.thumbInitial}>{orgName.slice(0, 1).toUpperCase()}</Text>
                </View>
              )}
            </View>
            <View style={styles.organizerCol}>
              <Text style={styles.organizerLine} numberOfLines={1}>
                <Text style={styles.organizerPrefix}>{tr("主办 ", "Hosted by ")}</Text>
                {orgName}
              </Text>
              <View style={styles.organizerChips}>
                <View style={styles.coverChip}>
                  <View style={[styles.statusDot, { backgroundColor: active ? "#22A06B" : "rgba(255,255,255,0.55)" }]} />
                  <Text style={styles.coverChipText}>{statusText}</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* ===== Main content ===== */}
        <View style={styles.mainBlock}>
          <Text style={styles.title}>{comp.title}</Text>

          {/* Info rows */}
          <View style={styles.infoList}>
            <InfoRow icon="podium-outline" colors={colors}>
              <Text style={styles.infoValue}>{formatSummary(comp.config)}</Text>
              <Text style={styles.infoSub}>{comp.problem_count} {tr("条线", "problems")}</Text>
            </InfoRow>
            {dateLabel ? (
              <InfoRow icon="calendar-clear-outline" colors={colors} isLast={!comp.description}>
                <Text style={styles.infoValue}>{dateLabel}</Text>
              </InfoRow>
            ) : null}
            {comp.description ? (
              <InfoRow icon="information-circle-outline" colors={colors} isLast>
                <Text style={styles.infoValue}>{comp.description}</Text>
              </InfoRow>
            ) : null}
          </View>

          {/* Register (not enrolled) or My standing (enrolled) */}
          {!enrolled ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{tr("报名", "Register")}</Text>
              {divOptions.length > 1 ? (
                <>
                  <Text style={styles.label}>{tr("选择组别", "Division")}</Text>
                  <View style={styles.chips}>
                    {divOptions.map((d) => {
                      const sel = (division ?? divOptions[0].id) === d.id;
                      return (
                        <Pressable
                          key={d.id}
                          style={[styles.chip, sel && styles.chipOn]}
                          onPress={() => setDivision(d.id)}
                        >
                          <Text style={[styles.chipText, sel && styles.chipTextOn]}>{d.label}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </>
              ) : null}
              <Pressable style={styles.waiverRow} onPress={() => setWaiver((w) => !w)}>
                <Ionicons
                  name={waiver ? "checkbox" : "square-outline"}
                  size={20}
                  color={waiver ? colors.accent : colors.textTertiary}
                />
                <Text style={styles.waiverText}>
                  {tr("我已阅读并同意赛事免责声明", "I've read & agree to the waiver")}
                </Text>
              </Pressable>
              <Pressable
                style={[styles.cta, !waiver && styles.ctaDisabled]}
                disabled={!waiver || busy === "register"}
                onPress={register}
              >
                {busy === "register" ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.ctaText}>{tr("报名", "Register")}</Text>
                )}
              </Pressable>
            </View>
          ) : active ? (
            <Pressable style={styles.scoreCta} onPress={() => scoreSheet.current?.present()}>
              <Ionicons name="create-outline" size={18} color="#FFFFFF" />
              <Text style={styles.scoreCtaText}>{tr("记录成绩", "Log my scores")}</Text>
            </Pressable>
          ) : null}

          {/* ===== Standings / Gallery ===== */}
          <NativeSegmentedControl
            options={[tr("排行榜", "Standings"), tr("视频集", "Gallery")]}
            selectedIndex={tab === "standings" ? 0 : 1}
            onSelect={(i) => setTab(i === 0 ? "standings" : "gallery")}
            style={styles.segNative}
          />

          {tab === "standings" ? (
            <View style={styles.sectionCard}>
              {divOptions.length > 1 ? (
                <View style={[styles.chips, { marginBottom: 8 }]}>
                  {divOptions.map((d) => {
                    const sel = shownDiv === d.id;
                    return (
                      <Pressable
                        key={d.id}
                        style={[styles.chipSm, sel && styles.chipOn]}
                        onPress={() => setViewDiv(d.id)}
                      >
                        <Text style={[styles.chipText, sel && styles.chipTextOn]}>{d.label}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              ) : null}
              {rows.length === 0 ? (
                <Text style={[styles.muted, { padding: 8 }]}>{tr("暂无排名", "No standings yet")}</Text>
              ) : (
                rows.map((r, i) => (
                  <View
                    key={r.user_id}
                    style={[
                      styles.lbRow,
                      i === rows.length - 1 && { borderBottomWidth: 0 },
                      r.user_id === myId && styles.lbRowMe,
                    ]}
                  >
                    <Text style={styles.lbRank}>{r.rank}</Text>
                    <View style={styles.lbAvatar}>
                      <Ionicons name="person" size={15} color={colors.textTertiary} />
                    </View>
                    <Text style={styles.lbName} numberOfLines={1}>
                      {r.display_name || tr("攀岩者", "Climber")}
                    </Text>
                    <View style={styles.lbRight}>
                      <Text style={styles.lbPts}>{r.score}</Text>
                      <Text style={styles.lbPtsL}>{tr("分", "pts")}</Text>
                    </View>
                  </View>
                ))
              )}
            </View>
          ) : (
            <View style={styles.sectionCard}>
              {gallery.length === 0 ? (
                <View style={styles.galleryEmpty}>
                  <Ionicons name="videocam-outline" size={26} color={colors.textTertiary} />
                  <Text style={styles.galleryEmptyText}>
                    {tr(
                      "参赛者在赛道 log 时上传的 beta 视频会出现在这里",
                      "Beta videos participants upload while logging comp routes show up here",
                    )}
                  </Text>
                </View>
              ) : (
                <View style={styles.galleryGrid}>
                  {gallery.map((g) => (
                    <Pressable key={g.id} style={styles.galleryCell}>
                      <Image source={{ uri: g.uri }} style={styles.galleryImg} />
                      {g.type === "video" ? (
                        <View style={styles.videoBadge}>
                          <Ionicons name="play" size={11} color="#111" />
                        </View>
                      ) : null}
                    </Pressable>
                  ))}
                </View>
              )}
            </View>
          )}
        </View>
      </Animated.ScrollView>

      {enrolled ? <CompScoreSheet ref={scoreSheet} comp={comp} onScored={onScored} /> : null}
    </View>
  );
}

const createStyles = (colors: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    fill: { flex: 1, backgroundColor: colors.background },
    center: { alignItems: "center", justifyContent: "center" },
    muted: { fontFamily: theme.fonts.regular, fontSize: 13, color: colors.textSecondary },

    // Hero
    heroWrap: { position: "relative" },
    cover: { width: "100%", backgroundColor: "#0B1220" },
    // Status pill — a solid dark badge sitting on the page bg (second line of
    // the organizer column), so a self-sized dark pill, not a translucent
    // over-cover overlay.
    coverChip: {
      alignSelf: "flex-start",
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      backgroundColor: colors.cardDark,
      paddingHorizontal: 9,
      paddingVertical: 4,
      borderRadius: 11,
    },
    statusDot: { width: 6, height: 6, borderRadius: 3 },
    coverChipText: { fontFamily: theme.fonts.bold, fontSize: 11, color: "#FFFFFF" },

    // Spacer reserving room below the cover for the floating organizer row.
    organizerSpacer: { height: THUMB_SIZE / 2 + 16, backgroundColor: colors.background },
    // Floating organizer row: avatar + (主办 / status pill) column, centered so
    // the two lines' combined height aligns with the avatar.
    organizerRow: {
      position: "absolute",
      left: SIDE,
      right: SIDE,
      zIndex: 50,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    organizerCol: { flex: 1, justifyContent: "center", gap: 5 },
    organizerLine: { fontSize: 14, fontFamily: theme.fonts.bold, color: colors.textPrimary },
    organizerPrefix: { fontFamily: theme.fonts.regular, color: colors.textSecondary },
    organizerChips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },

    thumbOuter: {
      width: THUMB_SIZE,
      height: THUMB_SIZE,
      borderRadius: 15,
      backgroundColor: colors.cardBackground,
      justifyContent: "center",
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    thumbImg: { width: THUMB_SIZE - 5, height: THUMB_SIZE - 5, borderRadius: 12 },
    thumbPlaceholder: { backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" },
    thumbInitial: { fontFamily: theme.fonts.black, fontSize: 18, color: "#FFFFFF" },

    // Main
    mainBlock: { paddingHorizontal: SIDE, paddingBottom: 8 },
    title: {
      fontSize: 32,
      fontFamily: theme.fonts.black,
      color: colors.textPrimary,
      letterSpacing: -0.6,
      lineHeight: 37,
      marginTop: -6,
      marginBottom: 10,
    },

    infoList: { marginBottom: 16 },
    infoValue: { fontSize: 14, fontFamily: theme.fonts.medium, color: colors.textPrimary, lineHeight: 20 },
    infoSub: { fontSize: 13, fontFamily: theme.fonts.regular, color: colors.textSecondary, marginTop: 2 },

    // Register card
    card: {
      backgroundColor: colors.cardBackground,
      borderRadius: theme.borderRadius.card,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      padding: 16,
      marginBottom: 16,
    },
    cardTitle: { fontFamily: theme.fonts.black, fontSize: 16, color: colors.textPrimary, marginBottom: 10 },
    label: { fontFamily: theme.fonts.bold, fontSize: 12, color: colors.textSecondary, marginBottom: 8 },
    chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    chip: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: colors.backgroundSecondary,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    chipSm: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
      backgroundColor: colors.backgroundSecondary,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    chipOn: { backgroundColor: colors.pillBackground, borderColor: colors.pillBackground },
    chipText: { fontFamily: theme.fonts.bold, fontSize: 13, color: colors.textSecondary },
    chipTextOn: { color: colors.pillText },
    waiverRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 14 },
    waiverText: { fontFamily: theme.fonts.regular, fontSize: 13, color: colors.textPrimary, flex: 1 },
    cta: { backgroundColor: colors.accent, borderRadius: 14, paddingVertical: 13, alignItems: "center", marginTop: 16 },
    ctaDisabled: { opacity: 0.4 },
    ctaText: { fontFamily: theme.fonts.bold, fontSize: 15, color: "#FFFFFF" },

    // My-rank dark card + score CTA
    scoreCta: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      backgroundColor: colors.accent,
      borderRadius: 14,
      paddingVertical: 13,
      marginBottom: 16,
    },
    scoreCtaText: { fontFamily: theme.fonts.bold, fontSize: 15, color: "#FFFFFF" },

    // Segmented tabs
    segNative: { marginBottom: 12 },

    // Section card (leaderboard / gallery)
    sectionCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: theme.borderRadius.card,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      padding: 14,
    },

    // Leaderboard rows
    lbRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      gap: 12,
    },
    lbRowMe: { backgroundColor: "rgba(48,110,111,0.08)", marginHorizontal: -14, paddingHorizontal: 14, borderRadius: 10 },
    lbRank: { width: 24, textAlign: "center", fontFamily: theme.fonts.black, fontSize: 15, color: colors.textPrimary },
    lbAvatar: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: colors.backgroundSecondary,
      alignItems: "center",
      justifyContent: "center",
    },
    lbName: { flex: 1, fontFamily: theme.fonts.bold, fontSize: 14, color: colors.textPrimary },
    lbRight: { alignItems: "flex-end" },
    lbPts: { fontFamily: theme.fonts.black, fontSize: 16, color: colors.textPrimary },
    lbPtsL: { fontFamily: theme.fonts.regular, fontSize: 11, color: colors.textSecondary, marginTop: 1 },

    // Gallery
    galleryEmpty: { alignItems: "center", paddingVertical: 28, paddingHorizontal: 24, gap: 10 },
    galleryEmptyText: { fontFamily: theme.fonts.regular, fontSize: 13, color: colors.textSecondary, textAlign: "center", lineHeight: 19 },
    galleryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    galleryCell: { width: "31.5%", aspectRatio: 1, borderRadius: 12, overflow: "hidden", backgroundColor: colors.backgroundSecondary },
    galleryImg: { width: "100%", height: "100%" },
    videoBadge: {
      position: "absolute",
      left: 6,
      bottom: 6,
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: "rgba(255,255,255,0.8)",
      alignItems: "center",
      justifyContent: "center",
    },
  });
