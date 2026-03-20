import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

export default function DetailedAnalysisCard() {
  const router = useRouter();

  return (
    <TouchableOpacity
      style={s.card}
      onPress={() => router.push("/analysis")}
      activeOpacity={0.85}
    >
      <View style={s.left}>
        <MaterialCommunityIcons name="chart-box-outline" size={22} color="#00665E" />
        <Text style={s.text}>View Detailed Analysis</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#999" />
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "#E9E9E9",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  left: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  text: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111",
  },
});
