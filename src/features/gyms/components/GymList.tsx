import React, { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { View, Text, FlatList, ActivityIndicator, StyleSheet } from "react-native";
import type { GymPlace } from "../../../../lib/poi/types";
// BR Track A: top-level outdoor entity is now Region. Alias kept.
import type { Region as Area } from "../../outdoor/types";
import { PAGE_SIZE } from "../constants";
import { GymListItem } from "./GymListItem";
import { AreaListItem } from "../../outdoor/components/AreaListItem";

// Merged list item type — gym and area are peers in the sheet list.
type MixedItem =
  | { kind: "gym"; key: string; distance_m?: number; gym: GymPlace }
  | { kind: "area"; key: string; distance_m?: number; area: Area };

interface GymListProps {
  gyms: GymPlace[];
  areas?: Area[];
  areaDistances?: Record<string, number>; // area.id → meters (optional; used for sort + display)
  onSelectGym: (gym: GymPlace) => void;
  onSelectArea?: (area: Area) => void;
  loading: boolean;
  error: string | null;
  colors: {
    shellBg: string;
    shellBorder: string;
    iconLabel: string;
    iconInactive: string;
    iconActive: string;
  };
  emptyText: string;
}

export function GymList({
  gyms,
  areas,
  areaDistances,
  onSelectGym,
  onSelectArea,
  loading,
  error,
  colors,
  emptyText,
}: GymListProps) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const listRef = useRef<FlatList<MixedItem>>(null);

  // Build the mixed, distance-sorted list. Items without distance sink to the
  // bottom (Infinity) so the nearby POIs float naturally to the top.
  const mixedItems = useMemo<MixedItem[]>(() => {
    const items: MixedItem[] = [];
    for (const g of gyms) {
      items.push({
        kind: "gym",
        key: `gym:${g.place_id}`,
        distance_m: g.distance_m ?? undefined,
        gym: g,
      });
    }
    for (const a of areas ?? []) {
      items.push({
        kind: "area",
        key: `area:${a.id}`,
        distance_m: areaDistances?.[a.id],
        area: a,
      });
    }
    items.sort((x, y) => (x.distance_m ?? Infinity) - (y.distance_m ?? Infinity));
    return items;
  }, [gyms, areas, areaDistances]);

  // Reset pagination when the merged item set changes (new search/fetch)
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [mixedItems]);

  const displayed = mixedItems.slice(0, visibleCount);

  const onEndReached = useCallback(() => {
    if (visibleCount < mixedItems.length) {
      setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, mixedItems.length));
    }
  }, [visibleCount, mixedItems.length]);

  const listHeader = useMemo(() => (
    <>
      {loading && (
        <View style={styles.loadingRow}>
          <ActivityIndicator />
        </View>
      )}
      {error && <Text style={styles.errorText}>{error}</Text>}
    </>
  ), [loading, error]);

  return (
    <View style={styles.listContainer}>
      <FlatList<MixedItem>
        ref={listRef}
        data={displayed}
        keyExtractor={(it) => it.key}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={listHeader}
        renderItem={({ item }) => {
          if (item.kind === "gym") {
            return (
              <GymListItem
                gym={item.gym}
                onPress={() => onSelectGym(item.gym)}
                colors={colors}
              />
            );
          }
          return (
            <AreaListItem
              area={item.area}
              distanceM={item.distance_m}
              onPress={() => onSelectArea?.(item.area)}
              colors={colors}
            />
          );
        }}
        ItemSeparatorComponent={() => (
          <View style={[styles.rowDivider, { backgroundColor: colors.shellBorder }]} />
        )}
        ListEmptyComponent={
          !loading && !error ? (
            <Text style={[styles.emptyLabel, { color: colors.iconInactive }]}>
              {emptyText}
            </Text>
          ) : null
        }
        onEndReached={onEndReached}
        onEndReachedThreshold={0.5}
        bounces={false}
        overScrollMode="never"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.listCardContent, { paddingBottom: 12 }]}
      />
    </View>
  );
}


const styles = StyleSheet.create({
  listContainer: { flex: 1, paddingTop: 8 },
  loadingRow: { paddingVertical: 6 },
  errorText: { color: "#ef4444", marginBottom: 6, textAlign: "center" },
  emptyLabel: { paddingVertical: 12, textAlign: "center", fontSize: 13, color: "#64748b" },
  listCardContent: { paddingHorizontal: 16, paddingVertical: 4 },
  rowDivider: { height: 1, width: "100%", alignSelf: "center", opacity: 1 },
});
