import React, { useMemo } from "react";
import { View, StyleSheet, Keyboard } from "react-native";
import BottomSheet, { BottomSheetView } from "@gorhom/bottom-sheet";
import { GlassView } from "expo-glass-effect";
import type { SharedValue } from "react-native-reanimated";
import { SNAP_POINTS } from "../constants";
import { GymSearchBar } from "./GymSearchBar";
import { GymList } from "./GymList";
import type { GymPlace } from "../../../../lib/poi/types";
import type { EdgeInsets } from "react-native-safe-area-context";

const CustomBackground = ({ style }: any) => (
  <View
    style={[
      style,
      { backgroundColor: "transparent", borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: "hidden" },
    ]}
  >
    <GlassView glassEffectStyle="regular" style={StyleSheet.absoluteFill} />
  </View>
);

interface GymBottomSheetProps {
  bsRef: React.RefObject<BottomSheet | null>;
  animatedIndex: SharedValue<number>;
  sheetIndex: number;
  onSheetChange: (index: number) => void;
  // Search
  query: string;
  onChangeQuery: (text: string) => void;
  onSubmitSearch: () => void;
  searchPlaceholder: string;
  // List
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
    searchBg: string;
    searchBorder: string;
    searchBorderFocus?: string;
    searchPlaceholder: string;
  };
  primary: string;
  primaryBg: string;
  emptyText: string;
}

export function GymBottomSheet({
  bsRef,
  animatedIndex,
  sheetIndex,
  onSheetChange,
  query,
  onChangeQuery,
  onSubmitSearch,
  searchPlaceholder,
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
}: GymBottomSheetProps) {
  const snapPoints = useMemo(() => SNAP_POINTS, []);

  return (
    <BottomSheet
      ref={bsRef}
      index={sheetIndex}
      snapPoints={snapPoints}
      animatedIndex={animatedIndex}
      animateOnMount
      enablePanDownToClose={false}
      enableOverDrag={false}
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
      onChange={(i) => {
        onSheetChange(i);
        if (i !== 2) Keyboard.dismiss();
      }}
      handleIndicatorStyle={styles.handleBarIndicator}
      backgroundComponent={CustomBackground}
    >
      <BottomSheetView style={styles.sheetInner}>
        <GymSearchBar
          query={query}
          onChangeText={onChangeQuery}
          onSubmitSearch={onSubmitSearch}
          bsRef={bsRef}
          sheetIndex={sheetIndex}
          placeholder={searchPlaceholder}
          colors={colors}
        />

        {sheetIndex > 0 ? (
          <GymList
            gyms={gyms}
            selectedGym={selectedGym}
            onSelectGym={onSelectGym}
            onCloseDetail={onCloseDetail}
            loading={loading}
            error={error}
            insets={insets}
            colors={colors}
            primary={primary}
            primaryBg={primaryBg}
            emptyText={emptyText}
          />
        ) : (
          <View style={{ height: 8 }} />
        )}
      </BottomSheetView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  handleBarIndicator: { backgroundColor: "rgba(0,0,0,0.15)", width: 40 },
  sheetInner: { flex: 1 },
});
