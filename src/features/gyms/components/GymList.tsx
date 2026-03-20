import React, { useState, useCallback, useEffect, useRef } from "react";
import { View, Text, ActivityIndicator, StyleSheet } from "react-native";
import { BottomSheetFlatList } from "@gorhom/bottom-sheet";
import type { BottomSheetFlatListMethods } from "@gorhom/bottom-sheet";
import type { EdgeInsets } from "react-native-safe-area-context";
import type { GymPlace } from "../../../../lib/poi/types";
import { PAGE_SIZE } from "../constants";
import { GymListItem } from "./GymListItem";
import { GymDetailCard } from "./GymDetailCard";

interface GymListProps {
  gyms: GymPlace[];
  selectedGym: GymPlace | null;
  onSelectGym: (gym: GymPlace) => void;
  onCloseDetail: () => void;
  loading: boolean;
  error: string | null;
  insets: EdgeInsets;
  colors: {
    shellBg: string;
    shellBorder: string;
    iconLabel: string;
    iconInactive: string;
    iconActive: string;
  };
  primary: string;
  primaryBg: string;
  emptyText: string;
}

export function GymList({
  gyms,
  selectedGym,
  onSelectGym,
  onCloseDetail,
  loading,
  error,
  insets,
  colors,
  primary,
  primaryBg,
  emptyText,
}: GymListProps) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const listRef = useRef<BottomSheetFlatListMethods>(null);

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

  const scrollToGym = useCallback(
    (gym: GymPlace) => {
      const i = displayedGyms.findIndex((x) => x.place_id === gym.place_id);
      if (i >= 0) {
        setTimeout(() => listRef.current?.scrollToIndex({ index: i, animated: true }), 200);
      }
    },
    [displayedGyms],
  );

  return (
    <View style={styles.listContainer}>
      {loading && (
        <View style={styles.loadingRow}>
          <ActivityIndicator />
        </View>
      )}
      {error && <Text style={styles.errorText}>{error}</Text>}

      {selectedGym && (
        <GymDetailCard
          gym={selectedGym}
          onClose={onCloseDetail}
          colors={colors}
          primary={primary}
          primaryBg={primaryBg}
        />
      )}

      <View style={styles.listCard}>
        <BottomSheetFlatList<GymPlace>
          ref={listRef}
          data={displayedGyms}
          keyExtractor={(it: GymPlace) => it.place_id}
          keyboardShouldPersistTaps="handled"
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
          contentContainerStyle={[styles.listCardContent, { paddingBottom: insets.bottom + 12 }]}
        />
      </View>
    </View>
  );
}

export type { BottomSheetFlatListMethods as GymListRef };

const styles = StyleSheet.create({
  listContainer: { flex: 1, paddingTop: 8 },
  loadingRow: { paddingVertical: 6 },
  errorText: { color: "#ef4444", marginBottom: 6, textAlign: "center" },
  emptyLabel: { paddingVertical: 12, textAlign: "center", fontSize: 13, color: "#64748b" },
  listCard: { flex: 1, marginTop: 12 },
  listCardContent: { paddingHorizontal: 16, paddingVertical: 4 },
  rowDivider: { height: 1, width: "100%", alignSelf: "center", opacity: 1 },
});
