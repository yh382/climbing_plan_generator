import React, { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { View, Text, FlatList, ActivityIndicator, StyleSheet } from "react-native";
import type { GymPlace } from "../../../../lib/poi/types";
import { PAGE_SIZE } from "../constants";
import { GymListItem } from "./GymListItem";

interface GymListProps {
  gyms: GymPlace[];
  onSelectGym: (gym: GymPlace) => void;
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
  onSelectGym,
  loading,
  error,
  colors,
  emptyText,
}: GymListProps) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const listRef = useRef<FlatList<GymPlace>>(null);

  // Reset pagination when gyms change (new search/fetch)
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [gyms]);

  const displayedGyms = gyms.slice(0, visibleCount);

  const onEndReached = useCallback(() => {
    if (visibleCount < gyms.length) {
      setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, gyms.length));
    }
  }, [visibleCount, gyms.length]);

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
      <FlatList<GymPlace>
        ref={listRef}
        data={displayedGyms}
        keyExtractor={(it: GymPlace) => it.place_id}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={listHeader}
        renderItem={({ item }: { item: GymPlace }) => (
          <GymListItem
            gym={item}
            onPress={() => onSelectGym(item)}
            colors={colors}
          />
        )}
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
        // Only the 12pt visual breathing room at the bottom of the list.
        // Safe-area bottom is handled by the parent (sheetContent in
        // GymsScreen.tsx) so the FlatList container itself shrinks rather
        // than overflowing into the home-indicator region.
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
