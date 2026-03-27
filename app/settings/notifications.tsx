import React, { useState, useEffect, useLayoutEffect } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { useNavigation } from "@react-navigation/native";
import { Host, Button as SUIButton } from "@expo/ui/swift-ui";
import { frame, buttonStyle, labelStyle } from "@expo/ui/swift-ui/modifiers";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Card } from "@components/ui/Card";
import { Segmented } from "@components/ui/Segmented";
import { communityApi } from "../../src/features/community/api";

const NOTIF_PREFS_CACHE_KEY = "@notification_prefs";

// 1. 定义接口解决 TS 报错
interface SettingRowProps {
  label: string;
  value: string;
  options: { label: string; value: string }[];
  onChange: (val: string) => void;
  last?: boolean;
}

type NotifSettings = {
  likes: string;
  followers: string;
  comments: string;
  mentions: string;
  challenges: string;
  events: string;
};

const prefsToSettings = (prefs: Record<string, boolean>): NotifSettings => ({
  likes: prefs.likes ? "On" : "Off",
  followers: prefs.followers ? "On" : "Off",
  comments: prefs.comments ? "On" : "Off",
  mentions: prefs.mentions ? "On" : "Off",
  challenges: prefs.challenges ? "On" : "Off",
  events: prefs.events ? "On" : "Off",
});

const DEFAULT_SETTINGS: NotifSettings = {
  likes: "On", followers: "On", comments: "On",
  mentions: "On", challenges: "On", events: "On",
};

export default function NotificationsSettings() {
  const router = useRouter();
  const navigation = useNavigation();

  const [settings, setSettings] = useState<NotifSettings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTransparent: true,
      scrollEdgeEffects: { top: "soft" },
      headerLeft: () => (
        <Host matchContents>
          <SUIButton
            systemImage={"chevron.backward" as any}
            label=""
            onPress={() => router.canGoBack() ? router.back() : router.navigate("/(tabs)/profile")}
            modifiers={[buttonStyle("plain"), labelStyle("iconOnly"), frame({ width: 34, height: 34, alignment: "center" })]}
          />
        </Host>
      ),
    });
  }, [navigation, router]);

  // Load from cache first, then backend
  useEffect(() => {
    (async () => {
      // 1) Read from AsyncStorage cache (fast, ~ms)
      try {
        const cached = await AsyncStorage.getItem(NOTIF_PREFS_CACHE_KEY);
        if (cached) {
          setSettings(JSON.parse(cached));
          setLoaded(true);
        }
      } catch (_) {}

      // 2) Fetch from backend for latest values
      try {
        const prefs = await communityApi.getNotificationPreferences();
        const fresh = prefsToSettings(prefs);
        setSettings(fresh);
        setLoaded(true);
        await AsyncStorage.setItem(NOTIF_PREFS_CACHE_KEY, JSON.stringify(fresh));
      } catch (_) {
        // If backend fails but we have cache, keep it; otherwise use defaults
        setLoaded(true);
      }
    })();
  }, []);

  // Persist to backend + cache on toggle
  const toggle = async (key: keyof NotifSettings, val: string) => {
    const prev = settings[key];
    const updated = { ...settings, [key]: val };
    setSettings(updated);
    AsyncStorage.setItem(NOTIF_PREFS_CACHE_KEY, JSON.stringify(updated));
    try {
      await communityApi.updateNotificationPreferences({ [key]: val === "On" });
    } catch (e) {
      // Revert on error
      const reverted = { ...settings, [key]: prev };
      setSettings(reverted);
      AsyncStorage.setItem(NOTIF_PREFS_CACHE_KEY, JSON.stringify(reverted));
    }
  };

  const options = [{ label: "On", value: "On" }, { label: "Off", value: "Off" }];

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic"
        style={{ opacity: loaded ? 1 : 0 }}
      >
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
          />
        </Card>

        <Text style={styles.sectionTitle}>Activity Notifications</Text>
        <Card style={styles.card}>
          <SettingRow
            label="Challenges"
            value={settings.challenges}
            options={options}
            onChange={(v: string) => toggle('challenges', v)}
          />
          <SettingRow
            label="Events"
            value={settings.events}
            options={options}
            onChange={(v: string) => toggle('events', v)}
            last
          />
        </Card>
      </ScrollView>
    </View>
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