import React from "react";
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Card } from "@components/ui/Card";

export default function MyComments() {
  const router = useRouter();

  const comments = [
    { id: 1, text: "Great beta! Helps a lot.", fromUser: "alex_honnold", fromPostId: "Winter Send" },
    { id: 2, text: "Which shoes are those?", fromUser: "tommy_caldwell", fromPostId: "New Gear" },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Comments</Text>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {comments.map(c => (
          <Card key={c.id} style={styles.commentCard}>
            <Text style={styles.commentText}>{c.text}</Text>
            <View style={styles.divider} />
            <Text style={styles.fromText}>
              from <Text style={{fontWeight: '600'}}>{c.fromUser}</Text>'s post
            </Text>
          </Card>
        ))}
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
  commentCard: { padding: 16, marginBottom: 12, borderRadius: 12, backgroundColor: '#FFF' },
  commentText: { fontSize: 16, color: '#1E293B', marginBottom: 12 },
  divider: { height: 1, backgroundColor: '#F1F5F9', marginBottom: 10 },
  fromText: { fontSize: 13, color: '#64748B' },
});