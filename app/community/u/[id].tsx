// app/community/u/[id].tsx

import React, { useState, useRef } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Dimensions, // [新增] 引入 Dimensions 用于精确计算
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
// [保持原样] 保留您的原始引用
import { useI18N } from "../../../lib/i18n";

import TopBar from "../../../components/TopBar";
import FeedPost from "../../../src/features/community/components/FeedPost";

/* ---------------- Mock Data ---------------- */

const USER_PROFILE = {
  id: "u1",
  name: "Adam Ondra",
  username: "@adam.ondra",
  avatar: "https://i.pravatar.cc/150?u=ao",
  location: "Brno, CZ",
  homeGym: "Hanger Brno",
  stats: {
    boulderMax: "V17",
    routeMax: "5.15d",
    totalSends: 1420,
    followers: "45k",
    following: 120,
  },
};

const MOCK_USER_POSTS = [
  {
    id: "p1",
    user: {
      id: "u1",
      username: "Adam Ondra",
      avatar: "https://i.pravatar.cc/150?u=ao",
      homeGym: "Hanger Brno",
    },
    timestamp: new Date().toISOString(),
    content: "Projecting hard today! This overhang is brutal but fun. The crux move requires insane core tension.",
    likes: 120,
    comments: 15,
    isLiked: false,
    isSaved: false,
  },
  {
    id: "p2",
    user: {
      id: "u1",
      username: "Adam Ondra",
      avatar: "https://i.pravatar.cc/150?u=ao",
    },
    timestamp: new Date(Date.now() - 86400000).toISOString(),
    content: "Rest day visualization. Sometimes the mind needs to climb before the body does.",
    likes: 85,
    comments: 8,
    isLiked: true,
    isSaved: false,
  },
  {
    id: "p3",
    user: {
      id: "u1",
      username: "Adam Ondra",
      avatar: "https://i.pravatar.cc/150?u=ao",
    },
    timestamp: new Date(Date.now() - 172800000).toISOString(),
    content: "Throwback to Norway. What a line! Silence is still one of my proudest achievements.",
    images: ["https://images.unsplash.com/photo-1522163182402-834f871fd851?auto=format&fit=crop&w=800&q=80"],
    likes: 3420,
    comments: 156,
    isLiked: false,
    isSaved: true,
  },
];

const MOCK_LOGS = [
  { id: "l1", name: "Silence", grade: "9c / 5.15d", type: "Sport", date: "Oct 12", status: "Sent" },
  { id: "l2", name: "La Dura Dura", grade: "9b+ / 5.15c", type: "Sport", date: "Sep 28", status: "Repeat" },
  { id: "l3", name: "Terranova", grade: "8C+ / V16", type: "Boulder", date: "Aug 15", status: "Sent" },
  { id: "l4", name: "Change", grade: "9b+ / 5.15c", type: "Sport", date: "Jul 10", status: "Sent" },
  { id: "l5", name: "Vasil Vasil", grade: "9b+ / 5.15c", type: "Sport", date: "Jun 22", status: "Sent" },
];

/* ---------------- Screen ---------------- */

// [新增] 获取屏幕宽度，计算每个 Tab 的精确宽度
const SCREEN_WIDTH = Dimensions.get('window').width;
const TAB_WIDTH = SCREEN_WIDTH / 3;

