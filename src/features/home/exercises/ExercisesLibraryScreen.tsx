// src/features/home/exercises/ExercisesLibraryScreen.tsx

import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Image } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import CollapsibleLargeHeaderFlatList from "../../../components/CollapsibleLargeHeaderFlatList";
import type { ActionSummary, BlockInventorySummary, LocaleKey } from "./model/types";
import { GOAL_LABEL, LEVEL_LABEL } from "./model/labels";
import { getBlockListing, getLibrarySummary } from "./api/libraryApi";

import {
  USER_TAXONOMY,
  getBigBlocksToLoad,
  getCategory,
  assignSubcategoryByUserTags,
  type BigCat,
  type SubCatKey,
  type LocaleKey as LocaleKey2,
} from "./model/userTaxonomy";
import { SubcategoryTabs } from "./components/SubcategoryTabs";

// ---------- helpers ----------
function detectLocale(): LocaleKey {
  try {
    const loc = Intl.DateTimeFormat().resolvedOptions().locale || "en";
    return loc.toLowerCase().startsWith("zh") ? "zh" : "en";
  } catch {
    return "en";
  }
}

function uniqueById(list: ActionSummary[]) {
  const map = new Map<string, ActionSummary>();
  for (const a of list) map.set(a.id, a);
  return Array.from(map.values());
}

function pickI18nOrString(v: any, locale: LocaleKey): string {
  if (!v) return "";
  if (typeof v === "string") return v;
  if (typeof v === "object") return v?.[locale] || v?.en || v?.zh || "";
  return "";
}

function getDurationMinutes(a: any): number | null {
  const r = a?.duration_min_range;
  if (Array.isArray(r) && r.length === 2) {
    const max = Number(r[1]);
    if (Number.isFinite(max) && max > 0) return Math.round(max);
    const min = Number(r[0]);
    if (Number.isFinite(min) && min > 0) return Math.round(min);
  }
  const est = a?.est_duration_min;
  if (typeof est === "number" && Number.isFinite(est) && est > 0) return Math.round(est);
  const maybe = a?.protocol?.estimated_minutes ?? a?.protocol?.minutes;
  if (typeof maybe === "number" && Number.isFinite(maybe) && maybe > 0) return Math.round(maybe);
  return null;
}

