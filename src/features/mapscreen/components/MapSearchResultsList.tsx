// src/features/mapscreen/components/MapSearchResultsList.tsx
// BR Track D Day 6 — cross-level outdoor search results list (PLAN §6).
//
// CA-FU Phase B — consumes `outdoorApi.searchAreas({ q, displayKinds })`
// (`/outdoor/areas/search`) and adapts each AreaListItem to the SearchResult
// row shape (type = display_kind, region/area/crag only). We render each hit
// as a typed row + dispatch tap by type back to the caller.
//
// Owner side (MapScreenMapbox):
//   - Owns the query text + the expand/collapse of MapSearchBar
//   - Mounts this list inside the gyms-sheet body when `searchExpanded`
//     and `query.trim() != ''`
//   - Provides the 5 tap callbacks; each presents the corresponding
//     InfoSheet (region/area/crag) or triggers the Wall pin focus path
//     or pushes the route detail page
//
// This component is intentionally dumb: it owns the debounced fetch, a
// loading spinner, and empty/error states, but knows nothing about
// sheets/routing — those land in the caller.

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useSettings } from "../../../contexts/SettingsContext";
import { useThemeColors } from "../../../lib/useThemeColors";
import { theme } from "../../../lib/theme";
import { outdoorApi } from "../../outdoor/api";
import { getSearchHitMetaLabel } from "../../outdoor/hooks";
import type { OutdoorAreaListItem, SearchResult } from "../../outdoor/types";

type TR = (zh: string, en: string) => string;

// CA-FU Phase B — `/outdoor/search` (mixed regions/areas/crags/walls/routes)
// 404s post-6.2. The map search now goes through `/outdoor/areas/search`
// (area names only, region/area/crag tiers) and adapts each AreaListItem to
// the existing SearchResult row shape so ResultRow + getSearchHitMetaLabel +
// the caller's typed onPressHit dispatch keep working unchanged. Walls/routes
// no longer surface in search (intentional — tap a crag to browse routes).
function areaItemToSearchResult(item: OutdoorAreaListItem): SearchResult {
  return {
    // displayKinds is filtered to region/area/crag below, so this narrows safely.
    type: item.display_kind as SearchResult["type"],
    id: item.id,
    name: item.name,
    name_en: item.name_en,
    route_count: item.subtree_route_count,
  };
}

export interface MapSearchResultsListProps {
  /** Free-text query. Empty / whitespace → empty list (no fetch). */
  query: string;
  /** Optional region scope. When set, search only returns hits inside
   *  this Region. Used by RoutesListSheet's in-area search variant. */
  regionId?: string;
  /** Per-row dispatcher. Caller switches on `hit.type` and presents
   *  the appropriate sheet / pushes route detail. */
  onPressHit: (hit: SearchResult) => void;
  /** Debounce in ms before fetching (matches `useViewportPins`). */
  debounceMs?: number;
}

const DEFAULT_DEBOUNCE_MS = 300;

