import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { GlassView } from "expo-glass-effect";

export default function SectionBlock({
  title,
  right,
  children,
}: {
  title: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.wrap}>
      <GlassView glassEffectStyle="regular" style={StyleSheet.absoluteFill} />
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        {right ? <View style={{ marginLeft: 10 }}>{right}</View> : null}
      </View>
      <View style={styles.body}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 14,
    marginHorizontal: 16,
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.65)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.55)",
  },
  header: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: { fontSize: 14, fontWeight: "800", color: "#111" },
  body: { paddingHorizontal: 14, paddingBottom: 14 },
});
