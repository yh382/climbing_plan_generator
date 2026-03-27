import React, { useCallback } from "react";
import { View, StyleSheet, Keyboard, Platform } from "react-native";
import { NativeSearchBar } from "../../../../modules/native-input/src";

interface GymSearchBarProps {
  query: string;
  onChangeText: (text: string) => void;
  onSubmitSearch: () => void;
  placeholder: string;
}

export function GymSearchBar({
  query,
  onChangeText,
  onSubmitSearch,
  placeholder,
}: GymSearchBarProps) {
  const handleCancel = useCallback(() => {
    onChangeText("");
    Keyboard.dismiss();
  }, [onChangeText]);

  const handleChangeText = useCallback(
    (e: { nativeEvent: { text: string } }) => {
      onChangeText(e.nativeEvent.text);
    },
    [onChangeText],
  );

  const handleSubmit = useCallback(
    (e: { nativeEvent: { text: string } }) => {
      onSubmitSearch();
    },
    [onSubmitSearch],
  );

  // iOS: native UISearchBar — Android: fall back to previous implementation
  if (Platform.OS !== "ios") {
    // TODO: Android fallback (keep RN TextInput)
    return null;
  }

  return (
    <View style={styles.searchWrap} collapsable={false}>
      <NativeSearchBar
        style={styles.searchBar}
        placeholder={placeholder}
        text={query}
        showsCancelButton
        autoCapitalize="none"
        searchFieldHeight={48}
        onChangeText={handleChangeText}
        onSubmitSearch={handleSubmit}
        onCancel={handleCancel}
        onClear={handleCancel}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  searchWrap: {
    paddingHorizontal: 8,
    paddingTop: 10,
  },
  searchBar: {
    height: 66,
  },
});
