// app/(tabs)/home.tsx

import React, { useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Linking } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { GlassView } from "expo-glass-effect";
import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  interpolate,
  Extrapolate,
} from "react-native-reanimated";
import { useAuthStore } from "@/store/useAuthStore";
import type { Href } from "expo-router";
import { HomeBlogBannerCarousel, type HomeBlogBannerItem } from "@/features/home/components/HomeBlogBannerCarousel";
import { ExercisesCategoryRow } from "@/features/home/exercises/components/ExercisesCategoryRow";
// ===== Banner (运营友好) =====
type BannerAction =
  | { type: "route"; path: Href }
  | { type: "blog"; blogId: string }
  | { type: "external"; url: string };

type BannerItem = {
  id: string;
  title: string;
  subtitle?: string;
  color: string;
  icon: keyof typeof Ionicons.glyphMap;
  action: BannerAction;
};

// 先用 mock：后期可直接由后端/远端配置下发
const BLOG_BANNERS: HomeBlogBannerItem[] = [
  {
    id: "finger-care",
    title: "手指养护指南",
    subtitle: "Read now →",
    imageUri: null, // ✅ 预留：后续放真实封面
    color: "#EFF6FF",
    action: { type: "blog", blogId: "finger-care-001" },
  },
  {
    id: "warmup",
    title: "10 分钟热身模板",
    subtitle: "Read now →",
    imageUri: null,
    color: "#FFFBEB",
    action: { type: "blog", blogId: "warmup-002" },
  },
  // 你可以继续加更多文章
];


