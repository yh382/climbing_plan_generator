import React from "react";
import { View, TextInput, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useThemeColors } from "@/lib/useThemeColors";

export function BlogSearchBar({
  value,
  onChange,
  placeholder = "Search blogs",
}: {
  value: string;
  onChange: (t: string) => void;
  placeholder?: string;
}) {
  const colors = useThemeColors();

  return (
    <View style={[styles.wrap, { backgroundColor: colors.backgroundSecondary }]}>
      <View style={styles.iconWrap}>
        <Ionicons name="search" size={16} color={colors.textTertiary} />
      </View>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.textTertiary}
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
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 11,
    flexDirection: "row",
    alignItems: "center",
  },
  iconWrap: {
    width: 24,
    alignItems: "flex-start",
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: "#111",
    padding: 0,
  },
});