export function MapSearchResultsList({
  query,
  regionId,
  onPressHit,
  debounceMs = DEFAULT_DEBOUNCE_MS,
}: MapSearchResultsListProps) {
  const colors = useThemeColors();
  const { tr } = useSettings();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const seqRef = useRef(0);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      setError(null);
      setLoading(false);
      return;
    }
    const timer = setTimeout(() => {
      const fetchSeq = ++seqRef.current;
      setLoading(true);
      setError(null);
      outdoorApi
        // regionId no longer scopes — area search is global (CA-FU). Prop
        // kept for caller compat; revisit if scoped area search is added.
        .searchAreas({ q: trimmed, displayKinds: ["region", "area", "crag"] })
        .then((res) => {
          if (fetchSeq !== seqRef.current) return;
          setResults(res.items.map(areaItemToSearchResult));
        })
        .catch((err) => {
          if (fetchSeq !== seqRef.current) return;
          const message = err instanceof Error ? err.message : "Search failed";
          setError(message);
        })
        .finally(() => {
          if (fetchSeq !== seqRef.current) return;
          setLoading(false);
        });
    }, debounceMs);
    return () => clearTimeout(timer);
  }, [query, regionId, debounceMs]);

  const trimmedQuery = query.trim();

  if (!trimmedQuery) {
    return (
      <View style={styles.emptyWrap}>
        <Text style={styles.hint}>
          {tr("输入关键字搜索大区、岩区、岩点…", "Search regions, areas, crags…")}
        </Text>
      </View>
    );
  }

  if (loading && results.length === 0) {
    return (
      <View style={styles.emptyWrap}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.emptyWrap}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (results.length === 0) {
    return (
      <View style={styles.emptyWrap}>
        <Text style={styles.hint}>
          {tr("没有匹配的结果", "No matches")}
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={styles.listContent}
    >
      {results.map((hit) => (
        <ResultRow
          key={`${hit.type}:${hit.id}`}
          hit={hit}
          onPress={() => onPressHit(hit)}
          colors={colors}
          tr={tr}
        />
      ))}
    </ScrollView>
  );
}

export default MapSearchResultsList;

// ---- Sub-components ----

function iconForType(type: SearchResult["type"]): keyof typeof Ionicons.glyphMap {
  switch (type) {
    case "region": return "map-outline";
    case "area": return "folder-open-outline";
    case "crag": return "location-outline";
    case "wall": return "layers-outline";
    case "route": return "flag-outline";
  }
}

function ResultRow({
  hit,
  onPress,
  colors,
  tr,
}: {
  hit: SearchResult;
  onPress: () => void;
  colors: ReturnType<typeof useThemeColors>;
  tr: TR;
}) {
  // Top-line: hit.name. Sub-line: hooks helper derives a per-type meta
  // string. Type label (Region/Area/...) sits on the right.
  const meta = getSearchHitMetaLabel(hit);
  const typeLabel = (() => {
    switch (hit.type) {
      case "region": return tr("大区", "Region");
      case "area": return tr("岩区", "Area");
      case "crag": return tr("岩点", "Crag");
      case "wall": return tr("岩壁", "Wall");
      case "route": return tr("路线", "Route");
    }
  })();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        rowStyles.row(colors),
        pressed ? { backgroundColor: colors.backgroundSecondary } : null,
      ]}
    >
      <Ionicons
        name={iconForType(hit.type)}
        size={20}
        color={colors.textSecondary}
        style={rowStyles.icon}
      />
      <View style={rowStyles.text}>
        <Text style={rowStyles.name(colors)} numberOfLines={1}>
          {hit.name}
        </Text>
        {meta ? (
          <Text style={rowStyles.meta(colors)} numberOfLines={1}>
            {meta}
          </Text>
        ) : null}
      </View>
      <Text style={rowStyles.typeLabel(colors)} numberOfLines={1}>
        {typeLabel}
      </Text>
    </Pressable>
  );
}

// ---- Styles ----

const createStyles = (c: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    emptyWrap: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 32,
      paddingHorizontal: 24,
    },
    hint: {
      fontFamily: theme.fonts.regular,
      fontSize: 14,
      color: c.textTertiary,
      textAlign: "center",
    },
    errorText: {
      fontFamily: theme.fonts.regular,
      fontSize: 14,
      // The shared theme tokens have no `danger` slot; use textPrimary so
      // the error text reads cleanly on both light and dark backgrounds.
      // Switch to a dedicated token if/when one is added to the theme.
      color: c.textPrimary,
      textAlign: "center",
    },
    listContent: {
      paddingHorizontal: 8,
      paddingBottom: 24,
    },
  });

const rowStyles = {
  row: (c: ReturnType<typeof useThemeColors>) => ({
    flexDirection: "row" as const,
    alignItems: "center" as const,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "transparent" as const,
    marginBottom: 4,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
  }),
  icon: { marginRight: 4 },
  text: { flex: 1, minWidth: 0 },
  name: (c: ReturnType<typeof useThemeColors>) => ({
    fontFamily: theme.fonts.bold,
    fontSize: 15,
    color: c.textPrimary,
  }),
  meta: (c: ReturnType<typeof useThemeColors>) => ({
    fontFamily: theme.fonts.regular,
    fontSize: 12,
    color: c.textSecondary,
    marginTop: 2,
  }),
  typeLabel: (c: ReturnType<typeof useThemeColors>) => ({
    fontFamily: theme.fonts.medium,
    fontSize: 11,
    color: c.textTertiary,
    textTransform: "uppercase" as const,
    letterSpacing: 0.4,
    marginLeft: 8,
  }),
};
