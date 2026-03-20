import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, Image, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Card } from "@components/ui/Card";
import { communityApi } from "../../src/features/community/api";
import type { MentionOut } from "../../src/features/community/types";

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function Mentions() {
  const router = useRouter();
  const [mentions, setMentions] = useState<MentionOut[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await communityApi.getMentions();
        setMentions(data);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mentions</Text>
        <View style={styles.headerBtn} />
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {mentions.map((item) => (
            <Card key={item.id} style={styles.mentionCard}>
              <View style={styles.row}>
                {item.mentionerAvatar ? (
                  <Image source={{ uri: item.mentionerAvatar }} style={styles.avatarPlaceholder} />
                ) : (
                  <View style={styles.avatarPlaceholder} />
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.mentionText}>
                    <Text style={styles.bold}>{item.mentionerName}</Text>{" "}
                    mentioned you in a {item.contentType}
                  </Text>
                  {item.contentPreview ? (
                    <Text style={styles.preview} numberOfLines={1}>{item.contentPreview}</Text>
                  ) : null}
                  <Text style={styles.time}>{timeAgo(item.createdAt)}</Text>
                </View>
              </View>
            </Card>
          ))}
          {mentions.length === 0 && (
            <Text style={{ textAlign: 'center', color: '#94A3B8', marginTop: 40 }}>No mentions yet</Text>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F2F2F6" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, height: 48, backgroundColor: "#F2F2F6" },
  headerBtn: { width: 40 },
  headerTitle: { fontSize: 17, fontWeight: "600" },
  content: { padding: 16 },
  mentionCard: { padding: 16, marginBottom: 12, borderRadius: 12, backgroundColor: '#FFF' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatarPlaceholder: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#CBD5E1' },
  mentionText: { fontSize: 15, color: '#1E293B', lineHeight: 20 },
  bold: { fontWeight: '600' },
  preview: { fontSize: 13, color: '#64748B', marginTop: 2 },
  time: { fontSize: 13, color: '#94A3B8', marginTop: 4 },
});