export default function PublicProfileScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { tt, tr } = useI18N();

  const tabs = [
    { key: "Posts", label: tt({ zh: "动态", en: "Posts" }) },
    { key: "Plans", label: tt({ zh: "计划", en: "Plans" }) },
    { key: "Logs",  label: tt({ zh: "记录", en: "Logs" }) },
  ];

  const [activeTab, setActiveTab] = useState<string>("Posts");

  /* underline 动画 */
  const indicator = useRef(new Animated.Value(0)).current;

  const onTabPress = (index: number, key: string) => {
    setActiveTab(key);
    Animated.spring(indicator, {
      toValue: index,
      useNativeDriver: true,
      stiffness: 180,
      damping: 20,
      mass: 0.4,
    }).start();
  };

  // [修改] 使用精确像素值进行插值
  const translateX = indicator.interpolate({
    inputRange: [0, 1, 2],
    outputRange: [0, TAB_WIDTH, TAB_WIDTH * 2], // 0 -> 1/3屏 -> 2/3屏
  });

  return (
    <View style={{ flex: 1, backgroundColor: "#FFF" }}>
      <View style={{ paddingTop: insets.top }}>
        <TopBar
          routeName="public_profile"
          title={USER_PROFILE.username}
          useSafeArea={false}
          leftControls={{ mode: "back", onBack: () => router.back() }}
        />
      </View>

      <ScrollView 
        stickyHeaderIndices={[1]} 
        showsVerticalScrollIndicator={false}
      >
        {/* ---------- Header (Index 0) ---------- */}
        <View style={styles.headerContainer}>
          <View style={styles.profileRow}>
            <Image source={{ uri: USER_PROFILE.avatar }} style={styles.avatar} />
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{USER_PROFILE.name}</Text>

              <View style={styles.socialRow}>
                <Text style={styles.socialText}>
                  <Text style={styles.bold}>{USER_PROFILE.stats.followers}</Text> Followers
                </Text>
                <Text style={styles.dot}>·</Text>
                <Text style={styles.socialText}>
                  <Text style={styles.bold}>{USER_PROFILE.stats.following}</Text> Following
                </Text>
              </View>

              <View style={styles.badgesRow}>
                <View style={styles.badge}>
                  <Ionicons name="location-sharp" size={10} color="#6B7280" />
                  <Text style={styles.badgeText}>{USER_PROFILE.location}</Text>
                </View>
                <View style={styles.badge}>
                  <MaterialCommunityIcons name="office-building-marker" size={10} color="#6B7280" />
                  <Text style={styles.badgeText}>{USER_PROFILE.homeGym}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Stats Row */}
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
                <Text style={styles.statLabel}>BOULDER</Text>
                <Text style={[styles.statNum, { color: '#D97706' }]}>{USER_PROFILE.stats.boulderMax}</Text>
            </View>
            <View style={styles.vertDivider} />
            <View style={styles.statItem}>
                <Text style={styles.statLabel}>ROUTE</Text>
                <Text style={[styles.statNum, { color: '#4F46E5' }]}>{USER_PROFILE.stats.routeMax}</Text>
            </View>
            <View style={styles.vertDivider} />
            <View style={styles.statItem}>
                <Text style={styles.statLabel}>SENDS</Text>
                <Text style={styles.statNum}>{USER_PROFILE.stats.totalSends}</Text>
            </View>
          </View>

          {/* Action Row */}
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.followBtn}>
                <Text style={styles.followText}>Follow</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.msgBtn}>
                <Ionicons name="chatbubble-outline" size={20} color="#111" />
            </TouchableOpacity>
          </View>
        </View>

        {/* ---------- Sticky Tabs (Index 1) ---------- */}
        <View style={styles.stickyWrapper}>
          <View style={styles.tabContainer}>
            {tabs.map((tab, index) => {
              const isActive = activeTab === tab.key;
              return (
                <TouchableOpacity
                  key={tab.key}
                  style={styles.tabItem}
                  onPress={() => onTabPress(index, tab.key)}
                >
                  <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              );
            })}

            {/* [修改] 黑色指示条 */}
            <Animated.View
              style={[
                styles.indicator,
                {
                  transform: [{ translateX }], // 直接应用计算好的像素值
                },
              ]}
            />
          </View>
        </View>

        {/* ---------- Content (Index 2) ---------- */}
        <View style={styles.contentArea}>
            {activeTab === "Posts" &&
            MOCK_USER_POSTS.map((post) => (
                <FeedPost
                key={post.id}
                post={post as any}
                simpleMode
                onLike={() => {}}
                onPress={() => {}}
                onPressComment={() => {}}
                onPressAttachment={() => {}}
                />
            ))}

          {activeTab === "Plans" && (
            <View style={styles.emptyState}>
              <Ionicons name="document-text-outline" size={40} color="#E5E7EB" />
              <Text style={styles.emptyText}>{tt({ zh: "暂无公开计划", en: "No public plans" })}</Text>
            </View>
          )}

          {activeTab === "Logs" &&
            MOCK_LOGS.map((log) => (
              <View key={log.id} style={styles.logItem}>
                <View style={{flexDirection: 'row', alignItems: 'center', gap: 12}}>
                     <View style={[styles.logIcon, log.type === 'Boulder' ? styles.bgBoulder : styles.bgSport]}>
                        <Text style={[styles.logGrade, log.type === 'Boulder' ? styles.textBoulder : styles.textSport]}>
                            {log.grade.split('/')[0]}
                        </Text>
                     </View>
                     <View>
                        <Text style={styles.logName}>{log.name}</Text>
                        <Text style={styles.logMeta}>{log.type} · {log.date}</Text>
                     </View>
                </View>
                <View style={{flexDirection: 'row', alignItems: 'center', gap: 4}}>
                     <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                     <Text style={{fontSize: 12, fontWeight: '600', color: '#10B981'}}>{log.status}</Text>
                </View>
              </View>
            ))}
        </View>
      </ScrollView>
    </View>
  );
}

