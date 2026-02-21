import React from "react";
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, Image } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function BlockedUsers() {
  const router = useRouter();

  const blockedUsers = [
    { id: 1, name: "Spammer123", avatar: "https://i.pravatar.cc/150?u=1" },
    { id: 2, name: "MeanClimber", avatar: "https://i.pravatar.cc/150?u=2" },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Blocked</Text>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {blockedUsers.map(user => (
          <View key={user.id} style={styles.userRow}>
            <View style={styles.userInfo}>
              <Image source={{ uri: user.avatar }} style={styles.avatar} />
              <Text style={styles.userName}>{user.name}</Text>
            </View>
            <TouchableOpacity style={styles.unblockBtn}>
              <Text style={styles.unblockText}>Unblock</Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFF" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, height: 48, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  headerBtn: { width: 40 },
  headerTitle: { fontSize: 17, fontWeight: "600" },
  content: { padding: 16 },
  userRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  userInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#eee' },
  userName: { fontSize: 16, fontWeight: '500' },
  unblockBtn: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#F1F5F9', borderRadius: 16 },
  unblockText: { fontSize: 13, fontWeight: '600', color: '#0F172A' },
});