import React from "react";
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { HeaderButton } from "../../src/components/ui/HeaderButton";
import { Card } from "@components/ui/Card";

export default function AboutSettings() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <HeaderButton icon="chevron.backward" onPress={() => router.canGoBack() ? router.back() : router.navigate("/(tabs)/profile")} />
        <Text style={styles.headerTitle}>About</Text>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Card style={styles.card}>
          <NavRow label="ClimMate & Your Data" route="/settings/data-policy" />
          <NavRow label="Terms of Service" route="/settings/terms" last />
        </Card>
        
        <Text style={styles.version}>Version 1.0.0 (Build 2025)</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const NavRow = ({ label, route, last }: any) => (
  <TouchableOpacity style={[styles.row, last && styles.noBorder]} onPress={() => console.log("Go to", route)}>
    <Text style={styles.label}>{label}</Text>
    <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F2F2F6" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, height: 48 },
  headerBtn: { width: 40 },
  headerTitle: { fontSize: 17, fontWeight: "600" },
  content: { padding: 16, marginTop: 10 },
  card: { borderRadius: 10, backgroundColor: "#FFF", overflow: "hidden" },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 16, paddingHorizontal: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#C6C6C8", backgroundColor: '#FFF' },
  noBorder: { borderBottomWidth: 0 },
  label: { fontSize: 16, color: "#000" },
  version: { textAlign: 'center', marginTop: 24, color: '#94A3B8', fontSize: 13 },
});