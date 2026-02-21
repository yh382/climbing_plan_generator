import React, { useMemo, useRef, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image, NativeScrollEvent, NativeSyntheticEvent } from "react-native";
import Animated from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";

export type HomeBannerAction =
  | { type: "route" }
  | { type: "blog"; blogId: string };

export type HomeBlogBannerItem = {
  id: string;
  title: string;
  subtitle?: string;
  // ✅ 预留：运营文章封面图
  imageUri?: string | null;
  // ✅ 预留：如果没有图片时的主题底色
  color?: string;
  action: HomeBannerAction;
};

const GAP = 12;
const CARD_W = 280;
const CARD_H = 170;

export function HomeBlogBannerCarousel({
  banners,
  onPressBlog,
  onViewAll,
}: {
  banners: HomeBlogBannerItem[];
  onPressBlog: (blogId: string) => void;
  onViewAll: () => void;
}) {
  const scrollRef = useRef<Animated.ScrollView>(null);
  const [active, setActive] = useState(0);

  const snap = CARD_W + GAP;

  const data = useMemo(() => {
    // ✅ 最后一张 “View all”
    return [...banners, { id: "__view_all__", title: "View all", action: { type: "route" as const } }];
  }, [banners]);

    const handleMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    const idx = Math.round(x / snap);
    setActive(idx);
    };



  const renderCard = (item: any) => {
    if (item.id === "__view_all__") {
      return (
        <TouchableOpacity activeOpacity={0.9} onPress={onViewAll} style={styles.viewAllCard}>
          <View style={styles.viewAllInner}>
            <Text style={styles.viewAllText}>View all</Text>
            <View style={styles.viewAllArrow}>
              <Ionicons name="arrow-forward" size={18} color="#111" />
            </View>
          </View>
          <Text style={styles.viewAllSub}>Browse all posts</Text>
        </TouchableOpacity>
      );
    }

    const bg = item.color ?? "#F3F4F6";

    return (
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => {
          if (item.action?.type === "blog") onPressBlog(item.action.blogId);
        }}
        style={[styles.card, { backgroundColor: bg }]}
      >
        {/* 封面图片区 */}
        <View style={styles.coverWrap}>
          {item.imageUri ? (
            <Image source={{ uri: item.imageUri }} style={styles.coverImg} />
          ) : (
            <View style={styles.coverPlaceholder}>
              <Ionicons name="image-outline" size={18} color="#111" />
            </View>
          )}

          {/* 右上角的小图标（可选） */}
          <View style={styles.badge}>
            <Ionicons name="book" size={14} color="#111" />
          </View>
        </View>

        {/* 文案区 */}
        <View style={styles.textArea}>
          <Text style={styles.title} numberOfLines={2}>
            {item.title}
          </Text>
          <Text style={styles.sub} numberOfLines={1}>
            {item.subtitle ?? "Read now →"}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={{ marginBottom: 18 }}>
      <Animated.ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, gap: GAP }}
        snapToInterval={snap}
        decelerationRate="fast"
        snapToAlignment="start"
        onMomentumScrollEnd={handleMomentumEnd}
      >
        {data.map((item) => (
          <View key={item.id} style={{ width: CARD_W }}>
            {renderCard(item)}
          </View>
        ))}
      </Animated.ScrollView>

      {/* 指示器（小横条更“高级”，也更贴你 UI） */}
      <View style={styles.indicatorRow}>
        {data.map((_, i) => (
          <View key={i} style={[styles.pill, i === active ? styles.pillActive : styles.pillIdle]} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: CARD_W,
    height: CARD_H,
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(0,0,0,0.06)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },

  coverWrap: {
    height: 104,
    backgroundColor: "rgba(255,255,255,0.35)",
  },
  coverImg: {
    width: "100%",
    height: "100%",
  },
  coverPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.55)",
  },
  badge: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(255,255,255,0.85)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(0,0,0,0.08)",
  },

  textArea: {
    flex: 1,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 12,
    justifyContent: "space-between",
  },
  title: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111",
    lineHeight: 20,
  },
  sub: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: "700",
    color: "#6B7280",
  },

  // View all card（右侧追加）
  viewAllCard: {
    width: CARD_W,
    height: CARD_H,
    borderRadius: 18,
    backgroundColor: "#111",
    paddingHorizontal: 16,
    paddingVertical: 14,
    justifyContent: "space-between",
    overflow: "hidden",
  },
  viewAllInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  viewAllText: {
    fontSize: 18,
    fontWeight: "900",
    color: "#FFF",
  },
  viewAllArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.9)",
    alignItems: "center",
    justifyContent: "center",
  },
  viewAllSub: {
    fontSize: 13,
    fontWeight: "700",
    color: "rgba(255,255,255,0.75)",
  },

  // 指示器（小横条）
  indicatorRow: {
    marginTop: 10,
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },
  pill: {
    height: 6,
    borderRadius: 999,
  },
  pillIdle: {
    width: 6,
    backgroundColor: "rgba(0,0,0,0.12)",
  },
  pillActive: {
    width: 18,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
});
