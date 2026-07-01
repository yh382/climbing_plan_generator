// P2-H — unified "活动 / Programs" discovery list (KAYA-style): aggregates the
// gym-published events + challenges + competitions into one card feed; tapping a
// card opens the matching detail. Backends stay distinct; only discovery is
// unified.
import React, { useEffect, useLayoutEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useNavigation } from "@react-navigation/native";
import { theme } from "@/lib/theme";
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
interface Item {
  kind: Kind;
  id: string;
  title: string;
  subtitle: string;
  featured?: boolean;
  ts: number; // for sorting (desc)
}

const KINDS: { key: Kind | "all"; zh: string; en: string }[] = [
  { key: "all", zh: "全部", en: "All" },
  { key: "comp", zh: "比赛", en: "Comps" },
  { key: "event", zh: "活动", en: "Events" },
  { key: "challenge", zh: "挑战", en: "Challenges" },
  { key: "news", zh: "资讯", en: "News" },
];

const META: Record<Kind, { icon: any; tint: string; zh: string; en: string }> = {
  comp: { icon: "trophy", tint: "#306E6F", zh: "比赛", en: "Comp" },
  event: { icon: "calendar", tint: "#2E6F8E", zh: "活动", en: "Event" },
  challenge: { icon: "flame", tint: "#C27C40", zh: "挑战", en: "Challenge" },
  news: { icon: "newspaper", tint: "#5F5E5A", zh: "资讯", en: "News" },
};

export default function ProgramsScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { tr } = useSettings();
  const router = useRouter();
  const navigation = useNavigation();

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
    });
  }, [navigation, colors, tr]);

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
              subtitle: `${c.status === "active" ? tr("进行中", "Live") : c.status === "finished" ? tr("已结束", "Ended") : tr("报名中", "Open")} · ${c.problem_count} ${tr("条线", "problems")}`,
              ts: 0,
            });
          }
        }
        if (events.status === "fulfilled") {
          for (const e of events.value ?? []) {
            out.push({
              kind: "event",
              id: e.id,
              title: e.title,
              subtitle: e.publisher?.name ?? tr("活动", "Event"),
              featured: !!e.is_featured,
              ts: new Date(e.start_at).getTime() || 0,
            });
          }
        }
        if (challenges.status === "fulfilled") {
          for (const c of challenges.value ?? []) {
            out.push({
              kind: "challenge",
              id: c.id,
              title: c.title,
              subtitle: `${c.participantCount ?? 0} ${tr("人参与", "joined")}`,
              ts: 0,
            });
          }
        }
        if (blogs.status === "fulfilled") {
          for (const b of blogs.value ?? []) {
            out.push({
              kind: "news",
              id: b.id,
              title: b.title,
              subtitle: b.publisher?.name ?? tr("资讯", "News"),
              ts: b.published_at ? new Date(b.published_at).getTime() || 0 : 0,
            });
          }
        }
        // comps + featured events first, then by recency
        out.sort((a, b) => {
          const w = (i: Item) => (i.kind === "comp" ? 2 : i.featured ? 1 : 0);
          return w(b) - w(a) || b.ts - a.ts;
        });
        setItems(out);
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [tr]);

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
      <View style={styles.chips}>
        {KINDS.map((k) => {
          const on = filter === k.key;
          return (
            <Pressable key={k.key} style={[styles.chip, on && styles.chipOn]} onPress={() => setFilter(k.key)}>
              <Text style={[styles.chipText, on && styles.chipTextOn]}>{tr(k.zh, k.en)}</Text>
            </Pressable>
          );
        })}
      </View>

      {loading ? (
        <View style={styles.centerPad}>
          <ActivityIndicator color={colors.textSecondary} />
        </View>
      ) : shown.length === 0 ? (
        <View style={styles.centerPad}>
          <Text style={styles.muted}>{tr("暂无活动", "Nothing on yet")}</Text>
        </View>
      ) : (
        <View style={{ paddingTop: 4 }}>
          {shown.map((i) => {
            const m = META[i.kind];
            return (
              <Pressable key={`${i.kind}-${i.id}`} style={styles.card} onPress={() => open(i)}>
                <View style={[styles.iconWrap, { backgroundColor: m.tint }]}>
                  <Ionicons name={m.icon} size={20} color="#FFFFFF" />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.titleRow}>
                    {i.featured ? <Ionicons name="star" size={12} color="#E8A93C" /> : null}
                    <Text style={styles.title} numberOfLines={1}>{i.title}</Text>
                  </View>
                  <Text style={styles.sub} numberOfLines={1}>
                    {tr(m.zh, m.en)} · {i.subtitle}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
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
    chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, padding: 16, paddingBottom: 8 },
    chip: {
      paddingHorizontal: 14,
      paddingVertical: 7,
      borderRadius: 18,
      backgroundColor: colors.cardBackground,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    chipOn: { backgroundColor: colors.pillBackground, borderColor: colors.pillBackground },
    chipText: { fontFamily: theme.fonts.bold, fontSize: 13, color: colors.textSecondary },
    chipTextOn: { color: colors.pillText },
    card: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      backgroundColor: colors.cardBackground,
      borderRadius: theme.borderRadius.card,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      padding: 16,
      marginHorizontal: 16,
      marginBottom: theme.spacing.cardGap,
    },
    iconWrap: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
    titleRow: { flexDirection: "row", alignItems: "center", gap: 5 },
    title: { fontFamily: theme.fonts.black, fontSize: 15, color: colors.textPrimary, flexShrink: 1 },
    sub: { fontFamily: theme.fonts.regular, fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  });
