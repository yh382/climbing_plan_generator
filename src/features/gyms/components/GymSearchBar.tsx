import React, { useRef, useState, useEffect } from "react";
import { View, TextInput, TouchableOpacity, StyleSheet, Keyboard } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type BottomSheet from "@gorhom/bottom-sheet";

interface GymSearchBarProps {
  query: string;
  onChangeText: (text: string) => void;
  onSubmitSearch: () => void;
  bsRef: React.RefObject<BottomSheet | null>;
  sheetIndex: number;
  placeholder: string;
  colors: {
    searchBg: string;
    searchBorder: string;
    searchBorderFocus?: string;
    searchPlaceholder: string;
    iconLabel: string;
    iconInactive: string;
    shellBorder: string;
  };
}

export function GymSearchBar({
  query,
  onChangeText,
  onSubmitSearch,
  bsRef,
  sheetIndex,
  placeholder,
  colors,
}: GymSearchBarProps) {
  const inputRef = useRef<TextInput>(null);
  const [searchFocused, setSearchFocused] = useState(false);
  const [showClear, setShowClear] = useState(false);

  useEffect(() => {
    if (sheetIndex < 2) setShowClear(false);
  }, [sheetIndex]);

  return (
    <View style={[styles.searchWrap, { paddingHorizontal: 16 }]}>
      <View
        style={[
          styles.searchRow,
          {
            backgroundColor: colors.searchBg,
            borderColor: searchFocused ? (colors.searchBorderFocus ?? colors.searchBorder) : colors.searchBorder,
            borderWidth: StyleSheet.hairlineWidth,
          },
        ]}
      >
        <Ionicons name="search" size={18} color={colors.searchPlaceholder} style={styles.searchIcon} />
        <TextInput
          ref={inputRef}
          value={query}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.searchPlaceholder}
          style={[styles.searchInput, { color: colors.iconLabel }]}
          returnKeyType="search"
          onSubmitEditing={onSubmitSearch}
          onPressIn={() => {}}
          onPressOut={() => {
            if (sheetIndex !== 2) {
              bsRef.current?.snapToIndex(2);
              inputRef.current?.focus();
            }
            setShowClear(true);
          }}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
          autoCorrect={false}
        />
      </View>

      {showClear && (
        <TouchableOpacity
          onPress={() => {
            onChangeText("");
            Keyboard.dismiss();
            setShowClear(false);
            bsRef.current?.snapToIndex(0);
          }}
          activeOpacity={0.85}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          style={[
            styles.searchClearOutside,
            { backgroundColor: colors.searchBg, borderColor: colors.shellBorder },
          ]}
        >
          <Ionicons name="close" size={18} color={colors.iconInactive} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  searchWrap: { flexDirection: "row", alignItems: "center" },
  searchRow: {
    flex: 1,
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    borderRadius: 24,
  },
  searchIcon: { marginRight: 12 },
  searchInput: { flex: 1, fontSize: 16, paddingVertical: 0 },
  searchClearOutside: {
    marginLeft: 8,
    height: 48,
    width: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
});