/* ---------------- Styles ---------------- */

const styles = StyleSheet.create({
  headerContainer: { paddingHorizontal: 16, paddingBottom: 16, paddingTop: 8 },
  profileRow: { flexDirection: "row", gap: 14, marginBottom: 20 },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#F3F4F6' },
  name: { fontSize: 18, fontWeight: "800", color: "#111" },

  socialRow: { flexDirection: "row", marginVertical: 6 },
  socialText: { fontSize: 13, color: "#6B7280" },
  dot: { marginHorizontal: 6, color: "#9CA3AF" },
  bold: { fontWeight: "700", color: "#111" },

  badgesRow: { flexDirection: "row", gap: 6 },
  badge: {
    flexDirection: "row",
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: "#F9FAFB",
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#F3F4F6'
  },
  badgeText: { fontSize: 10, color: "#6B7280" },

  // Stats
  statsContainer: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', marginBottom: 20, backgroundColor: '#FAFAFA', paddingVertical: 12, borderRadius: 12 },
  statItem: { alignItems: 'center', width: 80 },
  statLabel: { fontSize: 10, fontWeight: '700', color: '#9CA3AF', marginBottom: 2, letterSpacing: 0.5 },
  statNum: { fontSize: 18, fontWeight: '800', color: '#111' },
  vertDivider: { width: 1, height: 24, backgroundColor: '#E5E7EB' },

  // Actions
  actionRow: { flexDirection: 'row', gap: 10 },
  followBtn: { flex: 1, backgroundColor: '#111', height: 40, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  followText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
  msgBtn: { width: 40, height: 40, borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center' },

  stickyWrapper: {
    backgroundColor: "#FFF",
    zIndex: 20,
    width: "100%",
  },

  tabContainer: {
    flexDirection: "row",
    width: "100%",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    alignItems: 'center',
  },
  tabItem: { 
    flex: 1, 
    paddingVertical: 14, 
    alignItems: "center" 
  },
  tabText: { fontSize: 15, color: "#9CA3AF", fontWeight: "600" },
  tabTextActive: { color: "#111", fontWeight: "800" },

  // [修改] 指示条样式
  indicator: {
    position: "absolute",
    bottom: 0,
    left: 0, // 确保从左边开始
    width: TAB_WIDTH, // 固定宽度为屏幕的 1/3
    height: 2,
    backgroundColor: "#111",
  },

  contentArea: { minHeight: 400 },

  emptyState: { padding: 48, alignItems: "center" },
  emptyText: { color: "#9CA3AF", marginTop: 8 },

  logItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: "#F9FAFB" },
  logName: { fontWeight: "600", color: "#111", fontSize: 15 },
  logMeta: { fontSize: 12, color: "#6B7280" },
  logIcon: { width: 40, height: 40, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  bgBoulder: { backgroundColor: '#FFF7ED' },
  bgSport: { backgroundColor: '#EEF2FF' },
  logGrade: { fontSize: 12, fontWeight: '700', textAlign: 'center' },
  textBoulder: { color: '#C2410C' },
  textSport: { color: '#4338CA' },
});