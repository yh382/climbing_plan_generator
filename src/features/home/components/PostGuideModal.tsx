import { useMemo, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, useWindowDimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "@/lib/theme";
import { useThemeColors } from "@/lib/useThemeColors";
import SmartBottomSheet from "@/features/community/components/SmartBottomSheet";

type Props = { visible: boolean; onClose: () => void };

const SLIDES = [
  {
    icon: "ellipsis-horizontal" as const,
    title: "Share from Route Log",
    desc: "Tap ··· on any Route Log to share your session.",
  },
  {
    icon: "images-outline" as const,
    title: "Select your videos",
    desc: "Choose up to 10 videos from your session to share.",
  },
  {
    icon: "create-outline" as const,
    title: "Add a caption",
    desc: "Write what you want to say, your route data is attached automatically.",
  },
  {
    icon: "globe-outline" as const,
    title: "Post to community",
    desc: "Your climb is now visible to followers and the climbing community.",
  },
];

export default function PostGuideModal({ visible, onClose }: Props) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { width: screenWidth } = useWindowDimensions();
  const [currentSlide, setCurrentSlide] = useState(0);
  const itemWidth = screenWidth - 44;

  return (
    <SmartBottomSheet visible={visible} onClose={onClose} mode="list">
      {/* Slides */}
      <FlatList
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        data={SLIDES}
        keyExtractor={(_, i) => String(i)}
        renderItem={({ item }) => (
          <View style={[styles.slide, { width: itemWidth }]}>
            <View style={styles.imagePlaceholder}>
              <Ionicons
                name={item.icon}
                size={40}
                color={colors.textTertiary}
              />
            </View>
            <Text style={styles.slideTitle}>{item.title}</Text>
            <Text style={styles.slideDesc}>{item.desc}</Text>
          </View>
        )}
        onMomentumScrollEnd={(e) => {
          const idx = Math.round(
            e.nativeEvent.contentOffset.x / itemWidth
          );
          setCurrentSlide(idx);
        }}
      />

      {/* Dots */}
      <View style={styles.dotsRow}>
        {SLIDES.map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              currentSlide === i ? styles.dotActive : styles.dotInactive,
            ]}
          />
        ))}
      </View>

      {/* CTA */}
      <TouchableOpacity
        style={styles.ctaBtn}
        onPress={onClose}
        activeOpacity={0.8}
      >
        <Text style={styles.ctaBtnText}>Got it · Share a Climb</Text>
      </TouchableOpacity>
    </SmartBottomSheet>
  );
}

const createStyles = (colors: ReturnType<typeof useThemeColors>) => StyleSheet.create({
  slide: {
    alignItems: "center",
    paddingHorizontal: 8,
  },
  imagePlaceholder: {
    width: "100%",
    height: 240,
    borderRadius: 14,
    backgroundColor: colors.backgroundSecondary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  slideTitle: {
    fontSize: 17,
    fontWeight: "800",
    fontFamily: theme.fonts.bold,
    color: colors.textPrimary,
    letterSpacing: -0.5,
    marginBottom: 8,
    textAlign: "center",
  },
  slideDesc: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
  },
  dotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 5,
    marginTop: 16,
  },
  dot: {
    height: 5,
    borderRadius: 2.5,
  },
  dotActive: {
    width: 18,
    backgroundColor: "#306E6F",
  },
  dotInactive: {
    width: 5,
    backgroundColor: colors.border,
  },
  ctaBtn: {
    backgroundColor: "#1C1C1E",
    borderRadius: 999,
    paddingVertical: 14,
    marginHorizontal: 22,
    marginTop: 20,
    marginBottom: 32,
    alignItems: "center",
  },
  ctaBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
    fontFamily: theme.fonts.bold,
  },
});
