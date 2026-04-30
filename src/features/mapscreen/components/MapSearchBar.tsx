// src/features/mapscreen/components/MapSearchBar.tsx
// Shared search bar used in TrueSheet `header` slot by gyms-map and crag-map.
// iOS: native UISearchBar over liquid glass. Android: RN TextInput fallback.

import React, { useCallback } from "react";
import { View, TextInput, StyleSheet, Keyboard, Platform, TouchableOpacity } from "react-native";
import { NativeSearchBar } from "../../../../modules/native-input/src";
import { Ionicons } from "@expo/vector-icons";

interface MapSearchBarProps {
  query: string;
  onChangeText: (text: string) => void;
  onSubmitSearch: () => void;
  /** Invoked after query clear + keyboard dismiss when the user taps Cancel.
   *  Used by callers that render the search bar in a collapsible container
   *  (e.g. crag-map sheet header) to collapse back to an icon. */
  onCancel?: () => void;
  /** Focus the search field when rendered (iOS only — uses the underlying
   *  NativeSearchBar `focusOnMount` prop which retries for up to 2s to
   *  work around TrueSheet/modal presentation animation windows). */
  autoFocus?: boolean;
  placeholder: string;
  /** Optional element rendered to the right of the search field (e.g.
   *  an avatar button). When present, the search field flexes to fill
   *  the remaining row width. */
  rightElement?: React.ReactNode;
}

export function MapSearchBar({
  query,
  onChangeText,
  onSubmitSearch,
  onCancel,
  autoFocus,
  placeholder,
  rightElement,
}: MapSearchBarProps) {
  const handleCancel = useCallback(() => {
    onChangeText("");
    Keyboard.dismiss();
    onCancel?.();
  }, [onChangeText, onCancel]);

  const handleChangeText = useCallback(
    (e: { nativeEvent: { text: string } }) => {
      onChangeText(e.nativeEvent.text);
    },
    [onChangeText],
  );

  const handleSubmit = useCallback(() => {
    onSubmitSearch();
  }, [onSubmitSearch]);

  // Android: RN TextInput fallback
  if (Platform.OS !== "ios") {
    return (
      <View style={styles.androidWrap}>
        <View style={styles.androidInputRow}>
          <Ionicons name="search" size={18} color="#9CA3AF" style={{ marginLeft: 12 }} />
          <TextInput
            style={styles.androidInput}
            value={query}
            onChangeText={onChangeText}
            onSubmitEditing={onSubmitSearch}
            placeholder={placeholder}
            placeholderTextColor="#9CA3AF"
            autoCapitalize="none"
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={handleCancel} style={styles.androidClear} activeOpacity={0.7}>
              <Ionicons name="close-circle" size={18} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  // iOS: native UISearchBar
  const searchBar = (
    <NativeSearchBar
      style={styles.searchBar}
      placeholder={placeholder}
      text={query}
      showsCancelButton
      autoCapitalize="none"
      searchFieldHeight={44}
      searchFieldBackgroundColor="FFFFFF26"
      placeholderFontSize={15}
      focusOnMount={autoFocus}
      onChangeText={handleChangeText}
      onSubmitSearch={handleSubmit}
      onCancel={handleCancel}
      onClear={handleCancel}
    />
  );
  return (
    <View style={styles.searchWrap} collapsable={false}>
      {rightElement ? (
        <View style={styles.row}>
          <View style={styles.searchFlex}>{searchBar}</View>
          {rightElement}
        </View>
      ) : (
        searchBar
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // 16pt vertical padding stacks with the 44pt native search field to
  // exactly fill the 76pt COLLAPSED sheet (16+44+16=76). Top padding
  // clears the grabber (ending at y=9) with breathing room. Horizontal
  // 12pt gives the capsule a visible inset from the sheet edges.
  searchWrap: {
    paddingHorizontal: 12,
    paddingTop: 16,
    paddingBottom: 16,
  },
  searchBar: {
    // Must equal searchFieldHeight so the RN wrapper doesn't add invisible
    // vertical padding around the native UISearchBar pill.
    height: 44,
  },
  // Row layout when `rightElement` is supplied (e.g. avatar next to the
  // search field). The search field flexes, the rightElement (typically
  // a 44pt avatar) sits on the right with an 8pt gap.
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  searchFlex: { flex: 1, minWidth: 0 },
  androidWrap: {
    paddingHorizontal: 12,
    paddingTop: 10,
  },
  androidInputRow: {
    flexDirection: "row",
    alignItems: "center",
    height: 48,
    borderRadius: 14,
    backgroundColor: "#F3F4F6",
  },
  androidInput: {
    flex: 1,
    height: 48,
    paddingHorizontal: 10,
    fontSize: 15,
    fontWeight: "600",
    color: "#111",
  },
  androidClear: {
    paddingHorizontal: 12,
    height: 48,
    justifyContent: "center",
  },
});
