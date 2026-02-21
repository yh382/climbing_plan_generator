import React from "react";
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, Image, Dimensions } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

// 屏幕宽度 / 3 实现一行三个
const itemWidth = (Dimensions.get('window').width - 4) / 3; // 减去微小间隙

export default function SavedPosts() {
  const router = useRouter();
  
  // Mock Data
  const posts = Array.from({ length: 12 }).map((_, i) => ({
    id: i,
    image: `https://picsum.photos/200/200?random=${i}`, // 随机图
  }));

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Saved</Text>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.grid}>
          {posts.map((post) => (
            <TouchableOpacity key={post.id} style={styles.item}>
               <Image source={{ uri: post.image }} style={styles.image} />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFF" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, height: 48, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  headerBtn: { width: 40 },
  headerTitle: { fontSize: 17, fontWeight: "600" },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 2 }, // gap: 2 需要新版 RN，如果不支持可用 margin
  item: { width: itemWidth, height: itemWidth, backgroundColor: '#eee', marginBottom: 2 },
  image: { width: '100%', height: '100%' },
});