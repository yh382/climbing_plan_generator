import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { GlassView } from "expo-glass-effect";

export type RankingUser = {
  userId: string;
  name: string;
  avatarUri?: string;
  points: number;
  gender: "male" | "female" | "other";
  isFollowing: boolean;
};

export default function RankingRowCard({
  rank,
  user,
  onPress,
}: {
  rank: number;
  user: RankingUser;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity activeOpacity={0.9} onPress={onPress} style={styles.card}>
      <GlassView glassEffectStyle="regular" style={StyleSheet.absoluteFill} />

      <View style={styles.left}>
        <Text style={styles.rank}>{rank}</Text>

        <View style={styles.avatar}>
          <Ionicons name="person" size={16} color="#9CA3AF" />
        </View>

        <View style={{ flex: 1 }}>
          <Text style={styles.name} numberOfLines={1}>
            {user.name}
          </Text>
          <Text style={styles.sub} numberOfLines={1}>
            {user.isFollowing ? "Following" : "—"}
          </Text>
        </View>
      </View>

      <View style={styles.right}>
        <Text style={styles.points}>{user.points}</Text>
        <Text style={styles.pointsLabel}>pts</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    height: 66,
    borderRadius: 16,
    overflow: "hidden",
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(255,255,255,0.65)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.55)",
  },
  left: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  rank: { width: 24, textAlign: "center", fontSize: 15, fontWeight: "900", color: "#111" },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(17,17,17,0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
  name: { fontSize: 14, fontWeight: "800", color: "#111" },
  sub: { fontSize: 12, fontWeight: "700", color: "#6B7280", marginTop: 2 },
  right: { alignItems: "flex-end" },
  points: { fontSize: 16, fontWeight: "900", color: "#111" },
  pointsLabel: { fontSize: 11, fontWeight: "800", color: "#6B7280", marginTop: 1 },
});
