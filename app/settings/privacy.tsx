import React, { useState } from "react";
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Card } from "@components/ui/Card";
import { Segmented } from "@components/ui/Segmented";

// 1. 定义接口解决 TS 报错
interface SettingRowProps {
  label: string;
  value: string;
  options: { label: string; value: string }[];
  onChange: (val: string) => void;
  last?: boolean;
}

export default function PrivacySettings() {
  const router = useRouter();
  const [visibility, setVisibility] = useState({
    posts: "Public",
    body: "Private",
    analysis: "Public",
    plans: "Public",
    badges: "Public",
  });

  const toggle = (key: string, val: string) => setVisibility(prev => ({ ...prev, [key]: val }));
  const options = [{ label: "Public", value: "Public" }, { label: "Private", value: "Private" }];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy</Text>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionTitle}>Profile</Text>
        <Card style={styles.card}>
          {/* 显式类型声明 (v: string) */}
          <SettingRow 
            label="My Posts" 
            value={visibility.posts} 
            onChange={(v: string) => toggle('posts', v)} 
            options={options} 
          />
          <SettingRow 
            label="My Body Info" 
            value={visibility.body} 
            onChange={(v: string) => toggle('body', v)} 
            options={options} 
          />
          <SettingRow 
            label="My Analysis" 
            value={visibility.analysis} 
            onChange={(v: string) => toggle('analysis', v)} 
            options={options} 
          />
          <SettingRow 
            label="My Plans" 
            value={visibility.plans} 
            onChange={(v: string) => toggle('plans', v)} 
            options={options} 
          />
          <SettingRow 
            label="My Badges" 
            value={visibility.badges} 
            onChange={(v: string) => toggle('badges', v)} 
            options={options} 
            last 
          />
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const SettingRow = ({ label, value, options, onChange, last }: SettingRowProps) => (
  <View style={[styles.row, last && styles.noBorder]}>
    <Text style={styles.label}>{label}</Text>
    {/* 调整宽度：130 足够容纳 Public/Private */}
    <View style={{ width: 158 }}> 
      <Segmented value={value} onChange={onChange} options={options} />
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F2F2F6" },
  header: { 
    flexDirection: "row", 
    alignItems: "center", 
    justifyContent: "space-between", 
    paddingHorizontal: 16, 
    height: 48 
  },
  headerBtn: { width: 40 },
  headerTitle: { fontSize: 17, fontWeight: "600" },
  content: { paddingHorizontal: 16 },
  sectionTitle: { 
    fontSize: 13, 
    color: "#6D6D72", 
    marginBottom: 6, 
    marginLeft: 12, 
    marginTop: 16 
  },
  // 统一样式
  card: { 
    borderRadius: 10, 
    backgroundColor: "#FFF", 
    overflow: "hidden", 
    padding: 0 
  },
  row: { 
    flexDirection: "row", 
    alignItems: "center", 
    justifyContent: "space-between", 
    paddingVertical: 11, 
    paddingHorizontal: 16, 
    borderBottomWidth: StyleSheet.hairlineWidth, 
    borderBottomColor: "#C6C6C8", 
    backgroundColor: '#FFF' 
  },
  noBorder: { borderBottomWidth: 0 },
  label: { fontSize: 16, color: "#000" },
});