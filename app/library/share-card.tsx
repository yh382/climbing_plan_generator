import React, { useRef, useMemo, useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Alert,
  Platform,
  ImageBackground,
  FlatList,
  Dimensions,
  Pressable,
  Animated,
  PanResponder,
} from "react-native";
import { Stack, useRouter, useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { captureRef } from "react-native-view-shot";
import * as MediaLibrary from "expo-media-library";
import * as Sharing from "expo-sharing";
import * as Haptics from "expo-haptics";

import { useThemeColors } from "@/lib/useThemeColors";
import { theme } from "@/lib/theme";
import { NATIVE_HEADER_BASE } from "@/lib/nativeHeaderOptions";
import { HeaderButton } from "@/components/ui/HeaderButton";

const { width: SCREEN_W } = Dimensions.get("window");
const CARD_H_PADDING = 32;
const CARD_W = SCREEN_W - CARD_H_PADDING * 2;
const CARD_H = CARD_W * (16 / 9); // 9:16 portrait (IG Story ratio)
const CHECKER_SIZE = 14;

// --- Template backgrounds ---
const bgLandmarkUS = require("../../assets/images/share-bg-landmark-us.jpg");
const bgLandmarkFR = require("../../assets/images/share-bg-landmark-fr.jpg");
const bgLandmarkCN = require("../../assets/images/share-bg-landmark-cn.jpg");

const bgAmbianceA = require("../../assets/images/share-bg-a.jpg");
const bgAmbianceB = require("../../assets/images/share-bg-b.jpg");

type TemplateConfig = {
  id: string;
  label: string;
  bg: any; // require() source or null for transparent
  dark: boolean; // true = white text on dark bg
};

const TEMPLATES: TemplateConfig[] = [
  { id: "transparent", label: "Sticker", bg: null, dark: false },
  { id: "us", label: "Yosemite", bg: bgLandmarkUS, dark: true },
  { id: "fr", label: "Fontainebleau", bg: bgLandmarkFR, dark: true },
  { id: "cn", label: "Yangshuo", bg: bgLandmarkCN, dark: true },
  { id: "ambiance-a", label: "Ambiance A", bg: bgAmbianceA, dark: true },
  { id: "ambiance-b", label: "Ambiance B", bg: bgAmbianceB, dark: true },
];

export default function ShareCardScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const params = useLocalSearchParams<{
    date?: string;
    gymName?: string;
    duration?: string;
    sends?: string;
    bestGrade?: string;
    climbs?: string;
    discipline?: string;
  }>();

  const [activeIndex, setActiveIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const cardRefs = useRef<(View | null)[]>([]);
  const contentOffsets = useRef<Record<string, number>>({});

  const sessionData = useMemo(() => ({
    date: params.date || "",
    gymName: params.gymName || "Climbing Session",
    duration: params.duration || "",
    sends: Number(params.sends) || 0,
    bestGrade: params.bestGrade || "—",
    climbs: Number(params.climbs) || 0,
    discipline: params.discipline || "boulder",
  }), [params]);

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;
  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setActiveIndex(viewableItems[0].index ?? 0);
    }
  }).current;

  const captureActive = useCallback(async () => {
    const ref = cardRefs.current[activeIndex];
    if (!ref) throw new Error("Card not ready");
    const template = TEMPLATES[activeIndex];
    const isTransparent = !template.bg;
    const uri = await captureRef(ref, {
      format: isTransparent ? "png" : "png",
      quality: 1.0,
    });
    return uri;
  }, [activeIndex]);

  const handleSave = useCallback(async () => {
    if (saving) return;
    setSaving(true);
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission needed", "Please allow photo library access.");
        return;
      }
      const uri = await captureActive();
      await MediaLibrary.saveToLibraryAsync(uri);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Saved", "Share card saved to your photo library.");
    } catch (e: any) {
      Alert.alert("Save failed", e?.message || "Please try again.");
    } finally {
      setSaving(false);
    }
  }, [captureActive, saving]);

  const handleShare = useCallback(async () => {
    try {
      const uri = await captureActive();
      await Sharing.shareAsync(uri, { mimeType: "image/png" });
    } catch (e: any) {
      if (e?.message !== "User did not share") {
        Alert.alert("Share failed", e?.message || "Please try again.");
      }
    }
  }, [captureActive]);

  const renderCard = useCallback(
    ({ item, index }: { item: TemplateConfig; index: number }) => (
      <View style={styles.cardSlide}>
        <View style={{ width: CARD_W, height: CARD_H }}>
          {/* Checkerboard preview behind transparent card (not captured) */}
          {!item.bg && (
            <View style={[StyleSheet.absoluteFill, { borderRadius: 20, overflow: "hidden" }]}>
              <Checkerboard />
            </View>
          )}
          <View
            ref={(r) => { cardRefs.current[index] = r; }}
            collapsable={false}
            style={[styles.card, !item.bg && styles.cardTransparent]}
          >
            {item.bg ? (
              <ImageBackground source={item.bg} style={styles.cardBg} resizeMode="cover">
                <LinearGradient
                  colors={["rgba(0,0,0,0.15)", "rgba(0,0,0,0.5)", "rgba(0,0,0,0.8)"]}
                  locations={[0, 0.5, 1]}
                  style={StyleSheet.absoluteFill}
                />
              </ImageBackground>
            ) : null}

            <DraggableContent templateId={item.id} offsetsRef={contentOffsets}>
              <ShareCardContent data={sessionData} dark={item.dark} />
            </DraggableContent>
          </View>
        </View>
      </View>
    ),
    [sessionData, styles],
  );

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          ...NATIVE_HEADER_BASE,
          title: "Share Card",
          headerTransparent: true,
          scrollEdgeEffects: { top: "soft" },
          headerLeft: () => (
            <HeaderButton icon="chevron.backward" onPress={() => router.back()} />
          ),
        }}
      />

      {/* Card carousel */}
      <View style={styles.carouselWrapper}>
        <FlatList
          data={TEMPLATES}
          renderItem={renderCard}
          keyExtractor={(t) => t.id}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          getItemLayout={(_, i) => ({
            length: SCREEN_W,
            offset: SCREEN_W * i,
            index: i,
          })}
        />
      </View>

      {/* Dots */}
      <View style={styles.dots}>
        {TEMPLATES.map((t, i) => (
          <View
            key={t.id}
            style={[styles.dot, i === activeIndex && styles.dotActive]}
          />
        ))}
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <ActionButton
          label="Save to Photos"
          onPress={handleSave}
          colors={colors}
          variant="secondary"
        />
        <ActionButton
          label="Share"
          onPress={handleShare}
          colors={colors}
          variant="primary"
        />
      </View>
    </View>
  );
}

