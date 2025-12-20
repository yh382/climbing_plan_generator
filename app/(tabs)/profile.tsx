// app/(tabs)/profile.tsx
import React, { useState } from "react";
import {
  ScrollView,
  View,
  RefreshControl,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { useUserStore } from "@/store/useUserStore";
import { useProfileStore } from "@/features/profile/store/useProfileStore";
import { useCareerStore } from "@/features/profile/store/useCareerStore";

import { ProfileHeader } from "@/features/profile";
import { UserPersonaSection } from "@/features/profile/components/Persona/UserPersonaSection";
import SlidePage from "@components/slide/SlidePage";
import Settings from "./settings";

// 定义 Tabs
const TABS = [
  { key: "persona", label: "用户画像" },
  { key: "analysis", label: "分析" },
  { key: "posts", label: "动态" },
  { key: "badges", label: "勋章" },
];

export default function ProfileScreen() {
  const { user, loading: userLoading, fetchMe: fetchUser } = useUserStore();
  const { profile, loading: profileLoading, fetchMe: fetchProfile } = useProfileStore();
  const { summary, loading: summaryLoading, fetchSummary } = useCareerStore();
  
  const [showSettings, setShowSettings] = useState(false);
  const [activeTab, setActiveTab] = useState("persona");
  const router = useRouter();

  React.useEffect(() => {
    fetchUser();
    fetchProfile();
    fetchSummary({ range: "all", type: "all", scope: "all" });
  }, []);

  const onRefresh = React.useCallback(async () => {
    await Promise.all([fetchUser(), fetchProfile(), fetchSummary({ range: "all" })]);
  }, []);

  const headerSummary = React.useMemo(() => ({
      level: profile?.anthropometrics?.level,
      home_gym_name: (profile as any)?.preferences?.home_gym_name,
      primary_outdoor_area: profile?.preferences?.primary_outdoor_area,
      bio_from_profile: (profile as any)?.bio ?? null,
      count_total: summary?.count_total ?? 0,
      best_grade_label: summary?.best_grade_label ?? null,
  }), [profile, summary]);

  // --- 各板块内容组件 ---
  const renderContent = () => {
    switch (activeTab) {
      case "persona":
        return (
          <View style={styles.tabContent}>
            <UserPersonaSection />
          </View>
        );
      
      case "analysis":
        return (
          <View style={styles.tabContent}>
            {/* 分析入口卡片 */}
            <TouchableOpacity style={styles.analysisCard} onPress={() => router.push("/analysis")}>
               <View style={{flex: 1}}>
                  <Text style={styles.cardTitle}>Load & Injury</Text>
                  <Text style={styles.cardSub}>点击查看详细负荷与伤病数据</Text>
               </View>
               <View style={styles.chartPlaceholder}>
                  <Ionicons name="stats-chart" size={28} color="#4F46E5" />
               </View>
            </TouchableOpacity>
            
            {/* 可以在这里放一些简略的小数据，比如“本周负荷：高” */}
            <View style={{marginTop: 12, padding: 16, backgroundColor: '#FFF', borderRadius: 12}}>
                <Text style={{color: '#6B7280'}}>更多深度分析正在开发中...</Text>
            </View>
          </View>
        );

      case "posts":
        return (
          <View style={[styles.tabContent, styles.emptyState]}>
             <Ionicons name="images-outline" size={48} color="#D1D5DB" />
             <Text style={styles.emptyText}>暂无动态</Text>
             <TouchableOpacity style={styles.smallBtn}>
                <Text style={styles.smallBtnText}>去发布</Text>
             </TouchableOpacity>
          </View>
        );

      case "badges":
        return (
          <View style={styles.tabContent}>
             <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
                <View style={styles.badgeItem}><Text style={{fontSize: 28}}>🧗</Text><Text style={styles.badgeName}>首攀</Text></View>
                <View style={[styles.badgeItem, {opacity: 0.5}]}><Text style={{fontSize: 28}}>🔒</Text><Text style={styles.badgeName}>百次</Text></View>
                <View style={[styles.badgeItem, {opacity: 0.5}]}><Text style={{fontSize: 28}}>🔒</Text><Text style={styles.badgeName}>V8</Text></View>
             </View>
          </View>
        );
      
      default:
        return null;
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#FAFAFA" }}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={false} onRefresh={onRefresh} />}
        contentContainerStyle={{ paddingBottom: 100 }}
        stickyHeaderIndices={[1]} // [关键] 索引 1 (TabBar) 将会吸顶
      >
        {/* Index 0: 头部 */}
        <ProfileHeader
          user={user}
          summary={headerSummary}
          loading={userLoading || profileLoading}
          onEditAvatar={() => setShowSettings(true)}
          onEditUsername={() => setShowSettings(true)}
        />

        {/* Index 1: 吸顶 Tab 栏 */}
        <View style={styles.stickyTabBarContainer}>
          <View style={styles.tabBar}>
            {TABS.map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <TouchableOpacity 
                  key={tab.key} 
                  onPress={() => setActiveTab(tab.key)}
                  style={[styles.tabItem, isActive && styles.tabItemActive]}
                >
                  <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                    {tab.label}
                  </Text>
                  {isActive && <View style={styles.activeLine} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Index 2: 内容区 */}
        {renderContent()}

      </ScrollView>

      <SlidePage visible={showSettings} onClose={() => setShowSettings(false)} direction="left">
        <Settings />
      </SlidePage>
    </View>
  );
}

const styles = StyleSheet.create({
  stickyTabBarContainer: { backgroundColor: '#FAFAFA', paddingBottom: 8 },
  tabBar: { flexDirection: 'row', backgroundColor: '#FFFFFF', marginHorizontal: 16, borderRadius: 12, padding: 4, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  tabItem: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 8 },
  tabItemActive: { backgroundColor: '#F3F4F6' },
  tabText: { fontSize: 13, color: '#6B7280', fontWeight: '600' },
  tabTextActive: { color: '#111827' },
  activeLine: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#111827', position: 'absolute', bottom: 4 },
  
  tabContent: { marginTop: 12, paddingHorizontal: 16 },
  
  analysisCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', borderWidth: 0.5, borderColor: '#E5E7EB', shadowColor: "#000", shadowOpacity: 0.02, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#111' },
  cardSub: { fontSize: 12, color: '#9CA3AF', marginTop: 4 },
  chartPlaceholder: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center' },
  
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  emptyText: { color: '#9CA3AF', marginTop: 8, marginBottom: 16 },
  smallBtn: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#111827', borderRadius: 20 },
  smallBtnText: { fontSize: 12, color: '#FFF', fontWeight: '600' },
  
  badgeItem: { alignItems: 'center', gap: 4 },
  badgeName: { fontSize: 12, color: '#4B5563', fontWeight: '600' }
});