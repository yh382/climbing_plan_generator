import React, { useMemo, useRef, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image, NativeScrollEvent, NativeSyntheticEvent } from "react-native";
import Animated from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "../../../lib/theme";
import { useThemeColors } from "@/lib/useThemeColors";

export type HomeBannerAction =
  | { type: "route" }
  | { type: "blog"; blogId: string };

export type HomeBlogBannerItem = {
  id: string;
  title: string;
  subtitle?: string;
  imageUri?: string | null;
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
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const scrollRef = useRef<Animated.ScrollView>(null);
  const [active, setActive] = useState(0);

  const snap = CARD_W + GAP;

  const data = useMemo(() => {
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
              <Ionicons name="arrow-forward" size={18} color="#FFF" />
            </View>
          </View>
          <Text style={styles.viewAllSub}>Browse all posts</Text>
        </TouchableOpacity>
      );
    }

    return (
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => {
          if (item.action?.type === "blog") onPressBlog(item.action.blogId);
        }}
        style={styles.card}
      >
        {/* Cover image area */}
        <View style={styles.coverWrap}>
          {item.imageUri ? (
            <Image source={{ uri: item.imageUri }} style={styles.coverImg} />
          ) : (
            <View style={styles.coverPlaceholder}>
              <Ionicons name="image-outline" size={18} color="rgba(255,255,255,0.4)" />
            </View>
          )}

          <View style={styles.badge}>
            <Ionicons name="book" size={14} color="#FFF" />
          </View>
        </View>

        {/* Text area */}
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
    <View style={{ marginBottom: theme.spacing.sectionGap }}>
      <Animated.ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: theme.spacing.screenPadding, gap: GAP }}
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

      {/* Indicator: accent rectangle (active) + gray circles (inactive) */}
      <View style={styles.indicatorRow}>
        {data.map((_, i) => (
          <View key={i} style={[styles.dot, i === active ? styles.dotActive : styles.dotIdle]} />
        ))}
      </View>
    </View>
  );
}

const createStyles = (colors: ReturnType<typeof useThemeColors>) => StyleSheet.create({
  card: {
    width: CARD_W,
    height: CARD_H,
    borderRadius: theme.borderRadius.card,
    overflow: "hidden",
    backgroundColor: colors.cardDark,
  },

  coverWrap: {
    height: 100,
    backgroundColor: colors.cardDarkImage,
  },
  coverImg: {
    width: "100%",
    height: "100%",
  },
  coverPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },

  textArea: {
    flex: 1,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 12,
    justifyContent: "space-between",
  },
  title: {
    fontSize: 14,
    fontWeight: "700",
    fontFamily: theme.fonts.bold,
    color: "#FFFFFF",
    lineHeight: 18,
  },
  sub: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: "500",
    color: "rgba(255,255,255,0.35)",
  },

  // View all card
  viewAllCard: {
    width: CARD_W,
    height: CARD_H,
    borderRadius: theme.borderRadius.card,
    backgroundColor: colors.cardDark,
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
    fontFamily: theme.fonts.black,
    color: "#FFF",
  },
  viewAllArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  viewAllSub: {
    fontSize: 13,
    fontWeight: "500",
    color: "rgba(255,255,255,0.35)",
  },

  // Indicator: accent rect active, gray circle inactive
  indicatorRow: {
    marginTop: 10,
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },
  dot: {
    height: 6,
    borderRadius: 999,
  },
  dotIdle: {
    width: 6,
    backgroundColor: "rgba(0,0,0,0.12)",
  },
  dotActive: {
    width: 18,
    borderRadius: 3,
    backgroundColor: colors.accent,
  },
});
