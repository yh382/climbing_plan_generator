// P2-F — competition hub (register · self-score · live standings). Reached from
// the gym Dashboard / feed (P2-H) or a deep link. Backed by routers/comp_app.py.
import React, { useLayoutEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useNavigation } from "@react-navigation/native";
import { theme } from "@/lib/theme";
import { useThemeColors } from "@/lib/useThemeColors";
import {
  NATIVE_HEADER_BASE,
  withHeaderTheme,
  HEADER_TRANSPARENT,
} from "@/lib/nativeHeaderOptions";
import { useSettings } from "@/contexts/SettingsContext";
import { useUserStore } from "@/store/useUserStore";
import { useComp, useStandings } from "@/features/community/competitions/hooks";
import { compApi } from "@/features/community/competitions/api";
import {
  divisionsOf,
  divisionLabel,
  formatSummary,
  type CompProblem,
} from "@/features/community/competitions/types";

export default function CompetitionScreen() {
  const { compId } = useLocalSearchParams<{ compId: string }>();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { tr } = useSettings();
  const router = useRouter();
  const navigation = useNavigation();
  const myId = useUserStore((s) => s.user?.id);

  const { comp, loading, refetch } = useComp(compId);
  const active = comp?.status === "active";
  const { standings, refetch: refetchStandings } = useStandings(
    compId,
    active ? 8000 : undefined,
  );

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

  useLayoutEffect(() => {
    navigation.setOptions({
      ...NATIVE_HEADER_BASE,
      ...withHeaderTheme(colors),
      headerShown: true,
      headerTransparent: HEADER_TRANSPARENT,
      scrollEdgeEffects: { top: "soft" },
      title: comp?.title ?? tr("比赛", "Competition"),
    });
  }, [navigation, colors, comp?.title, tr]);

  const [tab, setTab] = useState<"problems" | "standings">("problems");
  const [division, setDivision] = useState<string | null>(null);
  const [waiver, setWaiver] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

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
  const myDiv = enrolled?.division_id;
  const myRows = standings?.divisions?.[myDiv ?? ""] ?? [];
  const myRow = myRows.find((r) => r.user_id === myId);

  const scMap = new Map(comp.my_scorecards.map((s) => [s.comp_problem_id, s]));

  async function register() {
    const div = division ?? divOptions[0].id;
    setBusy("register");
    try {
      await compApi.enroll(comp!.id, div, waiver);
      await refetch();
      await refetchStandings();
    } finally {
      setBusy(null);
    }
  }

  async function score(p: CompProblem, top: boolean) {
    setBusy(p.id);
    try {
      await compApi.selfScore(comp!.id, {
        comp_problem_id: p.id,
        top,
        zone: true, // both Zone and Top send zone=true (Top ⊇ Zone)
      });
      await refetch();
      await refetchStandings();
    } finally {
      setBusy(null);
    }
  }

  return (
    <ScrollView style={styles.fill} contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: 16 }}>

      {/* Status banner */}
      <View style={styles.statusRow}>
        <View style={[styles.statusDot, { backgroundColor: active ? "#22A06B" : colors.textTertiary }]} />
        <Text style={styles.statusText}>
          {active ? tr("进行中", "Live") : comp.status === "finished" ? tr("已结束", "Ended") : tr("报名中", "Open")}
        </Text>
        <Text style={styles.muted}>· {comp.problem_count} {tr("条线", "problems")}</Text>
      </View>

      {/* Info — organizer / title / dates / format / description */}
      <View style={styles.card}>
        <View style={styles.orgRow}>
          {comp.organizer?.logo_url ? (
            <Image source={{ uri: comp.organizer.logo_url }} style={styles.orgLogo} />
          ) : (
            <View style={[styles.orgLogo, styles.orgLogoPlaceholder]}>
              <Text style={styles.orgLogoText}>
                {(comp.organizer?.name ?? "?").slice(0, 1).toUpperCase()}
              </Text>
            </View>
          )}
          <Text style={styles.orgName} numberOfLines={1}>
            {comp.organizer?.name ?? tr("主办方", "Organizer")}
          </Text>
        </View>
        <View style={styles.metaChips}>
          <View style={styles.chipTeal}>
            <Text style={styles.chipTealText}>{formatSummary(comp.config)}</Text>
          </View>
          {dateLabel ? (
            <Text style={styles.metaText}>
              <Ionicons name="calendar-outline" size={12} /> {dateLabel}
            </Text>
          ) : null}
        </View>
        {comp.description ? <Text style={styles.desc}>{comp.description}</Text> : null}
      </View>

      {!enrolled ? (
        /* ── Register ── */
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{tr("报名", "Register")}</Text>
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
      ) : (
        <>
          {/* My rank card */}
          <View style={styles.darkCard}>
            <Text style={styles.darkLabel}>
              {divisionLabel(comp.config, myDiv)} · {tr("我的成绩", "My standing")}
            </Text>
            <View style={styles.tiles}>
              <View style={styles.tile}>
                <Text style={styles.tileV}>{myRow ? `#${myRow.rank}` : "—"}</Text>
                <Text style={styles.tileL}>{tr("名次", "rank")}</Text>
              </View>
              <View style={styles.tile}>
                <Text style={styles.tileV}>{myRow ? myRow.score : 0}</Text>
                <Text style={styles.tileL}>{tr("积分", "points")}</Text>
              </View>
              <View style={styles.tile}>
                <Text style={styles.tileV}>
                  {comp.my_scorecards.filter((s) => s.top).length}/{comp.problem_count}
                </Text>
                <Text style={styles.tileL}>{tr("完攀", "tops")}</Text>
              </View>
            </View>
          </View>

          {/* Tabs */}
          <View style={styles.seg}>
            {(["problems", "standings"] as const).map((t) => (
              <Pressable key={t} style={[styles.segItem, tab === t && styles.segOn]} onPress={() => setTab(t)}>
                <Text style={[styles.segText, tab === t && styles.segTextOn]}>
                  {t === "problems" ? tr("线路", "Problems") : tr("排名", "Standings")}
                </Text>
              </Pressable>
            ))}
          </View>

          {tab === "problems" ? (
            <View style={styles.card}>
              {comp.problems.map((p, i) => {
                const sc = scMap.get(p.id);
                const result = sc?.top ? "Top" : sc?.zone ? "Zone" : null;
                return (
                  <View key={p.id} style={[styles.pRow, i === comp.problems.length - 1 && { borderBottomWidth: 0 }]}>
                    <Text style={styles.pName} numberOfLines={1}>
                      {p.label || `#${i + 1}`}
                      {p.points != null ? `  ·  ${p.points}` : ""}
                    </Text>
                    {active ? (
                      <View style={styles.pBtns}>
                        <Pressable
                          style={[styles.pBtn, sc?.zone && !sc?.top && styles.pBtnZoneOn]}
                          disabled={busy === p.id}
                          onPress={() => score(p, false)}
                        >
                          <Text style={[styles.pBtnText, sc?.zone && !sc?.top && styles.pBtnTextOn]}>Zone</Text>
                        </Pressable>
                        <Pressable
                          style={[styles.pBtn, sc?.top && styles.pBtnTopOn]}
                          disabled={busy === p.id}
                          onPress={() => score(p, true)}
                        >
                          <Text style={[styles.pBtnText, sc?.top && styles.pBtnTextOn]}>Top</Text>
                        </Pressable>
                      </View>
                    ) : (
                      <Text style={[styles.resultChip, result === "Top" && { color: colors.accent }]}>
                        {result ?? "—"}
                      </Text>
                    )}
                  </View>
                );
              })}
            </View>
          ) : (
            <View style={styles.card}>
              {myRows.length === 0 ? (
                <Text style={[styles.muted, { padding: 8 }]}>{tr("暂无排名", "No standings yet")}</Text>
              ) : (
                myRows.map((r, i) => (
                  <View key={r.user_id} style={[styles.sRow, i === myRows.length - 1 && { borderBottomWidth: 0 }, r.user_id === myId && styles.sRowMe]}>
                    <Text style={styles.sRank}>{r.rank}</Text>
                    <Text style={styles.sName} numberOfLines={1}>{r.display_name || tr("攀岩者", "Climber")}</Text>
                    <Text style={styles.sScore}>{r.score}</Text>
                  </View>
                ))
              )}
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}

const createStyles = (colors: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    fill: { flex: 1, backgroundColor: colors.background },
    center: { alignItems: "center", justifyContent: "center" },
    muted: { fontFamily: theme.fonts.regular, fontSize: 13, color: colors.textSecondary },
    statusRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 12 },
    orgRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
    orgLogo: { width: 26, height: 26, borderRadius: 7 },
    orgLogoPlaceholder: { backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" },
    orgLogoText: { fontFamily: theme.fonts.black, fontSize: 13, color: "#FFFFFF" },
    orgName: { fontFamily: theme.fonts.bold, fontSize: 13, color: colors.textSecondary, flex: 1 },
    compTitle: { fontFamily: theme.fonts.black, fontSize: 22, color: colors.textPrimary, letterSpacing: -0.5, lineHeight: 27 },
    metaChips: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 8, flexWrap: "wrap" },
    chipTeal: { backgroundColor: "rgba(48,110,111,0.1)", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 16 },
    chipTealText: { fontFamily: theme.fonts.bold, fontSize: 12, color: "#1D4E4E" },
    metaText: { fontFamily: theme.fonts.regular, fontSize: 13, color: colors.textSecondary },
    desc: { fontFamily: theme.fonts.regular, fontSize: 14, color: colors.textPrimary, lineHeight: 21, marginTop: 10 },
    statusDot: { width: 8, height: 8, borderRadius: 4 },
    statusText: { fontFamily: theme.fonts.bold, fontSize: 13, color: colors.textPrimary },
    card: {
      backgroundColor: colors.cardBackground,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      padding: 14,
      marginBottom: 12,
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
    chipOn: { backgroundColor: colors.pillBackground, borderColor: colors.pillBackground },
    chipText: { fontFamily: theme.fonts.bold, fontSize: 13, color: colors.textSecondary },
    chipTextOn: { color: colors.pillText },
    waiverRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 14 },
    waiverText: { fontFamily: theme.fonts.regular, fontSize: 13, color: colors.textPrimary, flex: 1 },
    cta: { backgroundColor: colors.accent, borderRadius: 14, paddingVertical: 13, alignItems: "center", marginTop: 16 },
    ctaDisabled: { opacity: 0.4 },
    ctaText: { fontFamily: theme.fonts.bold, fontSize: 15, color: "#FFFFFF" },
    darkCard: { backgroundColor: colors.cardDark, borderRadius: 16, padding: 13, marginBottom: 12 },
    darkLabel: { fontFamily: theme.fonts.bold, fontSize: 13, color: "#FFFFFF", marginBottom: 9 },
    tiles: { flexDirection: "row", gap: 8 },
    tile: { flex: 1, backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 10, paddingVertical: 9, alignItems: "center" },
    tileV: { fontFamily: theme.fonts.black, fontSize: 18, color: "#FFFFFF" },
    tileL: { fontFamily: theme.fonts.regular, fontSize: 11, color: "rgba(255,255,255,0.55)", marginTop: 1 },
    seg: { flexDirection: "row", backgroundColor: colors.backgroundSecondary, borderRadius: 11, padding: 3, marginBottom: 12 },
    segItem: { flex: 1, paddingVertical: 7, borderRadius: 9, alignItems: "center" },
    segOn: { backgroundColor: colors.cardBackground },
    segText: { fontFamily: theme.fonts.bold, fontSize: 13, color: colors.textSecondary },
    segTextOn: { color: colors.textPrimary },
    pRow: { flexDirection: "row", alignItems: "center", paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: colors.border, gap: 10 },
    pName: { flex: 1, fontFamily: theme.fonts.bold, fontSize: 14, color: colors.textPrimary },
    pBtns: { flexDirection: "row", gap: 8 },
    pBtn: { paddingHorizontal: 13, paddingVertical: 6, borderRadius: 10, backgroundColor: colors.backgroundSecondary },
    pBtnZoneOn: { backgroundColor: "#D9770622" },
    pBtnTopOn: { backgroundColor: colors.accent },
    pBtnText: { fontFamily: theme.fonts.bold, fontSize: 13, color: colors.textSecondary },
    pBtnTextOn: { color: "#FFFFFF" },
    resultChip: { fontFamily: theme.fonts.bold, fontSize: 13, color: colors.textTertiary },
    sRow: { flexDirection: "row", alignItems: "center", paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: colors.border, gap: 12 },
    sRowMe: { backgroundColor: "rgba(48,110,111,0.08)", marginHorizontal: -14, paddingHorizontal: 14, borderRadius: 10 },
    sRank: { width: 28, textAlign: "center", fontFamily: theme.fonts.black, fontSize: 15, color: colors.textPrimary },
    sName: { flex: 1, fontFamily: theme.fonts.bold, fontSize: 14, color: colors.textPrimary },
    sScore: { fontFamily: theme.fonts.monoMedium, fontSize: 15, color: colors.textPrimary },
  });