const SCROLL_THRESHOLD = 40; // 滚动多少距离后 Header 完全变色

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const bootstrap = useAuthStore((s) => s.bootstrap);

  useEffect(() => {
    bootstrap();
  }, []);

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
      opacity: interpolate(
        scrollY.value,
        [SCROLL_THRESHOLD - 10, SCROLL_THRESHOLD + 10],
        [0, 1],
        Extrapolate.CLAMP
      ),
      transform: [
        {
          translateY: interpolate(
            scrollY.value,
            [SCROLL_THRESHOLD - 10, SCROLL_THRESHOLD + 10],
            [10, 0],
            Extrapolate.CLAMP
          ),
        },
      ],
    };
  });

  // 5. 页面内大标题 "Hi, Climber" 动画
  const bigTitleStyle = useAnimatedStyle(() => {
    return {
      opacity: interpolate(scrollY.value, [0, SCROLL_THRESHOLD], [1, 0], Extrapolate.CLAMP),
      transform: [
        { scale: interpolate(scrollY.value, [0, SCROLL_THRESHOLD], [1, 0.9], Extrapolate.CLAMP) },
        { translateY: interpolate(scrollY.value, [0, SCROLL_THRESHOLD], [0, -10], Extrapolate.CLAMP) },
      ],
    };
  });

  // ✅ 统一 banner 点击分发：以后加埋点/AB test/utm 都只改这里
  const onPressBanner = (item: BannerItem) => {
    const a = item.action;

    if (a.type === "route") {
      router.push(a.path);
      return;
    }

    if (a.type === "blog") {
      router.push({ pathname: "/blog/[blogId]", params: { blogId: a.blogId } });
      return;
    }

    if (a.type === "external") {
      Linking.openURL(a.url).catch(() => {});
    }
  };

  const renderBanner = ({ item }: { item: BannerItem }) => (
    <TouchableOpacity key={item.id} activeOpacity={0.9} onPress={() => onPressBanner(item)}>
      <View style={[styles.bannerCard, { backgroundColor: item.color }]}>
        <Ionicons name={item.icon} size={32} color="#374151" />
        <Text style={styles.bannerTitle}>{item.title}</Text>
        <Text style={styles.bannerSub}>{item.subtitle ?? "Read more →"}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
      {/* --- 1. Custom Animated Header --- */}
      <View style={[styles.fixedHeader, { height: insets.top + 44 }]}>
        {/* 模糊背景层 */}
        <Animated.View style={[StyleSheet.absoluteFill, headerBlurStyle]}>
          <GlassView glassEffectStyle="regular" style={StyleSheet.absoluteFill} />
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
            <TouchableOpacity style={styles.iconBtn} onPress={() => router.push("/gyms")}>
              <Ionicons name="map" size={24} color="#111" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.iconBtn} onPress={() => router.push("/analysis")}>
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
          paddingBottom: 100,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header 占位与大标题区域 */}
        <View style={styles.headerRow}>
          <Animated.View style={[styles.bigHeaderArea, bigTitleStyle]}>
            <Text style={styles.greeting}>Hi, Climber</Text>
            <Text style={styles.subtitle}>Ready to send today?</Text>
          </Animated.View>
          <View style={{ width: 80 }} />
        </View>

        {/* 1. Blog Banner Carousel */}
        <HomeBlogBannerCarousel
          banners={BLOG_BANNERS}
          onPressBlog={(blogId) => {
            router.push({ pathname: "/blog/[blogId]", params: { blogId } });
          }}
          onViewAll={() => {
            router.push("/blog");
          }}
        />


        {/* 2. Activities 板块 */}
        <View style={{ paddingHorizontal: 16, marginBottom: 24 }}>
          <Text style={styles.sectionTitle}>Activities</Text>
          <View style={{ flexDirection: "row", gap: 12 }}>
            <TouchableOpacity
              style={[styles.libraryCard, { backgroundColor: "#FFF7ED" }]}
              onPress={() => router.push("/community/challenges")}
            >
              <View style={[styles.iconCircle, { backgroundColor: "#FFF" }]}>
                <Ionicons name="trophy" size={24} color="#D97706" />
              </View>
              <Text style={styles.cardTitle}>Challenges</Text>
              <Text style={styles.cardDesc}>Monthly Goals</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.libraryCard, { backgroundColor: "#F0FDF4" }]}
              onPress={() => router.push("/community/activities")}
            >
              <View style={[styles.iconCircle, { backgroundColor: "#FFF" }]}>
                <MaterialCommunityIcons name="ticket-confirmation" size={24} color="#16A34A" />
              </View>
              <Text style={styles.cardTitle}>Events</Text>
              <Text style={styles.cardDesc}>Local Meets</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 3. Training Library */}
        <View style={{ paddingHorizontal: 16, marginBottom: 24 }}>
          <Text style={styles.sectionTitle}>Training Library</Text>
            <View style={{ paddingHorizontal: 0, marginBottom: 0 }}>
              <ExercisesCategoryRow />
            </View>
        </View>

        {/* 4. 快速 Tips */}
        <View style={{ paddingHorizontal: 16 }}>
          <Text style={styles.sectionTitle}>Quick Tips</Text>
          <View style={styles.tipCard}>
            <Ionicons name="bulb" size={20} color="#F59E0B" />
            <Text style={styles.tipText}>每次攀爬前进行 10 分钟热身可降低 50% 受伤风险。</Text>
            <TouchableOpacity>
              <Ionicons name="close" size={16} color="#9CA3AF" />
            </TouchableOpacity>
          </View>
        </View>
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  // Header Styles
  fixedHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
  },
  headerBorder: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: "rgba(0,0,0,0.05)",
  },
  headerContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  headerTitleContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    pointerEvents: "none",
  },
  headerTitleText: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111",
  },

  headerRightRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  iconBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },

  // Big Title Layout
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start", // 顶部对齐
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  bigHeaderArea: { flex: 1, paddingTop: 35 },
  greeting: { fontSize: 32, fontWeight: "800", color: "#111", lineHeight: 38 },
  subtitle: { fontSize: 15, color: "#6B7280", marginTop: 2 },

  // Sections
  bannerCard: {
    width: 260,
    height: 120,
    borderRadius: 16,
    padding: 16,
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  bannerTitle: { fontSize: 16, fontWeight: "700", color: "#374151", marginTop: 8 },
  bannerSub: { fontSize: 12, color: "#6B7280", fontWeight: "500" },

  sectionTitle: { fontSize: 18, fontWeight: "700", marginBottom: 12, color: "#111" },

  libraryCard: {
    flex: 1,
    height: 120,
    borderRadius: 16,
    padding: 16,
    justifyContent: "flex-end",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FFF",
    alignItems: "center",
    justifyContent: "center",
    position: "absolute",
    top: 16,
    left: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  cardTitle: { fontSize: 16, fontWeight: "700", color: "#111" },
  cardDesc: { fontSize: 12, color: "#6B7280", marginTop: 4 },

  tipCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFBEB",
    padding: 12,
    borderRadius: 12,
    gap: 12,
    shadowColor: "#F59E0B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  tipText: { flex: 1, fontSize: 13, color: "#92400E", lineHeight: 18 },
});
