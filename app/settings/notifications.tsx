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

export default function NotificationsSettings() {
  const router = useRouter();

  const [settings, setSettings] = useState({
    likes: "On",
    followers: "On",
    comments: "On",
    mentions: "On",
  });

  // 显式指定 key 类型
  const toggle = (key: keyof typeof settings, val: string) => {
    setSettings(prev => ({ ...prev, [key]: val }));
  };

  const options = [{ label: "On", value: "On" }, { label: "Off", value: "Off" }];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionTitle}>Engagement Notifications</Text>
        <Card style={styles.card}>
          {/* 显式类型声明 (v: string) 解决报错 */}
          <SettingRow 
            label="Likes & Saves" 
            value={settings.likes} 
            options={options} 
            onChange={(v: string) => toggle('likes', v)} 
          />
          <SettingRow 
            label="New Followers" 
            value={settings.followers} 
            options={options} 
            onChange={(v: string) => toggle('followers', v)} 
          />
          <SettingRow 
            label="Comments" 
            value={settings.comments} 
            options={options} 
            onChange={(v: string) => toggle('comments', v)} 
          />
          <SettingRow 
            label="Mentions (@)" 
            value={settings.mentions} 
            options={options} 
            onChange={(v: string) => toggle('mentions', v)} 
            last 
          />
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

// 内部组件
const SettingRow = ({ label, value, options, onChange, last }: SettingRowProps) => (
  <View style={[styles.row, last && styles.noBorder]}>
    <Text style={styles.label}>{label}</Text>
    {/* 调整宽度：100 对于 On/Off 足够了，看起来更精致 */}
    <View style={{ width: 153 }}>
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
  // [关键修改] 与 settings 主页完全一致的 Card 样式
  card: { 
    borderRadius: 10, 
    backgroundColor: "#FFF", 
    overflow: "hidden",
    padding: 0 // 移除默认 padding
  },
  // [关键修改] 统一行高 paddingVertical: 11
  row: { 
    flexDirection: "row", 
    alignItems: "center", 
    justifyContent: "space-between", 
    paddingVertical: 10, // 对应 settings 的 displayRowHeight
    paddingHorizontal: 16, 
    borderBottomWidth: StyleSheet.hairlineWidth, 
    borderBottomColor: "#C6C6C8", 
    backgroundColor: '#FFF' 
  },
  noBorder: { borderBottomWidth: 0 },
  label: { fontSize: 16, color: "#000" },
});