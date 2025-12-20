// app/(tabs)/home.tsx

import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { BlurView } from "expo-blur";
import Animated, { 
  useSharedValue, 
  useAnimatedScrollHandler, 
  useAnimatedStyle, 
  interpolate, 
  Extrapolate 
} from "react-native-reanimated";

// 简单的 Banner 数据模拟
const BANNERS = [
  { id: 1, title: "手指养护指南", color: "#ECFDF5", icon: "medkit" },
  { id: 2, title: "IFSC 赛况更新", color: "#EFF6FF", icon: "trophy" },
  { id: 3, title: "新手装备避坑", color: "#FFFBEB", icon: "shirt" },
];

const SCROLL_THRESHOLD = 40; // 滚动多少距离后 Header 完全变色

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  
  // 1. 动画值
  const scrollY = useSharedValue(0);

  // 2. 滚动处理
  const scrollHandler = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });

  // 3. Header 背景模糊度动画
  const headerBlurStyle = useAnimatedStyle(() => {
    return {
      opacity: interpolate(scrollY.value, [0, SCROLL_THRESHOLD], [0, 1], Extrapolate.CLAMP),
    };
  });

  // 4. Header 中间 "Home" 标题动画
  const headerTitleStyle = useAnimatedStyle(() => {
    return {
      opacity: interpolate(scrollY.value, [SCROLL_THRESHOLD - 10, SCROLL_THRESHOLD + 10], [0, 1], Extrapolate.CLAMP),
      transform: [
        { translateY: interpolate(scrollY.value, [SCROLL_THRESHOLD - 10, SCROLL_THRESHOLD + 10], [10, 0], Extrapolate.CLAMP) }
      ]
    };
  });

  // 5. 页面内大标题 "Hi, Climber" 动画
  const bigTitleStyle = useAnimatedStyle(() => {
    return {
      opacity: interpolate(scrollY.value, [0, SCROLL_THRESHOLD], [1, 0], Extrapolate.CLAMP),
      transform: [
        { scale: interpolate(scrollY.value, [0, SCROLL_THRESHOLD], [1, 0.9], Extrapolate.CLAMP) },
        { translateY: interpolate(scrollY.value, [0, SCROLL_THRESHOLD], [0, -10], Extrapolate.CLAMP) }
      ]
    };
  });

  const renderBanner = ({ item }: { item: any }) => (
    <View key={item.id} style={[styles.bannerCard, { backgroundColor: item.color }]}>
      <Ionicons name={item.icon as any} size={32} color="#374151" />
      <Text style={styles.bannerTitle}>{item.title}</Text>
      <Text style={styles.bannerSub}>Read more →</Text>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
      
      {/* --- 1. Custom Animated Header --- */}
      <View style={[styles.fixedHeader, { height: insets.top + 44 }]}>
        
        {/* 模糊背景层 */}
        <Animated.View style={[StyleSheet.absoluteFill, headerBlurStyle]}>
            <BlurView intensity={80} tint="light" style={StyleSheet.absoluteFill} />
            <View style={styles.headerBorder} />
        </Animated.View>

        {/* Header 内容 */}
        <View style={[styles.headerContent, { marginTop: insets.top }]}>
            
            {/* 左侧占位 */}
            <View style={{ width: 80 }} />

            {/* 中间标题 (Home) */}
            <Animated.View style={[styles.headerTitleContainer, headerTitleStyle]}>
                <Text style={styles.headerTitleText}>Home</Text>
            </Animated.View>

            {/* 右侧按钮组：地图 + 分析 */}
            <View style={styles.headerRightRow}>
                <TouchableOpacity 
                    style={styles.iconBtn}
                    onPress={() => router.push("/gyms")}
                >
                    <Ionicons name="map" size={24} color="#111" />
                </TouchableOpacity>

                <TouchableOpacity 
                    style={styles.iconBtn}
                    onPress={() => router.push("/analysis")}
                >
                    <Ionicons name="stats-chart" size={24} color="#111" />
                </TouchableOpacity>
            </View>
        </View>
      </View>

      {/* --- 2. Scrollable Content --- */}
      <Animated.ScrollView 
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        contentContainerStyle={{ 
            paddingTop: insets.top + 10, 
            paddingBottom: 100 
        }} 
        showsVerticalScrollIndicator={false}
      >
        
        {/* Header 占位与大标题区域 */}
        <View style={styles.headerRow}>
             <Animated.View style={[styles.bigHeaderArea, bigTitleStyle]}>
                <Text style={styles.greeting}>Hi, Climber</Text>
                <Text style={styles.subtitle}>Ready to send today?</Text>
            </Animated.View>
            <View style={{width: 80}} /> 
        </View>

        {/* 1. 横向 Banner */}
        <Animated.ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }} style={{ marginBottom: 24 }}>
            {BANNERS.map(item => renderBanner({ item }))}
        </Animated.ScrollView>

        {/* 2. Activities 板块 */}
        <View style={{ paddingHorizontal: 16, marginBottom: 24 }}>
            <Text style={styles.sectionTitle}>Activities</Text>
            <View style={{ flexDirection: 'row', gap: 12 }}>
                <TouchableOpacity 
                    style={[styles.libraryCard, { backgroundColor: '#FFF7ED' }]} 
                    onPress={() => router.push("/community/challenges")}
                >
                    <View style={[styles.iconCircle, { backgroundColor: '#FFF' }]}>
                        <Ionicons name="trophy" size={24} color="#D97706"/>
                    </View>
                    <Text style={styles.cardTitle}>Challenges</Text>
                    <Text style={styles.cardDesc}>Monthly Goals</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                    style={[styles.libraryCard, { backgroundColor: '#F0FDF4' }]} 
                    onPress={() => router.push("/community/activities")}
                >
                    <View style={[styles.iconCircle, { backgroundColor: '#FFF' }]}>
                        <MaterialCommunityIcons name="ticket-confirmation" size={24} color="#16A34A"/>
                    </View>
                    <Text style={styles.cardTitle}>Events</Text>
                    <Text style={styles.cardDesc}>Local Meets</Text>
                </TouchableOpacity>
            </View>
        </View>

        {/* 3. Training Library */}
        <View style={{ paddingHorizontal: 16, marginBottom: 24 }}>
            <Text style={styles.sectionTitle}>Training Library</Text>
            <View style={{ flexDirection: 'row', gap: 12 }}>
                <TouchableOpacity style={[styles.libraryCard, { backgroundColor: '#F3F4F6' }]} onPress={() => router.push("/library/exercises")}>
                    <View style={styles.iconCircle}><Ionicons name="body" size={24} color="#4B5563"/></View>
                    <Text style={styles.cardTitle}>Exercises</Text>
                    <Text style={styles.cardDesc}>动作库 & 专项训练</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.libraryCard, { backgroundColor: '#F3F4F6' }]} onPress={() => router.push("/library/plans")}>
                    <View style={styles.iconCircle}><Ionicons name="calendar" size={24} color="#4B5563"/></View>
                    <Text style={styles.cardTitle}>Plans</Text>
                    <Text style={styles.cardDesc}>我的计划 & AI生成</Text>
                </TouchableOpacity>
            </View>
        </View>

        {/* 4. 快速 Tips */}
        <View style={{ paddingHorizontal: 16 }}>
            <Text style={styles.sectionTitle}>Quick Tips</Text>
            <View style={styles.tipCard}>
                <Ionicons name="bulb" size={20} color="#F59E0B" />
                <Text style={styles.tipText}>每次攀爬前进行 10 分钟热身可降低 50% 受伤风险。</Text>
                <TouchableOpacity><Ionicons name="close" size={16} color="#9CA3AF" /></TouchableOpacity>
            </View>
        </View>

      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  // Header Styles
  fixedHeader: {
      position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100,
  },
  headerBorder: {
      position: 'absolute', bottom: 0, left: 0, right: 0, height: 1, backgroundColor: 'rgba(0,0,0,0.05)'
  },
  headerContent: {
      flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16
  },
  headerTitleContainer: {
      position: 'absolute', left: 0, right: 0, alignItems: 'center', pointerEvents: 'none'
  },
  headerTitleText: {
      fontSize: 17, fontWeight: '700', color: '#111'
  },
  
  headerRightRow: {
      flexDirection: 'row', alignItems: 'center', gap: 6
  },
  iconBtn: {
      width: 40, height: 40, alignItems: 'center', justifyContent: 'center'
  },

  // Big Title Layout
  headerRow: { 
      flexDirection: 'row', 
      justifyContent: 'space-between', 
      alignItems: 'flex-start', // 顶部对齐
      paddingHorizontal: 20, 
      marginBottom: 20 
  },
  bigHeaderArea: { flex: 1 },
  greeting: { fontSize: 32, fontWeight: '800', color: '#111', lineHeight: 38 },
  subtitle: { fontSize: 15, color: '#6B7280', marginTop: 2 },

  // Sections
  bannerCard: { 
      width: 260, 
      height: 120, 
      borderRadius: 16, 
      padding: 16, 
      justifyContent: 'space-between',
      // [新增] 阴影
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 3,
  },
  bannerTitle: { fontSize: 16, fontWeight: '700', color: '#374151', marginTop: 8 },
  bannerSub: { fontSize: 12, color: '#6B7280', fontWeight: '500' },
  
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12, color: '#111' },
  
  libraryCard: { 
      flex: 1, 
      height: 120, 
      borderRadius: 16, 
      padding: 16, 
      justifyContent: 'flex-end',
      // [新增] 阴影
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
  },
  iconCircle: { 
      width: 36, height: 36, borderRadius: 18, backgroundColor: '#FFF', 
      alignItems: 'center', justifyContent: 'center', 
      position: 'absolute', top: 16, left: 16,
      // [新增] 图标背景微阴影
      shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: {width:0, height:2}
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#111' },
  cardDesc: { fontSize: 12, color: '#6B7280', marginTop: 4 },
  
  tipCard: { 
      flexDirection: 'row', alignItems: 'center', 
      backgroundColor: '#FFFBEB', 
      padding: 12, borderRadius: 12, gap: 12,
      // [新增] 阴影
      shadowColor: "#F59E0B", // 阴影带点黄色调
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 2,
  },
  tipText: { flex: 1, fontSize: 13, color: '#92400E', lineHeight: 18 },
});