// src/features/outdoor/components/RoutesSegment.tsx
// Crag-community "Routes" segment — Design C: SectionList grouped by Sector > Wall,
// with search bar + grade range filter chip.

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  SectionList,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useThemeColors } from "../../../lib/useThemeColors";
import { theme } from "../../../lib/theme";
import { useSettings } from "../../../contexts/SettingsContext";
import FilterChip from "../../../components/ui/FilterChip";
import { outdoorApi } from "../api";
import type { OutdoorRoute } from "../types";
import RouteListCard from "./RouteListCard";
import useOutdoorFiltersStore from "../../../store/useOutdoorFiltersStore";

type SectionData = {
  title: string; // "Sector · Wall"
  data: OutdoorRoute[];
};

type Props = {
  areaId: string;
};

export default function RoutesSegment({ areaId }: Props) {
  const colors = useThemeColors();
  const { tr } = useSettings();
  const router = useRouter();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [routes, setRoutes] = useState<OutdoorRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  // Grade range filter lives in useOutdoorFiltersStore so the picker formSheet
  // route (app/outdoor-grade-range.tsx) can write it back — sheet-container-audit A1.
  const gradeRange = useOutdoorFiltersStore((s) => s.gradeRange);
  const setGradeRange = useOutdoorFiltersStore((s) => s.setGradeRange);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    outdoorApi
      .search("", areaId)
      .then((data) => {
        if (!cancelled) setRoutes(data);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [areaId]);

  // Filter by query (name + grade) and grade range.
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return routes.filter((r) => {
      if (q) {
        const hay = `${r.name} ${r.name_en ?? ""} ${r.grade_text}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (gradeRange.min && gradeRange.max && r.grade_text) {
        const inRange = isGradeInRange(r.grade_text, gradeRange.min, gradeRange.max);
        if (!inRange) return false;
      }
      return true;
    });
  }, [routes, query, gradeRange]);

  // Group by Sector · Wall.
  const sections: SectionData[] = useMemo(() => {
    const buckets = new Map<string, OutdoorRoute[]>();
    for (const r of filtered) {
      const key = `${r.sector_name ?? tr("未分组", "Unsorted")} · ${r.wall_name ?? ""}`.trim();
      const arr = buckets.get(key) ?? [];
      arr.push(r);
      buckets.set(key, arr);
    }
    return Array.from(buckets.entries()).map(([title, data]) => ({ title, data }));
  }, [filtered, tr]);

  const gradeChipLabel = useMemo(() => {
    if (!gradeRange.min && !gradeRange.max) return tr("全部难度", "All Grades");
    if (gradeRange.min && gradeRange.max && gradeRange.min !== gradeRange.max) {
      return `${gradeRange.min}–${gradeRange.max}`;
    }
    return gradeRange.min ?? "";
  }, [gradeRange, tr]);

  const gradeActive = !!(gradeRange.min || gradeRange.max);

  const handleClearAll = useCallback(() => {
    setQuery("");
    setGradeRange({ min: null, max: null });
  }, [setGradeRange]);

  const hasFilter = !!query || gradeActive;

  return (
    <View style={styles.container}>
      {/* Search bar */}
      <View style={[styles.searchRow, { backgroundColor: colors.backgroundSecondary }]}>
        <Ionicons name="search" size={16} color={colors.textTertiary} />
        <TextInput
          style={[styles.searchInput, { color: colors.textPrimary }]}
          placeholder={tr("搜索路线", "Search routes")}
          placeholderTextColor={colors.textTertiary}
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
        />
        {query ? (
          <TouchableOpacity onPress={() => setQuery("")} hitSlop={10}>
            <Ionicons name="close-circle" size={16} color={colors.textTertiary} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Filter chips */}
      <View style={styles.chipRow}>
        <FilterChip
          label={gradeChipLabel}
          onPress={() => router.push("/outdoor-grade-range")}
          active={gradeActive}
          dropdown
        />
        {hasFilter ? (
          <FilterChip
            label={tr("清除", "Clear")}
            onPress={handleClearAll}
            leadingIcon="close"
          />
        ) : null}
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : sections.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Ionicons name="search-outline" size={36} color={colors.textTertiary} />
          <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>
            {tr("没有符合的路线", "No matching routes")}
          </Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(route) => route.id}
          renderSectionHeader={({ section }) => (
            <View style={[styles.sectionHeader, { backgroundColor: colors.background }]}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                {section.title}
              </Text>
              <Text style={[styles.sectionCount, { color: colors.textTertiary }]}>
                {section.data.length}
              </Text>
            </View>
          )}
          renderItem={({ item }) => (
            <RouteListCard
              route={item}
              onPress={() =>
                router.push(`/outdoor/outdoor-route-detail?id=${encodeURIComponent(item.id)}` as any)
              }
              hideLocation
            />
          )}
          stickySectionHeadersEnabled
          SectionSeparatorComponent={null}
          scrollEnabled={false}
        />
      )}

    </View>
  );
}

// ── grade range helper ─────────────────────────────────────────────

const YDS_ORDER = [
  "5.5","5.6","5.7","5.8","5.9",
  "5.10a","5.10b","5.10c","5.10d",
  "5.11a","5.11b","5.11c","5.11d",
  "5.12a","5.12b","5.12c","5.12d",
  "5.13a","5.13b","5.13c","5.13d",
  "5.14a","5.14b","5.14c","5.14d",
  "5.15a","5.15b","5.15c",
];
const V_ORDER = ["V0","V1","V2","V3","V4","V5","V6","V7","V8","V9","V10","V11","V12","V13","V14","V15","V16"];

function gradeIndex(g: string): { order: string[]; idx: number } | null {
  const trimmed = g.trim();
  let idx = YDS_ORDER.indexOf(trimmed);
  if (idx >= 0) return { order: YDS_ORDER, idx };
  idx = V_ORDER.indexOf(trimmed.toUpperCase());
  if (idx >= 0) return { order: V_ORDER, idx };
  return null;
}

function isGradeInRange(grade: string, min: string, max: string): boolean {
  const g = gradeIndex(grade);
  const lo = gradeIndex(min);
  const hi = gradeIndex(max);
  if (!g || !lo || !hi) return true; // unknown → don't filter out
  if (g.order !== lo.order || g.order !== hi.order) return false; // different systems → not in range
  return g.idx >= lo.idx && g.idx <= hi.idx;
}

const createStyles = (c: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    container: {},
    searchRow: {
      flexDirection: "row",
      alignItems: "center",
      height: 40,
      borderRadius: 12,
      paddingHorizontal: 12,
      gap: 8,
      marginBottom: 10,
    },
    searchInput: {
      flex: 1,
      fontFamily: theme.fonts.regular,
      fontSize: 14,
    },
    chipRow: { flexDirection: "row", gap: 8, marginBottom: 12, flexWrap: "wrap" },
    centered: { alignItems: "center", justifyContent: "center", paddingVertical: 40 },
    emptyWrap: { alignItems: "center", justifyContent: "center", paddingVertical: 48, gap: 8 },
    emptyTitle: { fontFamily: theme.fonts.bold, fontSize: 15 },
    sectionHeader: {
      paddingVertical: 8,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    sectionTitle: { fontFamily: theme.fonts.bold, fontSize: 13, letterSpacing: 0.5 },
    sectionCount: { fontFamily: theme.fonts.regular, fontSize: 12 },
  });
