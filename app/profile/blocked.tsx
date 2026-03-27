import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, Image, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { HeaderButton } from "../../src/components/ui/HeaderButton";
import { communityApi } from "../../src/features/community/api";
import type { BlockedUserOut } from "../../src/features/community/types";

export default function BlockedUsers() {
  const router = useRouter();
  const [blockedUsers, setBlockedUsers] = useState<BlockedUserOut[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await communityApi.getBlockedUsers();
        setBlockedUsers(data);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleUnblock = async (userId: string) => {
    await communityApi.unblockUser(userId);
    setBlockedUsers(prev => prev.filter(u => u.userId !== userId));
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <HeaderButton icon="chevron.backward" onPress={() => router.back()} />
        <Text style={styles.headerTitle}>Blocked</Text>
        <View style={styles.headerBtn} />
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {blockedUsers.length === 0 && (
            <Text style={{ textAlign: "center", color: "#94A3B8", marginTop: 40 }}>No blocked users</Text>
          )}
          {blockedUsers.map(user => (
            <View key={user.id} style={styles.userRow}>
              <View style={styles.userInfo}>
                {user.avatarUrl ? (
                  <Image source={{ uri: user.avatarUrl }} style={styles.avatar} />
                ) : (
                  <View style={[styles.avatar, { backgroundColor: "#CBD5E1" }]} />
                )}
                <Text style={styles.userName}>{user.username}</Text>
              </View>
              <TouchableOpacity style={styles.unblockBtn} onPress={() => handleUnblock(user.userId)}>
                <Text style={styles.unblockText}>Unblock</Text>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}
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
