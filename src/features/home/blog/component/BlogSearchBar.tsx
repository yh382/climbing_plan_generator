import React from "react";
import { View, TextInput, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export function BlogSearchBar({
  value,
  onChange,
  placeholder = "Search blogs",
}: {
  value: string;
  onChange: (t: string) => void;
  placeholder?: string;
}) {
  return (
    <View style={styles.wrap}>
      <View style={styles.iconWrap}>
        <Ionicons name="search" size={18} color="#6B7280" />
      </View>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor="#9CA3AF"
        style={styles.input}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    height: 44,
    borderRadius: 14,
    backgroundColor: "#F3F4F6",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(17,17,17,0.08)",
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  iconWrap: {
    width: 28,
    alignItems: "flex-start",
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: "#111",
  },
});
