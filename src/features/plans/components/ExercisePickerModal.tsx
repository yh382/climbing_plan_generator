// src/features/plans/components/ExercisePickerModal.tsx

import { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  FlatList,
  TextInput,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  USER_TAXONOMY,
  getCategory,
  getBigBlocksToLoad,
  assignSubcategoryByUserTags,
  type BigCat,
  type SubCatKey,
} from "../../home/exercises/model/userTaxonomy";
import { SubcategoryTabs } from "../../home/exercises/components/SubcategoryTabs";
import { getLibrarySummary, getBlockListing } from "../../home/exercises/api/libraryApi";
import type { ActionSummary, BlockInventorySummary } from "../../home/exercises/model/types";

interface Props {
  visible: boolean;
  locale: "zh" | "en";
  onClose: () => void;
  onSelect: (action: ActionSummary) => void;
}

function uniqueById(list: ActionSummary[]) {
  const map = new Map<string, ActionSummary>();
  for (const a of list) map.set(a.id, a);
  return Array.from(map.values());
}

export function ExercisePickerModal({ visible, locale, onClose, onSelect }: Props) {
  const insets = useSafeAreaInsets();

  const [big, setBig] = useState<BigCat>("strength_power");
  const cfg = useMemo(() => getCategory(big) ?? USER_TAXONOMY[0], [big]);
  const [activeSub, setActiveSub] = useState<SubCatKey>(cfg.sections[0].key);

  const [blocks, setBlocks] = useState<BlockInventorySummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  const blockCacheRef = useRef<Record<string, ActionSummary[]>>({});
  const loadedRef = useRef<Set<string>>(new Set());
  const [actionsBySub, setActionsBySub] = useState<Record<string, ActionSummary[]>>({});

  // Reset subcategory on big change
  useEffect(() => {
    setActiveSub(cfg.sections[0].key);
  }, [cfg]);

  // Load library summary once
  useEffect(() => {
    if (!visible) return;
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const summary = await getLibrarySummary();
        if (!alive) return;
        setBlocks(summary.blocks ?? []);
        await loadBig(big, summary.blocks ?? []);
      } catch {
        // ignore
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  async function loadBlock(blockType: string) {
    if (loadedRef.current.has(blockType)) return;
    const cached = blockCacheRef.current[blockType];
    if (cached) { loadedRef.current.add(blockType); return; }
    const listing = await getBlockListing(blockType);
    blockCacheRef.current[blockType] = listing.actions ?? [];
    loadedRef.current.add(blockType);
  }

  async function loadBig(targetBig: BigCat, blocksOverride?: BlockInventorySummary[]) {
    setLoading(true);
    try {
      const src = blocksOverride ?? blocks;
      const want = getBigBlocksToLoad(targetBig, src);
      for (const bt of want) await loadBlock(bt);
      rebuildMap(targetBig);
    } finally {
      setLoading(false);
    }
  }

  function rebuildMap(targetBig: BigCat) {
    const category = getCategory(targetBig);
    if (!category) { setActionsBySub({}); return; }

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
    setActionsBySub(map);
  }

  const handleBigChange = async (newBig: BigCat) => {
    setBig(newBig);
    await loadBig(newBig);
  };

  const list = useMemo(() => {
    const raw = actionsBySub[activeSub] ?? [];
    if (!search.trim()) return raw;
    const q = search.toLowerCase();
    return raw.filter((a) => {
      const name = (a.name?.[locale] || a.name?.en || a.id).toLowerCase();
      return name.includes(q);
    });
  }, [actionsBySub, activeSub, search, locale]);

  const renderItem = ({ item }: { item: ActionSummary }) => {
    const title = item.name?.[locale] ?? item.name?.en ?? item.id;
    const media = (item as any)?.media;
    const imgUrl = media?.thumbnail_url || media?.image_url || media?.thumb || media?.image;

    return (
      <TouchableOpacity style={s.itemCard} activeOpacity={0.8} onPress={() => onSelect(item)}>
        <View style={s.itemImg}>
          {imgUrl ? (
            <Image source={{ uri: imgUrl }} style={{ width: "100%", height: "100%" }} />
          ) : (
            <Ionicons name="barbell-outline" size={16} color="#9CA3AF" />
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.itemTitle} numberOfLines={1}>{title}</Text>
          <Text style={s.itemMeta} numberOfLines={1}>
            {item.goal} · {item.level}
          </Text>
        </View>
        <Ionicons name="add-circle-outline" size={22} color="#4F46E5" />
      </TouchableOpacity>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[s.container, { paddingTop: insets.top + 8 }]}>
        {/* Header */}
        <View style={s.header}>
          <Text style={s.headerTitle}>{locale === "zh" ? "选择动作" : "Select Exercise"}</Text>
          <TouchableOpacity onPress={onClose} hitSlop={10}>
            <Ionicons name="close" size={24} color="#111" />
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={s.searchWrap}>
          <Ionicons name="search-outline" size={18} color="#9CA3AF" />
          <TextInput
            style={s.searchInput}
            placeholder={locale === "zh" ? "搜索动作..." : "Search exercises..."}
            placeholderTextColor="#9CA3AF"
            value={search}
            onChangeText={setSearch}
          />
        </View>

        {/* Big category tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.bigTabs}
        >
          {USER_TAXONOMY.map((cat) => {
            const isActive = cat.key === big;
            return (
              <TouchableOpacity
                key={cat.key}
                style={[s.bigTab, isActive && s.bigTabActive]}
                onPress={() => handleBigChange(cat.key)}
              >
                <Text style={[s.bigTabText, isActive && s.bigTabTextActive]} numberOfLines={1}>
                  {cat.title[locale]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Subcategory tabs */}
        <SubcategoryTabs
          locale={locale}
          sections={cfg.sections as any}
          active={activeSub}
          onChange={(k) => setActiveSub(k)}
        />

        {/* List */}
        {loading ? (
          <View style={s.loadingWrap}>
            <ActivityIndicator />
          </View>
        ) : (
          <FlatList
            data={list}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 20 }}
            ListEmptyComponent={
              <View style={s.emptyWrap}>
                <Text style={s.emptyText}>{locale === "zh" ? "暂无动作" : "No exercises found"}</Text>
              </View>
            }
          />
        )}
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FAFAFA" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  headerTitle: { fontSize: 18, fontWeight: "800", color: "#111" },

  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    marginHorizontal: 16,
    paddingHorizontal: 12,
    height: 40,
    gap: 8,
    marginBottom: 12,
  },
  searchInput: { flex: 1, fontSize: 14, color: "#111" },

  bigTabs: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 6,
    paddingBottom: 8,
  },
  bigTab: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
  },
  bigTabActive: { backgroundColor: "#111" },
  bigTabText: { fontSize: 11, fontWeight: "700", color: "#6B7280" },
  bigTabTextActive: { color: "#FFF" },

  itemCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    gap: 12,
  },
  itemImg: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: "#F3F4F6",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  itemTitle: { fontSize: 14, fontWeight: "700", color: "#111" },
  itemMeta: { fontSize: 12, color: "#6B7280", marginTop: 2 },

  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 40 },
  emptyWrap: { alignItems: "center", paddingTop: 40 },
  emptyText: { color: "#9CA3AF", fontSize: 14 },
});