// --- Draggable content wrapper (vertical pan to reposition data on card) ---
function DraggableContent({
  children,
  templateId,
  offsetsRef,
}: {
  children: React.ReactNode;
  templateId: string;
  offsetsRef: React.MutableRefObject<Record<string, number>>;
}) {
  const initialY = offsetsRef.current[templateId] || 0;
  const translateY = useRef(new Animated.Value(initialY)).current;
  const savedY = useRef(initialY);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, { dy, dx }) =>
        Math.abs(dy) > 8 && Math.abs(dy) > Math.abs(dx) * 2,
      onPanResponderGrant: () => {
        translateY.setOffset(savedY.current);
        translateY.setValue(0);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      },
      onPanResponderMove: Animated.event(
        [null, { dy: translateY }],
        { useNativeDriver: false },
      ),
      onPanResponderRelease: (_, { dy }) => {
        translateY.flattenOffset();
        const maxY = CARD_H * 0.35;
        const clamped = Math.max(-maxY, Math.min(maxY, savedY.current + dy));
        savedY.current = clamped;
        Animated.spring(translateY, {
          toValue: clamped,
          useNativeDriver: false,
          tension: 80,
          friction: 10,
        }).start();
        offsetsRef.current[templateId] = clamped;
      },
    }),
  ).current;

  return (
    <Animated.View
      style={{ flex: 1, transform: [{ translateY }] }}
      {...panResponder.panHandlers}
    >
      {children}
    </Animated.View>
  );
}

// --- Checkerboard transparency indicator (preview only, not captured) ---
const checkerCols = Math.ceil(CARD_W / CHECKER_SIZE);
const checkerRows = Math.ceil(CARD_H / CHECKER_SIZE);
const checkerCells = Array.from({ length: checkerRows * checkerCols }, (_, i) => i);

function Checkerboard() {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", width: CARD_W, height: CARD_H }}>
      {checkerCells.map((i) => (
        <View
          key={i}
          style={{
            width: CHECKER_SIZE,
            height: CHECKER_SIZE,
            backgroundColor:
              (Math.floor(i / checkerCols) + (i % checkerCols)) % 2 === 0
                ? "#FFFFFF"
                : "#E5E5E5",
          }}
        />
      ))}
    </View>
  );
}

