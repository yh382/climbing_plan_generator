import React from "react";
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, Image } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Card } from "@components/ui/Card";

export default function Mentions() {
  const router = useRouter();

  const mentions = [
    { id: 1, user: "adam_ondra", action: "mentioned you in a story", time: "2h ago" },
    { id: 2, user: "magnus_mid", action: "mentioned you in a comment", time: "1d ago" },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mentions</Text>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {mentions.map((item) => (
          <Card key={item.id} style={styles.mentionCard}>
             <View style={styles.row}>
                <View style={styles.avatarPlaceholder} />
                <View style={{flex: 1}}>
                    <Text style={styles.mentionText}>
                        <Text style={styles.bold}>{item.user}</Text> {item.action}
                    </Text>
                    <Text style={styles.time}>{item.time}</Text>
                </View>
             </View>
          </Card>
        ))}
        {mentions.length === 0 && (
            <Text style={{textAlign: 'center', color: '#94A3B8', marginTop: 40}}>No mentions yet</Text>
        )}
      </ScrollView>
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
  time: { fontSize: 13, color: '#94A3B8', marginTop: 4 },
});