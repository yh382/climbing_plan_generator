// P2-H — unified "活动 / Programs" discovery (KAYA/Strava-style): aggregates the
// gym-published events + challenges + competitions (+ blog as News) into one
// two-column card grid; tapping a card opens the matching detail. Backends stay
// distinct; only discovery is unified. Each card shows cover + host gym + dates
// so you can tell what's new and who's running it.
import React, { useEffect, useLayoutEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  useWindowDimensions,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useNavigation } from "@react-navigation/native";
import { HeaderButton } from "@/components/ui/HeaderButton";
import { theme, PROGRAM_KIND_COLORS } from "@/lib/theme";
import { formatProgramDate, formatProgramDateRange } from "@/lib/formatProgramDate";
import { useThemeColors } from "@/lib/useThemeColors";
import {
  NATIVE_HEADER_LARGE,
  withHeaderTheme,
  HEADER_TRANSPARENT,
} from "@/lib/nativeHeaderOptions";
import { useSettings } from "@/contexts/SettingsContext";
import { eventApi } from "@/features/community/events/api";
import { challengeApi } from "@/features/community/challenges/api";
import { compApi } from "@/features/community/competitions/api";
import { blogApi } from "@/features/community/blog/api";

type Kind = "comp" | "event" | "challenge" | "news";
type ProgramStatus = "ongoing" | "upcoming" | "ended" | "none";
interface Item {
  kind: Kind;
  id: string;
  title: string;
  hostName: string | null;
  hostLogo: string | null;
  cover: string | null;
  start: string | null; // raw ISO — formatted per-language at render
  end: string | null;
  single: string | null; // news published_at
  compStatus?: string | null; // raw backend lifecycle — translated at render
  featured?: boolean;
  ts: number; // recency key within a status bucket
}

const KINDS: { key: Kind | "all"; icon: any; zh: string; en: string }[] = [
  { key: "all", icon: "apps", zh: "全部", en: "All" },
  { key: "comp", icon: "trophy", zh: "比赛", en: "Comps" },
  { key: "event", icon: "calendar", zh: "活动", en: "Events" },
  { key: "challenge", icon: "flame", zh: "挑战", en: "Challenges" },
  { key: "news", icon: "newspaper", zh: "资讯", en: "News" },
];

const META: Record<Kind, { icon: any; tint: string; zh: string; en: string }> = {
  comp: { icon: "trophy", tint: PROGRAM_KIND_COLORS.comp, zh: "比赛", en: "Comp" },
  event: { icon: "calendar", tint: PROGRAM_KIND_COLORS.event, zh: "活动", en: "Event" },
  challenge: { icon: "flame", tint: PROGRAM_KIND_COLORS.challenge, zh: "挑战", en: "Challenge" },
  news: { icon: "newspaper", tint: PROGRAM_KIND_COLORS.news, zh: "资讯", en: "News" },
};

/** Darken a #RRGGBB hex for the fallback-cover gradient end stop. */
function shade(hex: string, factor: number): string {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v: number) => Math.round(v * factor).toString(16).padStart(2, "0");
  return `#${ch((n >> 16) & 0xff)}${ch((n >> 8) & 0xff)}${ch(n & 0xff)}`;
}

function compStatus(status: string, tr: (zh: string, en: string) => string): string {
  return status === "active"
    ? tr("进行中", "Live")
    : status === "finished"
      ? tr("已结束", "Ended")
      : tr("报名中", "Open");
}

const DAY_MS = 24 * 60 * 60 * 1000;
/** 进行中 > 未开始 > (无日期内容) > 已结束 — ended items must not sort first (★2). */
function programStatus(start: string | null, end: string | null): ProgramStatus {
  const s = start ? new Date(start).getTime() : NaN;
  // Date-only ends (admin date pickers) mean "through that day" — pad a day.
  const e = end ? new Date(end).getTime() + DAY_MS : Number.isNaN(s) ? NaN : s + DAY_MS;
  if (Number.isNaN(s) && Number.isNaN(e)) return "none";
  const now = Date.now();
  if (!Number.isNaN(s) && now < s) return "upcoming";
  if (!Number.isNaN(e) && now > e) return "ended";
  return "ongoing";
}