function ExerciseCard({ action, locale }: { action: ActionSummary; locale: LocaleKey }) {
  const title = action.name?.[locale] ?? action.name?.en ?? action.id;

  const desc =
    pickI18nOrString((action as any).short_desc, locale) ||
    pickI18nOrString((action as any).description, locale) ||
    pickI18nOrString((action as any).cues, locale) ||
    "";

  const goal = (GOAL_LABEL as any)?.[locale]?.[action.goal] ?? action.goal;
  const level = (LEVEL_LABEL as any)?.[locale]?.[action.level] ?? action.level;

  const minutes = getDurationMinutes(action as any);
  const media = (action as any)?.media;
  const imgUrl = media?.thumbnail_url || media?.image_url || media?.thumb || media?.image;

  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.85}>
      <View style={styles.cardImgWrap}>
        {imgUrl ? (
          <Image source={{ uri: imgUrl }} style={styles.cardImg} />
        ) : (
          <View style={styles.cardImgPlaceholder}>
            <Ionicons name="image-outline" size={22} color="#9CA3AF" />
          </View>
        )}
        <View style={styles.heartBtn}>
          <Ionicons name="heart-outline" size={18} color="#111" />
        </View>
      </View>

      <View style={styles.cardRight}>
        <View style={styles.cardTitleRow}>
          <View style={styles.blueBar} />
          <Text style={styles.cardTitle} numberOfLines={1}>
            {title}
          </Text>
        </View>

        {desc ? (
          <Text style={styles.cardDesc} numberOfLines={2}>
            {desc}
          </Text>
        ) : (
          <Text style={[styles.cardDesc, { color: "#9CA3AF" }]} numberOfLines={2}>
            {locale === "zh" ? "暂无简介" : "No description yet"}
          </Text>
        )}

        <Text style={styles.cardMeta} numberOfLines={1}>
          {goal} · {level}
        </Text>

        <View style={styles.cardBottomRow}>
          <View style={styles.iconRow}>
            <View style={styles.miniIconPill}>
              <Ionicons name="pricetag-outline" size={14} color="#111" />
            </View>
            <View style={styles.miniIconPill}>
              <Ionicons name="construct-outline" size={14} color="#111" />
            </View>
            <View style={styles.miniIconPill}>
              <Ionicons name="fitness-outline" size={14} color="#111" />
            </View>
          </View>

          <View style={styles.timePill}>
            <Ionicons name="time-outline" size={14} color="#111" />
            <Text style={styles.timeText}>{minutes ? `${minutes}` : "--"}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function ExercisesLibraryScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ big?: string }>();

  const locale = useMemo(() => detectLocale(), []);
  const [blocks, setBlocks] = useState<BlockInventorySummary[]>([]);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const initialBig = (params.big as BigCat) || "endurance";
  const [big, setBig] = useState<BigCat>(initialBig);

  const cfg = useMemo(() => getCategory(big) ?? USER_TAXONOMY[0], [big]);
  const [activeSub, setActiveSub] = useState<SubCatKey>(cfg.sections[0].key);

  // cache per block -> actions
  const blockCacheRef = useRef<Record<string, ActionSummary[]>>({});
  const loadedBlocksRef = useRef<Set<string>>(new Set());

  const [actionsBySub, setActionsBySub] = useState<Record<string, ActionSummary[]>>({});

  useEffect(() => {
    // 当 big 变化时，默认选第一个小类
    setActiveSub(cfg.sections[0].key);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [big]);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoadingSummary(true);
        setErrorMsg(null);

        const summary = await getLibrarySummary();
        if (!alive) return;

        const summaryBlocks = summary.blocks ?? [];
        setBlocks(summaryBlocks);
        setLoadingSummary(false);

        // 首次进入加载当前 big 的 blocks
        await ensureBigLoaded(big, summaryBlocks);
      } catch (e: any) {
        if (!alive) return;
        setLoadingSummary(false);
        setErrorMsg(e?.message || "Failed to load library summary");
      }
    })();

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadBlock(blockType: string) {
    if (loadedBlocksRef.current.has(blockType)) return;
    const cached = blockCacheRef.current[blockType];
    if (cached) {
      loadedBlocksRef.current.add(blockType);
      return;
    }
    const listing = await getBlockListing(blockType);
    blockCacheRef.current[blockType] = listing.actions ?? [];
    loadedBlocksRef.current.add(blockType);
  }

  async function ensureBigLoaded(targetBig: BigCat, blocksOverride?: BlockInventorySummary[]) {
    try {
      setLoading(true);
      setErrorMsg(null);

      const srcBlocks = blocksOverride ?? blocks;
      const want = getBigBlocksToLoad(targetBig, srcBlocks);

      for (const bt of want) await loadBlock(bt);

      rebuildActionsMap(targetBig);
    } catch (e: any) {
      setErrorMsg(e?.message || "Failed to load actions");
    } finally {
      setLoading(false);
    }
  }

  function rebuildActionsMap(targetBig: BigCat) {
    const category = getCategory(targetBig);
    if (!category) {
      setActionsBySub({});
      return;
    }

    const pool: ActionSummary[] = [];
    for (const bt of category.blocksToLoad) {
      const list = blockCacheRef.current[bt];
      if (list?.length) pool.push(...list);
    }
    const uniq = uniqueById(pool);

    const map: Record<string, ActionSummary[]> = {};
    for (const sec of category.sections) map[sec.key] = [];

    for (const a of uniq) {
      const sec = assignSubcategoryByUserTags(targetBig, a);
      if (sec && map[sec]) map[sec].push(a);
    }

    // 排序：按当前语言标题
    for (const k of Object.keys(map)) {
      map[k].sort((x, y) => {
        const ax = (x.name?.[locale] || x.name?.en || x.id).toLowerCase();
        const ay = (y.name?.[locale] || y.name?.en || y.id).toLowerCase();
        return ax.localeCompare(ay);
      });
    }

    setActionsBySub(map);
  }

  const LeftActions = (
    <TouchableOpacity onPress={() => router.back()} hitSlop={10} style={styles.iconBtn}>
      <Ionicons name="arrow-back" size={25} color="#111" />
    </TouchableOpacity>
  );

  const largeTitleText = locale === "zh" ? "动作库" : "Exercise Library";
  const bigTitle = cfg.title[locale];

  const LargeTitle = <Text style={styles.largeTitle}>{largeTitleText}</Text>;
  const Subtitle = (
    <Text style={styles.largeSubtitle}>
      {locale === "zh" ? "分类 · " : "Category · "}
      {bigTitle}
    </Text>
  );

  const TabsHeader = (
    <View style={{ marginTop: 8, marginBottom: 12 }}>
      <SubcategoryTabs
        locale={locale as unknown as LocaleKey2}
        sections={cfg.sections as any}
        active={activeSub}
        onChange={(k) => setActiveSub(k)}
      />

      {loading ? (
        <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
          <ActivityIndicator />
        </View>
      ) : null}

      {errorMsg ? (
        <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
          <Text style={{ color: "#B91C1C", fontSize: 12 }}>{errorMsg}</Text>
        </View>
      ) : null}
    </View>
  );

  const list = actionsBySub[activeSub] ?? [];

  if (loadingSummary) {
    return (
      <View style={[styles.loadingWrap, { backgroundColor: "#F9FAFB" }]}>
        <ActivityIndicator />
        <Text style={{ marginTop: 10, color: "#6B7280", fontSize: 12 }}>
          {locale === "zh" ? "加载动作库中…" : "Loading library…"}
        </Text>
      </View>
    );
  }

  return (
    <CollapsibleLargeHeaderFlatList
      backgroundColor="#F9FAFB"
      smallTitle={largeTitleText}
      largeTitle={LargeTitle}
      subtitle={Subtitle}
      leftActions={LeftActions}
      data={list}
      keyExtractor={(it: ActionSummary) => it.id}
      renderItem={({ item }: any) => <ExerciseCard action={item} locale={locale} />}
      listHeader={TabsHeader}
      contentContainerStyle={{ paddingHorizontal: 0 }}
      bottomInsetExtra={28}
      showsVerticalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create({
  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center" },

  iconBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },

  largeTitle: { fontSize: 32, fontWeight: "800", color: "#111", lineHeight: 38 },
  largeSubtitle: { fontSize: 14, color: "#6B7280", marginTop: 2 },

  // ----- card style -----
  card: {
    flexDirection: "row",
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 10,
    marginBottom: 12,
    gap: 12,
  },
  cardImgWrap: {
    width: 120,
    height: 110,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "#F3F4F6",
  },
  cardImg: { width: "100%", height: "100%" },
  cardImgPlaceholder: { flex: 1, alignItems: "center", justifyContent: "center" },

  heartBtn: {
    position: "absolute",
    left: 10,
    bottom: 10,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(255,255,255,0.92)",
    alignItems: "center",
    justifyContent: "center",
  },

  cardRight: { flex: 1, minHeight: 110, paddingRight: 2 },
  cardTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  blueBar: { width: 6, height: 22, borderRadius: 3, backgroundColor: "#2563EB" },

  cardTitle: { fontSize: 16, fontWeight: "800", color: "#111", flexShrink: 1 },
  cardDesc: { marginTop: 6, fontSize: 12.5, color: "#374151", lineHeight: 16 },
  cardMeta: { marginTop: 6, fontSize: 11.5, color: "#6B7280" },

  cardBottomRow: {
    marginTop: "auto",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  iconRow: { flexDirection: "row", gap: 8, alignItems: "center" },
  miniIconPill: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },

  timePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#F3F4F6",
  },
  timeText: { fontSize: 13, fontWeight: "800", color: "#111" },
});
