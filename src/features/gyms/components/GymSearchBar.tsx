import React, { useCallback } from "react";
import { View, TextInput, StyleSheet, Keyboard, Platform, TouchableOpacity, Text } from "react-native";
import { NativeSearchBar } from "../../../../modules/native-input/src";
import { Ionicons } from "@expo/vector-icons";

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
