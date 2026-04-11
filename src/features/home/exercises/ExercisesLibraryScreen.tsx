// src/features/home/exercises/ExercisesLibraryScreen.tsx

import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator, FlatList } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useNavigation } from "@react-navigation/native";
import { useThemeColors } from "@/lib/useThemeColors";
import { withHeaderTheme } from "@/lib/nativeHeaderOptions";
import { useSettings } from "../../../contexts/SettingsContext";
import type { ActionSummary, BlockInventorySummary, LocaleKey } from "./model/types";
import { GOAL_LABEL, LEVEL_LABEL } from "./model/labels";
import { getBlockListing, getLibrarySummary } from "./api/libraryApi";
import { useFavoriteIds } from "./favoritesApi";

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
import ExerciseLibraryCard from "../../../components/shared/ExerciseLibraryCard";

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

function getDurationMinutes(a: ActionSummary): number | null {
  // Prefer the new canonical duration_min field
  if (typeof a.duration_min === "number" && a.duration_min > 0) return Math.round(a.duration_min);
  // Fallback to legacy fields
  const r = a.duration_min_range;
  if (Array.isArray(r) && r.length === 2) {
    const max = Number(r[1]);
    if (Number.isFinite(max) && max > 0) return Math.round(max);
    const min = Number(r[0]);
    if (Number.isFinite(min) && min > 0) return Math.round(min);
  }
  if (typeof a.est_duration_min === "number" && a.est_duration_min > 0) return Math.round(a.est_duration_min);
  return null;
}

function mapActionToCardProps(action: ActionSummary, locale: LocaleKey) {
  const title = action.name?.[locale] ?? action.name?.en ?? action.id;
  const description =
    pickI18nOrString((action as any).short_desc, locale) ||
    pickI18nOrString((action as any).description, locale) ||
    pickI18nOrString((action as any).cues, locale) ||
    "";
  const goal = (GOAL_LABEL as any)?.[locale]?.[action.goal] ?? action.goal;
  const level = (LEVEL_LABEL as any)?.[locale]?.[action.level] ?? action.level;
  const minutes = getDurationMinutes(action);
  const media = (action as any)?.media;
  const imageUrl = media?.thumbnail_url || media?.image_url || media?.thumb || media?.image || null;
  const equipment = action.equipment ?? [];
  return { title, description, goal, level, minutes, imageUrl, equipment };
}

export default function ExercisesLibraryScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const params = useLocalSearchParams<{ big?: string }>();
  const colors = useThemeColors();
  const s = useMemo(() => createStyles(colors), [colors]);
  const { isFavorite, toggle: toggleFavorite } = useFavoriteIds();
  const { lang: locale, tr } = useSettings();

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

  const bigTitle = cfg.title[locale];

  useLayoutEffect(() => {
    navigation.setOptions({
      ...withHeaderTheme(colors),
      title: bigTitle,
    });
  }, [navigation, colors, bigTitle]);

  const ListHeader = (
    <View>
      <Text style={s.subtitleText}>
        {tr("分类 · ", "Category · ")}
        {bigTitle}
      </Text>
    </View>
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
      <View style={[s.loadingWrap, { backgroundColor: colors.background }]}>
        <ActivityIndicator />
        <Text style={{ marginTop: 10, color: colors.textSecondary, fontSize: 12 }}>
          {tr("加载动作库中…", "Loading library…")}
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={list}
      keyExtractor={(it: ActionSummary) => it.id}
      renderItem={({ item }: any) => {
        const cardProps = mapActionToCardProps(item, locale);
        return (
          <ExerciseLibraryCard
            {...cardProps}
            locale={locale}
            isFavorite={isFavorite(item.id)}
            onToggleFavorite={() => toggleFavorite(item.id)}
            onPress={() =>
              router.push({
                pathname: "/library/exercise-detail",
                params: { exerciseId: item.id, context: "library" },
              })
            }
          />
        );
      }}
      ListHeaderComponent={<>{ListHeader}{TabsHeader}</>}
      contentContainerStyle={{ paddingHorizontal: 0, paddingBottom: 28 }}
      contentInsetAdjustmentBehavior="automatic"
      showsVerticalScrollIndicator={false}
      style={{ backgroundColor: colors.background }}
    />
  );
}

const createStyles = (colors: ReturnType<typeof useThemeColors>) => StyleSheet.create({
  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  subtitleText: { fontSize: 14, color: colors.textSecondary, paddingHorizontal: 16, marginTop: 4 },
});