// --- Data content layer ---
function ShareCardContent({
  data,
  dark,
}: {
  data: {
    date: string;
    gymName: string;
    duration: string;
    sends: number;
    bestGrade: string;
    climbs: number;
    discipline: string;
  };
  dark: boolean;
}) {
  const textColor = dark ? "#FFFFFF" : "#000000";
  const subColor = dark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.5)";
  const dividerColor = dark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.1)";

  const disciplineLabel =
    data.discipline === "boulder" ? "Bouldering" :
    data.discipline === "toprope" ? "Top Rope" :
    data.discipline === "lead" ? "Lead" : "Climbing";

  return (
    <View style={contentStyles.wrapper}>
      {/* Brand */}
      <Text style={[contentStyles.brand, { color: subColor }]}>ClimMate</Text>

      {/* Hero stat */}
      <Text style={[contentStyles.heroNumber, { color: textColor }]}>{data.sends}</Text>
      <Text style={[contentStyles.heroLabel, { color: subColor }]}>Sends</Text>

      {/* Divider */}
      <View style={[contentStyles.divider, { backgroundColor: dividerColor }]} />

      {/* KPI row */}
      <View style={contentStyles.kpiRow}>
        <View style={contentStyles.kpiItem}>
          <Text style={[contentStyles.kpiValue, { color: textColor }]}>{data.bestGrade}</Text>
          <Text style={[contentStyles.kpiLabel, { color: subColor }]}>Best</Text>
        </View>
        {data.duration ? (
          <View style={contentStyles.kpiItem}>
            <Text style={[contentStyles.kpiValue, { color: textColor }]}>{data.duration}</Text>
            <Text style={[contentStyles.kpiLabel, { color: subColor }]}>Duration</Text>
          </View>
        ) : null}
        <View style={contentStyles.kpiItem}>
          <Text style={[contentStyles.kpiValue, { color: textColor }]}>{data.climbs}</Text>
          <Text style={[contentStyles.kpiLabel, { color: subColor }]}>Climbs</Text>
        </View>
      </View>

      {/* Footer */}
      <View style={contentStyles.footer}>
        <Text style={[contentStyles.footerGym, { color: textColor }]}>{data.gymName}</Text>
        <Text style={[contentStyles.footerMeta, { color: subColor }]}>
          {data.date} · {disciplineLabel}
        </Text>
      </View>
    </View>
  );
}

const contentStyles = StyleSheet.create({
  wrapper: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  brand: {
    fontSize: 13,
    fontFamily: theme.fonts.bold,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 24,
  },
  heroNumber: {
    fontSize: 64,
    fontWeight: "900",
    fontFamily: theme.fonts.black,
    letterSpacing: -2,
  },
  heroLabel: {
    fontSize: 16,
    fontFamily: theme.fonts.medium,
    marginTop: -4,
    marginBottom: 20,
  },
  divider: {
    width: 40,
    height: 2,
    borderRadius: 1,
    marginBottom: 20,
  },
  kpiRow: {
    flexDirection: "row",
    gap: 28,
    marginBottom: 28,
  },
  kpiItem: {
    alignItems: "center",
  },
  kpiValue: {
    fontSize: 20,
    fontWeight: "700",
    fontFamily: theme.fonts.bold,
  },
  kpiLabel: {
    fontSize: 11,
    fontFamily: theme.fonts.regular,
    marginTop: 2,
  },
  footer: {
    alignItems: "center",
  },
  footerGym: {
    fontSize: 14,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
    marginBottom: 2,
  },
  footerMeta: {
    fontSize: 12,
    fontFamily: theme.fonts.regular,
  },
});

// --- Action button (shared pattern with QR code page) ---
function ActionButton({
  label,
  onPress,
  colors,
  variant,
}: {
  label: string;
  onPress: () => void;
  colors: ReturnType<typeof useThemeColors>;
  variant: "primary" | "secondary";
}) {
  const isPrimary = variant === "primary";
  return (
    <Pressable
      style={({ pressed }) => ({
        flex: 1,
        backgroundColor: isPrimary ? colors.cardDark : colors.backgroundSecondary,
        borderRadius: 14,
        paddingVertical: 14,
        alignItems: "center",
        justifyContent: "center",
        opacity: pressed ? 0.8 : 1,
      })}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Text
        style={{
          fontSize: 15,
          fontWeight: "600",
          fontFamily: theme.fonts.medium,
          color: isPrimary ? "#FFFFFF" : colors.textPrimary,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

// --- Page styles ---
const createStyles = (c: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.background,
    },
    carouselWrapper: {
      flex: 1,
      justifyContent: "center",
    },
    cardSlide: {
      width: SCREEN_W,
      alignItems: "center",
      justifyContent: "center",
      paddingTop: 110,
      paddingHorizontal: CARD_H_PADDING,
    },
    card: {
      width: CARD_W,
      height: CARD_H,
      borderRadius: 20,
      overflow: "hidden",
      backgroundColor: "#000000",
    },
    cardTransparent: {
      backgroundColor: "transparent",
    },
    cardBg: {
      ...StyleSheet.absoluteFillObject,
    },
    dots: {
      flexDirection: "row",
      justifyContent: "center",
      gap: 8,
      paddingVertical: 16,
    },
    dot: {
      width: 7,
      height: 7,
      borderRadius: 3.5,
      backgroundColor: c.border,
    },
    dotActive: {
      backgroundColor: c.textPrimary,
      width: 20,
    },
    actions: {
      flexDirection: "row",
      gap: 12,
      paddingHorizontal: theme.spacing.screenPadding,
      paddingBottom: Platform.OS === "ios" ? 40 : 24,
      paddingTop: 4,
    },
  });
