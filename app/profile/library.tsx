import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { HeaderButton } from "../../src/components/ui/HeaderButton";
import { useLocalSearchParams, useRouter } from "expo-router";
import { setPendingImage } from "src/features/profile/imagePickerBridge";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from "react-native-reanimated";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import { useThemeColors } from "src/lib/useThemeColors";

type AssetItem = {
  id: string;
  uri: string;
  width: number;
  height: number;
};

type MediaLibraryModule = typeof import("expo-media-library");

const INITIAL_PAGE_SIZE = 200;
const LOAD_MORE_SIZE = 200;

export default function LibraryScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const { target } = useLocalSearchParams<{ target?: string }>();

  // 动态加载 expo-media-library
  const [ml, setMl] = useState<MediaLibraryModule | null>(null);
  const [mlError, setMlError] = useState<string | null>(null);

  // 权限 & 数据状态
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [assets, setAssets] = useState<AssetItem[]>([]);
  const [selected, setSelected] = useState<AssetItem | null>(null);

  const [saving, setSaving] = useState(false);

  // Preview container size (measured via onLayout)
  const containerSizeRef = useRef(0);

  // Pagination
  const endCursorRef = useRef<string | undefined>(undefined);
  const hasNextRef = useRef(true);
  const loadingMoreRef = useRef(false);

  // Pinch-to-zoom + pan
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  const pinchGesture = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = Math.min(Math.max(savedScale.value * e.scale, 1), 4);
    })
    .onEnd(() => {
      savedScale.value = scale.value;
      if (scale.value < 1.05) {
        scale.value = withTiming(1);
        savedScale.value = 1;
        translateX.value = withTiming(0);
        translateY.value = withTiming(0);
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
      }
    });

  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      translateX.value = savedTranslateX.value + e.translationX;
      translateY.value = savedTranslateY.value + e.translationY;
    })
    .onEnd(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  const composedGesture = Gesture.Simultaneous(pinchGesture, panGesture);

  const animatedImageStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { translateX: translateX.value },
      { translateY: translateY.value },
    ],
  }));

  // Reset zoom when selection changes
  useEffect(() => {
    scale.value = withTiming(1);
    savedScale.value = 1;
    translateX.value = withTiming(0);
    translateY.value = withTiming(0);
    savedTranslateX.value = 0;
    savedTranslateY.value = 0;
  }, [selected?.id]);

  const canDone = !!selected;

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const mod = await import("expo-media-library");
        if (!mounted) return;
        setMl(mod);
        setMlError(null);

        const perm = await mod.getPermissionsAsync();
        if (!mounted) return;

        if (perm.granted) {
          setPermissionGranted(true);
          await loadAssets(mod);
        } else {
          const req = await mod.requestPermissionsAsync();
          if (!mounted) return;
          setPermissionGranted(req.granted);
          if (req.granted) await loadAssets(mod);
        }
      } catch (e: any) {
        if (!mounted) return;
        setMl(null);
        setPermissionGranted(null);
        setMlError(e?.message ?? "ExpoMediaLibrary is unavailable in this build.");
      }
    })();

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadAssets = async (mod: MediaLibraryModule) => {
    try {
      setLoading(true);
      const page = await mod.getAssetsAsync({
        mediaType: "photo",
        sortBy: [mod.SortBy.creationTime],
        first: INITIAL_PAGE_SIZE,
      });

      endCursorRef.current = page.endCursor;
      hasNextRef.current = page.hasNextPage;

      const list: AssetItem[] = page.assets
        .map((a) => ({
          id: a.id,
          uri: a.uri,
          width: a.width ?? 0,
          height: a.height ?? 0,
        }))
        .filter((x) => !!x.uri);

      setAssets(list);
      if (list.length > 0) setSelected(list[0]);
    } finally {
      setLoading(false);
    }
  };

  const loadMore = useCallback(async () => {
    if (!ml || !hasNextRef.current || loadingMoreRef.current) return;
    loadingMoreRef.current = true;

    try {
      const page = await ml.getAssetsAsync({
        mediaType: "photo",
        sortBy: [ml.SortBy.creationTime],
        first: LOAD_MORE_SIZE,
        after: endCursorRef.current,
      });

      endCursorRef.current = page.endCursor;
      hasNextRef.current = page.hasNextPage;

      const more: AssetItem[] = page.assets
        .map((a) => ({
          id: a.id,
          uri: a.uri,
          width: a.width ?? 0,
          height: a.height ?? 0,
        }))
        .filter((x) => !!x.uri);

      if (more.length > 0) {
        setAssets((prev) => [...prev, ...more]);
      }
    } finally {
      loadingMoreRef.current = false;
    }
  }, [ml]);

  const permissionDenied = useMemo(
    () => permissionGranted === false,
    [permissionGranted]
  );

  const renderThumb = ({ item }: { item: AssetItem }) => {
    const isActive = selected?.id === item.id;
    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => setSelected(item)}
        style={[styles.thumbWrap, isActive && styles.thumbActive]}
      >
        <Image source={{ uri: item.uri }} style={styles.thumb} />
      </TouchableOpacity>
    );
  };

  // fallback: module unavailable
  if (mlError) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.topbar}>
          <HeaderButton icon="chevron.backward" onPress={() => router.back()} />
          <Text style={styles.title}>Library</Text>
          <View style={styles.iconBtn} />
        </View>

        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={28} color={colors.textPrimary} />
          <Text style={[styles.muted, { textAlign: "center", paddingHorizontal: 24 }]}>
            Media Library is not available in this build.
            {"\n"}(Expo Go / simulator may not include ExpoMediaLibrary)
          </Text>
          <Text style={[styles.muted, { fontSize: 12, opacity: 0.8, textAlign: "center" }]}>
            {mlError}
          </Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => router.back()}>
            <Text style={styles.primaryBtnText}>Go back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Loading module/permission
  if (!ml || permissionGranted === null) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.topbar}>
          <HeaderButton icon="chevron.backward" onPress={() => router.back()} />
          <Text style={styles.title}>Library</Text>
          <View style={styles.iconBtn} />
        </View>

        <View style={styles.center}>
          <ActivityIndicator />
          <Text style={styles.muted}>Preparing…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Topbar */}
      <View style={styles.topbar}>
        <HeaderButton icon="chevron.backward" onPress={() => router.back()} />

        <Text style={styles.title}>Library</Text>

        <TouchableOpacity
          style={[styles.iconBtn, (!canDone || saving) && { opacity: 0.35 }]}
          disabled={!canDone || saving}
          onPress={async () => {
            if (!selected) return;

            const userScale = scale.value;
            const tx = translateX.value;
            const ty = translateY.value;
            const hasGesture = userScale > 1.05 || Math.abs(tx) > 2 || Math.abs(ty) > 2;

            if (!hasGesture) {
              // No zoom/pan — pass original image (server can handle center-crop)
              setPendingImage({
                uri: selected.uri,
                target: target === "cover" ? "cover" : "avatar",
              });
              router.back();
              return;
            }

            // Compute crop rect in original image pixels
            setSaving(true);
            try {
              const cs = containerSizeRef.current || 300;
              const imgW = selected.width;
              const imgH = selected.height;
              const coverScale = Math.max(cs / imgW, cs / imgH);
              const displayedW = imgW * coverScale;
              const displayedH = imgH * coverScale;
              const offsetX = (cs - displayedW) / 2;
              const offsetY = (cs - displayedH) / 2;
              const center = cs / 2;

              // Visible area top-left in view-local coords
              const vlX = (0 - center * (1 - userScale) - tx) / userScale;
              const vlY = (0 - center * (1 - userScale) - ty) / userScale;
              const vlSize = cs / userScale;

              // Map to image pixels
              let cropX = (vlX - offsetX) / coverScale;
              let cropY = (vlY - offsetY) / coverScale;
              let cropSize = vlSize / coverScale;

              // Clamp to image bounds
              cropX = Math.max(0, Math.min(cropX, imgW - 1));
              cropY = Math.max(0, Math.min(cropY, imgH - 1));
              cropSize = Math.min(cropSize, imgW - cropX, imgH - cropY);
              cropSize = Math.max(1, cropSize);

              const context = ImageManipulator.manipulate(selected.uri);
              context.crop({
                originX: Math.round(cropX),
                originY: Math.round(cropY),
                width: Math.round(cropSize),
                height: Math.round(cropSize),
              });
              const ref = await context.renderAsync();
              const result = await ref.saveAsync({ format: SaveFormat.JPEG, compress: 0.9 });

              setPendingImage({
                uri: result.uri,
                target: target === "cover" ? "cover" : "avatar",
              });
              router.back();
            } catch (e: any) {
              if (__DEV__) console.warn("Crop failed:", e?.message);
              // Fallback: use original
              setPendingImage({
                uri: selected.uri,
                target: target === "cover" ? "cover" : "avatar",
              });
              router.back();
            } finally {
              setSaving(false);
            }
          }}
        >
          {saving ? (
            <ActivityIndicator size="small" color={colors.textPrimary} />
          ) : (
            <Ionicons name="checkmark" size={24} color={colors.textPrimary} />
          )}
        </TouchableOpacity>
      </View>

      {/* Preview square with pinch-to-zoom + pan */}
      <View style={styles.previewWrap}>
        <View
          style={styles.previewSquare}
          onLayout={(e) => { containerSizeRef.current = e.nativeEvent.layout.width; }}
        >
          {selected ? (
            <GestureDetector gesture={composedGesture}>
              <Animated.View style={[{ width: "100%", height: "100%" }, animatedImageStyle]}>
                <Image source={{ uri: selected.uri }} style={styles.previewImage} />
              </Animated.View>
            </GestureDetector>
          ) : (
            <View style={styles.previewEmpty}>
              <Ionicons name="image-outline" size={28} color="rgba(255,255,255,0.7)" />
              <Text style={styles.previewHint}>Select a photo</Text>
            </View>
          )}

          {/* Crop circle overlay (avatar only) */}
          {target !== "cover" && (
            <View pointerEvents="none" style={styles.cropCircle} />
          )}
        </View>
      </View>

      {/* Grid */}
      <View style={styles.gridWrap}>
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator />
            <Text style={styles.muted}>Loading photos…</Text>
          </View>
        ) : permissionDenied ? (
          <View style={styles.center}>
            <Text style={styles.muted}>Photo permission denied.</Text>
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={async () => {
                const res = await ml.requestPermissionsAsync();
                setPermissionGranted(res.granted);
                if (res.granted) await loadAssets(ml);
              }}
            >
              <Text style={styles.primaryBtnText}>Grant permission</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={assets}
            keyExtractor={(it) => it.id}
            renderItem={renderThumb}
            numColumns={3}
            columnWrapperStyle={{ gap: 6 }}
            contentContainerStyle={{ gap: 6, paddingBottom: 12 }}
            showsVerticalScrollIndicator={false}
            onEndReached={loadMore}
            onEndReachedThreshold={0.5}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const createStyles = (colors: ReturnType<typeof useThemeColors>) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  topbar: {
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.cardBorder,
    justifyContent: "space-between",
  },
  iconBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 16, fontWeight: "700", color: colors.textPrimary },

  previewWrap: { paddingHorizontal: 16, paddingTop: 16 },
  previewSquare: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 18,
    backgroundColor: "#0B1220",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  previewImage: { width: "100%", height: "100%", resizeMode: "cover" },
  previewEmpty: { alignItems: "center", justifyContent: "center" },
  previewHint: {
    marginTop: 8,
    color: "rgba(255,255,255,0.75)",
    fontWeight: "600",
  },
  cropCircle: {
    position: "absolute",
    width: "72%",
    height: "72%",
    borderRadius: 999,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.92)",
  },

  gridWrap: { flex: 1, padding: 16 },

  thumbWrap: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 10,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  thumbActive: { borderColor: colors.textPrimary },
  thumb: { width: "100%", height: "100%" },

  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
  muted: { color: colors.chartLabel, fontWeight: "600" },
  primaryBtn: {
    marginTop: 6,
    paddingHorizontal: 14,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.pillBackground,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnText: { color: colors.pillText, fontWeight: "700" },
});