const STATUS_RANK: Record<ProgramStatus, number> = { ongoing: 0, upcoming: 1, none: 2, ended: 3 };

export default function ProgramsScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { tr, lang } = useSettings();
  const router = useRouter();
  const navigation = useNavigation();
  const { width } = useWindowDimensions();
  const cardW = (width - 16 * 2 - 12) / 2;

  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Kind | "all">("all");

  useLayoutEffect(() => {
    navigation.setOptions({
      ...NATIVE_HEADER_LARGE,
      ...withHeaderTheme(colors),
      headerShown: true,
      headerTransparent: HEADER_TRANSPARENT,
      scrollEdgeEffects: { top: "soft" },
      title: tr("活动", "Programs"),
      headerLeft: () => (
        <HeaderButton icon="chevron.backward" onPress={() => router.back()} />
      ),
    });
  }, [navigation, colors, tr, router]);

  useEffect(() => {
    let alive = true;
    Promise.allSettled([
      compApi.listAll(),
      eventApi.getEvents(),
      challengeApi.getChallenges({ limit: 50 }),
      blogApi.getBlogs(),
    ])
      .then(([comps, events, challenges, blogs]) => {
        if (!alive) return;
        const out: Item[] = [];
        if (comps.status === "fulfilled") {
          for (const c of comps.value.items ?? []) {
            out.push({
              kind: "comp",
              id: c.id,
              title: c.title,
              hostName: c.organizer?.name ?? null,
              hostLogo: c.organizer?.logo_url ?? null,
              cover: null,
              start: c.start_at ?? null,
              end: c.end_at ?? null,
              single: null,
              compStatus: c.status ?? null,
              ts: c.start_at ? new Date(c.start_at).getTime() || 0 : 0,
            });
          }
        }
        if (events.status === "fulfilled") {
          for (const e of events.value ?? []) {
            out.push({
              kind: "event",
              id: e.id,
              title: e.title,
              hostName: e.publisher?.name ?? null,
              hostLogo: e.publisher?.logoUrl ?? null,
              cover: e.cover_url ?? null,
              start: e.start_at ?? null,
              end: e.end_at ?? null,
              single: null,
              featured: !!e.is_featured,
              ts: e.start_at ? new Date(e.start_at).getTime() || 0 : 0,
            });
          }
        }
        if (challenges.status === "fulfilled") {
          for (const c of challenges.value ?? []) {
            out.push({
              kind: "challenge",
              id: c.id,
              title: c.title,
              hostName: c.publisher?.name ?? null,
              hostLogo: null,
              cover: c.coverUrl ?? null,
              start: c.startAt ?? null,
              end: c.endAt ?? null,
              single: null,
              ts: c.startAt ? new Date(c.startAt).getTime() || 0 : 0,
            });
          }
        }
        if (blogs.status === "fulfilled") {
          for (const b of blogs.value ?? []) {
            out.push({
              kind: "news",
              id: b.id,
              title: b.title,
              hostName: b.publisher?.name ?? null,
              hostLogo: null,
              cover: b.cover_url ?? null,
              start: null,
              end: null,
              single: b.published_at ?? null,
              ts: b.published_at ? new Date(b.published_at).getTime() || 0 : 0,
            });
          }
        }
        // ★2 — status buckets first (进行中 > 未开始 > 资讯 > 已结束), recency inside.
        // Upcoming sorts soonest-first; every other bucket newest-first.
        // Bucket is precomputed per item: comparator stays consistent even if
        // Date.now() crosses a status boundary mid-sort. Dateless comps fall
        // back to their backend lifecycle so a finished comp can't rank as
        // undated content above live programs.
        const bucketOf = (i: Item): ProgramStatus => {
          const s = i.kind === "news" ? "none" : programStatus(i.start, i.end);
          if (s !== "none" || i.kind !== "comp") return s;
          if (i.compStatus === "active") return "ongoing";
          if (i.compStatus === "finished") return "ended";
          return "upcoming"; // registration/open — not yet running
        };
        const buckets = new Map(out.map((i) => [i, bucketOf(i)]));
        out.sort((a, b) => {
          const sa = buckets.get(a)!;
          const sb = buckets.get(b)!;
          if (STATUS_RANK[sa] !== STATUS_RANK[sb]) return STATUS_RANK[sa] - STATUS_RANK[sb];
          return sa === "upcoming" ? a.ts - b.ts : b.ts - a.ts;
        });
        setItems(out);
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  const shown = filter === "all" ? items : items.filter((i) => i.kind === filter);

  function open(i: Item) {
    if (i.kind === "comp") router.push(`/competition/${i.id}` as any);
    else if (i.kind === "news") router.push(`/blog/${i.id}` as any);
    else if (i.kind === "event")
      router.push({ pathname: "/community/events/[eventId]", params: { eventId: i.id } } as any);
    else
      router.push({ pathname: "/community/challenges/[challengeId]", params: { challengeId: i.id } } as any);
  }

  return (
    <ScrollView
      style={styles.fill}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ paddingBottom: 32 }}
    >
      {/* Filter bar — horizontal scroll of icon pills. */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterBar}
      >
        {KINDS.map((k) => {
          const on = filter === k.key;
          return (
            <Pressable
              key={k.key}
              style={[styles.filterPill, on && styles.filterPillOn]}
              onPress={() => setFilter(k.key)}
            >
              <Ionicons name={k.icon} size={14} color={on ? "#FFFFFF" : colors.textSecondary} />
              <Text style={[styles.filterText, on && styles.filterTextOn]}>{tr(k.zh, k.en)}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {loading ? (
        <View style={styles.centerPad}>
          <ActivityIndicator color={colors.textSecondary} />
        </View>
      ) : shown.length === 0 ? (
        <View style={styles.centerPad}>
          <Text style={styles.muted}>{tr("暂无活动", "Nothing on yet")}</Text>
        </View>
      ) : (
        <View style={styles.grid}>
          {shown.map((i) => {
            const m = META[i.kind];
            const dateLabel =
              i.kind === "news"
                ? formatProgramDate(i.single, lang)
                : formatProgramDateRange(i.start, i.end, lang) ??
                  (i.compStatus ? compStatus(i.compStatus, tr) : null);
            return (
              <Pressable key={`${i.kind}-${i.id}`} style={[styles.card, { width: cardW }]} onPress={() => open(i)}>
                <View style={styles.coverWrap}>
                  {i.cover ? (
                    <Image source={{ uri: i.cover }} style={styles.cover} contentFit="cover" />
                  ) : (
                    // ★1 — no-cover fallback: kind-tint gradient + ghosted icon
                    // pattern (DESIGN_LANGUAGE 封面 fallback 规范; flat blocks banned).
                    <LinearGradient
                      colors={[m.tint, shade(m.tint, 0.66)]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={[styles.cover, styles.coverPh]}
                    >
                      <Ionicons
                        name={m.icon}
                        size={96}
                        color="rgba(255,255,255,0.14)"
                        style={styles.coverGhostIcon}
                      />
                      <Ionicons name={m.icon} size={30} color="rgba(255,255,255,0.9)" />
                    </LinearGradient>
                  )}
                  <View style={styles.kindBadge}>
                    <Text style={styles.kindBadgeText}>{tr(m.zh, m.en)}</Text>
                  </View>
                  {i.featured ? (
                    <View style={styles.featBadge}>
                      <Ionicons name="star" size={10} color="#FFFFFF" />
                    </View>
                  ) : null}
                </View>

                <View style={styles.cardBody}>
                  <Text style={styles.cardTitle} numberOfLines={2}>{i.title}</Text>
                  <View style={styles.hostRow}>
                    {i.hostLogo ? (
                      <Image source={{ uri: i.hostLogo }} style={styles.hostLogo} contentFit="cover" />
                    ) : (
                      <View style={[styles.hostLogo, styles.hostLogoPh, { backgroundColor: m.tint }]}>
                        <Ionicons name={m.icon} size={8} color="#FFFFFF" />
                      </View>
                    )}
                    <Text style={styles.hostName} numberOfLines={1}>
                      {i.hostName ?? tr("岩馆", "Gym")}
                    </Text>
                  </View>
                  {dateLabel ? (
                    <View style={styles.dateRow}>
                      <Ionicons name="calendar-outline" size={11} color={colors.textTertiary} />
                      <Text style={styles.dateText}>{dateLabel}</Text>
                    </View>
                  ) : null}
                </View>
              </Pressable>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

const createStyles = (colors: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    fill: { flex: 1, backgroundColor: colors.background },
    centerPad: { alignItems: "center", justifyContent: "center", paddingVertical: 64 },
    muted: { fontFamily: theme.fonts.regular, fontSize: 14, color: colors.textSecondary },

    // Filter bar
    filterBar: { flexDirection: "row", gap: 8, paddingHorizontal: 16, paddingVertical: 8 },
    filterPill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 13,
      paddingVertical: 8,
      borderRadius: theme.borderRadius.pill,
      backgroundColor: colors.cardBackground,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    filterPillOn: { backgroundColor: colors.accent, borderColor: colors.accent },
    filterText: { fontFamily: theme.fonts.bold, fontSize: 13, color: colors.textSecondary },
    filterTextOn: { color: "#FFFFFF" },

    // Grid
    grid: {
      flexDirection: "row",
      flexWrap: "wrap",
      paddingHorizontal: 16,
      paddingTop: 4,
      columnGap: 12,
      rowGap: 14,
    },
    card: {
      backgroundColor: colors.cardBackground,
      borderRadius: theme.borderRadius.card,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      overflow: "hidden",
    },
    coverWrap: { width: "100%", aspectRatio: 1.35, position: "relative" },
    cover: { width: "100%", height: "100%" },
    coverPh: { alignItems: "center", justifyContent: "center", overflow: "hidden" },
    coverGhostIcon: {
      position: "absolute",
      right: -18,
      bottom: -20,
      transform: [{ rotate: "-12deg" }],
    },
    kindBadge: {
      position: "absolute",
      top: 8,
      left: 8,
      backgroundColor: "rgba(0,0,0,0.5)",
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 7,
    },
    kindBadgeText: { fontFamily: theme.fonts.bold, fontSize: 10, color: "#FFFFFF", letterSpacing: 0.2 },
    featBadge: {
      position: "absolute",
      top: 8,
      right: 8,
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: "#E8A93C",
      alignItems: "center",
      justifyContent: "center",
    },

    cardBody: { padding: 11, gap: 7 },
    cardTitle: { fontFamily: theme.fonts.black, fontSize: 14, color: colors.textPrimary, lineHeight: 18, letterSpacing: -0.2 },
    hostRow: { flexDirection: "row", alignItems: "center", gap: 6 },
    hostLogo: { width: 16, height: 16, borderRadius: 5, backgroundColor: colors.backgroundSecondary },
    hostLogoPh: { alignItems: "center", justifyContent: "center" },
    hostName: { flex: 1, fontFamily: theme.fonts.medium, fontSize: 12, color: colors.textSecondary },
    dateRow: { flexDirection: "row", alignItems: "center", gap: 5 },
    dateText: { fontFamily: theme.fonts.monoMedium, fontSize: 11, color: colors.textTertiary },
  });
