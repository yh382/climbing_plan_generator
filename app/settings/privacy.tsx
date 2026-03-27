import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, SafeAreaView, ScrollView, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { HeaderButton } from "../../src/components/ui/HeaderButton";
import { Card } from "@components/ui/Card";
import { Segmented } from "@components/ui/Segmented";
import { profileApi } from "../../src/features/profile/api";

interface SettingRowProps {
  label: string;
  value: string;
  options: { label: string; value: string }[];
  onChange: (val: string) => void;
  last?: boolean;
}

const FIELD_MAP: Record<string, string> = {
  posts: "posts_public",
  body: "body_info_public",
  analysis: "analysis_public",
  plans: "plans_public",
  badges: "badges_public",
};

export default function PrivacySettings() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [visibility, setVisibility] = useState({
    posts: "Public",
    body: "Private",
    analysis: "Public",
    plans: "Public",
    badges: "Public",
  });

  useEffect(() => {
    profileApi.getPrivacy().then((data) => {
      setVisibility({
        posts: data.posts_public ? "Public" : "Private",
        body: data.body_info_public ? "Public" : "Private",
        analysis: data.analysis_public ? "Public" : "Private",
        plans: data.plans_public ? "Public" : "Private",
        badges: data.badges_public ? "Public" : "Private",
      });
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const toggle = (key: string, val: string) => {
    setVisibility(prev => ({ ...prev, [key]: val }));
    const apiField = FIELD_MAP[key];
    if (apiField) {
      profileApi.updatePrivacy({ [apiField]: val === "Public" }).catch(() => {});
    }
  };

  const options = [{ label: "Public", value: "Public" }, { label: "Private", value: "Private" }];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <HeaderButton icon="chevron.backward" onPress={() => router.canGoBack() ? router.back() : router.navigate("/(tabs)/profile")} />
        <Text style={styles.headerTitle}>Privacy</Text>
        <View style={styles.headerBtn} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#999" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.sectionTitle}>Profile</Text>
          <Card style={styles.card}>
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
      )}
    </SafeAreaView>
  );
}

const SettingRow = ({ label, value, options, onChange, last }: SettingRowProps) => (
  <View style={[styles.row, last && styles.noBorder]}>
    <Text style={styles.label}>{label}</Text>
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
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  sectionTitle: {
    fontSize: 13,
    color: "#6D6D72",
    marginBottom: 6,
    marginLeft: 12,
    marginTop: 16
  },
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
