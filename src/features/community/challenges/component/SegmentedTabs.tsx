import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { GlassView } from "expo-glass-effect";

export default function SegmentedTabs<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: Array<{ key: T; label: string }>;
  onChange: (v: T) => void;
}) {
  return (
    <View style={styles.wrap}>
      <GlassView glassEffectStyle="regular" style={StyleSheet.absoluteFill} />
      {options.map((opt) => {
        const active = opt.key === value;
        return (
          <TouchableOpacity
            key={opt.key}
            style={[styles.item, active && styles.itemActive]}
            activeOpacity={0.85}
            onPress={() => onChange(opt.key)}
          >
            <Text style={[styles.text, active ? styles.textActive : styles.textInactive]}>{opt.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    borderRadius: 14,
    overflow: "hidden",
    height: 36,
    backgroundColor: "rgba(255,255,255,0.55)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.45)",
  },
  item: { flex: 1, alignItems: "center", justifyContent: "center" },
  itemActive: { backgroundColor: "rgba(17,17,17,0.08)" },
  text: { fontSize: 13, fontWeight: "800" },
  textActive: { color: "#111" },
  textInactive: { color: "#6B7280" },
});
