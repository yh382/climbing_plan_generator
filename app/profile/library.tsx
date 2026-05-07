import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { HeaderButton } from "../../src/components/ui/HeaderButton";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useNavigation } from "@react-navigation/native";
import { setPendingImage } from "src/features/profile/imagePickerBridge";
import { GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedScrollHandler,
  interpolate,
  Extrapolation,
} from "react-native-reanimated";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import { useThemeColors } from "src/lib/useThemeColors";
import { TrueSheet } from "@lodev09/react-native-true-sheet";
import { theme } from "src/lib/theme";
import { useCropGesture } from "src/features/profile/hooks/useCropGesture";
import CropOverlay from "src/features/profile/components/CropOverlay";

type AssetItem = {
  id: string;
  uri: string;
  width: number;
  height: number;
};

type AlbumItem = { id: string; title: string; assetCount: number };

type MediaLibraryModule = typeof import("expo-media-library");

const INITIAL_PAGE_SIZE = 200;
const LOAD_MORE_SIZE = 200;
const { width: SCREEN_WIDTH } = Dimensions.get("window");
const PREVIEW_MAX = SCREEN_WIDTH;
const PREVIEW_MIN = 80;
const COLLAPSE_DISTANCE = PREVIEW_MAX - PREVIEW_MIN;

export default function LibraryScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const navigation = useNavigation();
  const { target } = useLocalSearchParams<{ target?: string }>();
  const mode: "avatar" | "cover" = target === "cover" ? "cover" : "avatar";

  // --- Media library ---
  const [ml, setMl] = useState<MediaLibraryModule | null>(null);
  const [mlError, setMlError] = useState<string | null>(null);
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [assets, setAssets] = useState<AssetItem[]>([]);
  const [selected, setSelected] = useState<AssetItem | null>(null);
  const [saving, setSaving] = useState(false);

  // --- Albums ---
  const [albums, setAlbums] = useState<AlbumItem[]>([]);
  const [selectedAlbum, setSelectedAlbum] = useState<AlbumItem | null>(null);
  const albumSheetRef = useRef<TrueSheet>(null);
  const selectedAlbumRef = useRef<AlbumItem | null>(null);

  // --- Pagination ---
  const endCursorRef = useRef<string | undefined>(undefined);
  const hasNextRef = useRef(true);
  const loadingMoreRef = useRef(false);

  // --- Preview container size ---
  const containerSizeRef = useRef(SCREEN_WIDTH - 32);

  // --- Collapsible preview ---
  const gridScrollY = useSharedValue(0);
  const gridRef = useRef<Animated.FlatList<AssetItem>>(null);

  const previewAnimStyle = useAnimatedStyle(() => {
    const h = interpolate(
      gridScrollY.value,
      [0, COLLAPSE_DISTANCE],
      [PREVIEW_MAX, PREVIEW_MIN],
      Extrapolation.CLAMP,
    );
    return { height: h };
  });

  // --- Crop gesture ---
  const gesture = useCropGesture({
    mode,
    selectedId: selected?.id,
    imageWidth: selected?.width ?? 0,
    imageHeight: selected?.height ?? 0,
  });

  const canDone = !!selected;

  // --- Done handler ---
  const handleDone = useCallback(async () => {
    if (!selected) return;

    const { scale: userScale, translateX: tx, translateY: ty } = gesture.getGestureState();
    const hasGesture = userScale > 1.05 || Math.abs(tx) > 2 || Math.abs(ty) > 2;

    if (!hasGesture) {
      setPendingImage({ uri: selected.uri, target: mode });
      router.back();
      return;
    }

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

      const context = ImageManipulator.manipulate(selected.uri);

      if (mode === "cover") {
        // 16:9 crop
        const cropRectH = cs * (9 / 16);
        const cropRectY = (cs - cropRectH) / 2;

        const vlX = (0 - center * (1 - userScale) - tx) / userScale;
        const vlY = (cropRectY - center * (1 - userScale) - ty) / userScale;
        const vlW = cs / userScale;
        const vlH = cropRectH / userScale;

        let cropX = (vlX - offsetX) / coverScale;
        let cropY = (vlY - offsetY) / coverScale;
        let cropW = vlW / coverScale;
        let cropH = vlH / coverScale;

        cropX = Math.max(0, Math.min(cropX, imgW - 1));
        cropY = Math.max(0, Math.min(cropY, imgH - 1));
        cropW = Math.min(Math.max(1, cropW), imgW - cropX);
        cropH = Math.min(Math.max(1, cropH), imgH - cropY);

        context.crop({
          originX: Math.round(cropX),
          originY: Math.round(cropY),
          width: Math.round(cropW),
          height: Math.round(cropH),
        });
      } else {
        // Square crop (avatar)
        const vlX = (0 - center * (1 - userScale) - tx) / userScale;
        const vlY = (0 - center * (1 - userScale) - ty) / userScale;
        const vlSize = cs / userScale;

        let cropX = (vlX - offsetX) / coverScale;
        let cropY = (vlY - offsetY) / coverScale;
        let cropSize = vlSize / coverScale;

        cropX = Math.max(0, Math.min(cropX, imgW - 1));
        cropY = Math.max(0, Math.min(cropY, imgH - 1));
        cropSize = Math.min(cropSize, imgW - cropX, imgH - cropY);
        cropSize = Math.max(1, cropSize);

        context.crop({
          originX: Math.round(cropX),
          originY: Math.round(cropY),
          width: Math.round(cropSize),
          height: Math.round(cropSize),
        });
      }

      const ref = await context.renderAsync();
      const result = await ref.saveAsync({ format: SaveFormat.JPEG, compress: 0.9 });
      setPendingImage({ uri: result.uri, target: mode });
      router.back();
    } catch (e: any) {
      if (__DEV__) console.warn("Crop failed:", e?.message);
      setPendingImage({ uri: selected.uri, target: mode });
      router.back();
    } finally {
      setSaving(false);
    }
  }, [selected, mode, gesture, router]);

  // --- Native header ---
  useLayoutEffect(() => {
    navigation.setOptions({
      title: "",
      headerRight: () => (
        <HeaderButton
          icon="checkmark"
          onPress={handleDone}
          disabled={!canDone || saving}
        />
      ),
      headerTitle: () => (
        <TouchableOpacity
          style={styles.albumPickerBtn}
          activeOpacity={0.7}
          onPress={() => albumSheetRef.current?.present()}
        >
          <Text style={styles.albumPickerText}>
            {selectedAlbum?.title ?? "All Photos"}
          </Text>
          <Ionicons name="chevron-down" size={14} color={colors.textPrimary} />
        </TouchableOpacity>
      ),
    });
  }, [navigation, canDone, saving, selectedAlbum, colors, handleDone]);

  // --- Grid scroll handler ---
  const gridScrollHandler = useAnimatedScrollHandler((event) => {
    gridScrollY.value = event.contentOffset.y;
  });

  // --- Load media library & albums ---
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
          await loadAlbums(mod);
        } else {
          const req = await mod.requestPermissionsAsync();
          if (!mounted) return;
          setPermissionGranted(req.granted);
          if (req.granted) {
            await loadAssets(mod);
            await loadAlbums(mod);
          }
        }
      } catch (e: any) {
        if (!mounted) return;
        setMl(null);
        setPermissionGranted(null);
        setMlError(e?.message ?? "ExpoMediaLibrary is unavailable in this build.");
      }
    })();

    return () => { mounted = false; };
  }, []);

  const loadAlbums = async (mod: MediaLibraryModule) => {
    try {
      const raw = await mod.getAlbumsAsync({ includeSmartAlbums: true });
      const list: AlbumItem[] = raw
        .filter((a) => a.assetCount > 0)
        .map((a) => ({ id: a.id, title: a.title, assetCount: a.assetCount }))
        .sort((a, b) => b.assetCount - a.assetCount);
      setAlbums(list);
    } catch {
      // Silently fail — album picker just won't show albums
    }
  };

  const loadAssets = async (mod: MediaLibraryModule, album?: AlbumItem | null) => {
    try {
      setLoading(true);
      const page = await mod.getAssetsAsync({
        mediaType: "photo",
        sortBy: [mod.SortBy.creationTime],
        first: INITIAL_PAGE_SIZE,
        ...(album ? { album: album.id } : {}),
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
      else setSelected(null);
    } finally {
      setLoading(false);
    }
  };

  const loadMore = useCallback(async () => {
    if (!ml || !hasNextRef.current || loadingMoreRef.current) return;
    loadingMoreRef.current = true;

    try {
      const album = selectedAlbumRef.current;
      const page = await ml.getAssetsAsync({
        mediaType: "photo",
        sortBy: [ml.SortBy.creationTime],
        first: LOAD_MORE_SIZE,
        after: endCursorRef.current,
        ...(album ? { album: album.id } : {}),
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

  const handleAlbumSelect = useCallback(
    (album: AlbumItem | null) => {
      setSelectedAlbum(album);
      selectedAlbumRef.current = album;
      albumSheetRef.current?.dismiss();
      if (ml) loadAssets(ml, album);
    },
    [ml],
  );

  const permissionDenied = permissionGranted === false;

  const renderThumb = ({ item }: { item: AssetItem }) => {
    const isActive = selected?.id === item.id;
    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => {
          setSelected(item);
          // Expand preview when selecting a new photo
          if (item.id !== selected?.id) {
            (gridRef.current as any)?.scrollToOffset?.({ offset: 0, animated: true });
          }
        }}
        style={[styles.thumbWrap, isActive && styles.thumbActive]}
      >
        <Image source={{ uri: item.uri }} style={styles.thumb} />
      </TouchableOpacity>
    );
  };

  // --- Fallback: module unavailable ---
  if (mlError) {
    return (
      <View style={styles.container}>
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
      </View>
    );
  }

  // --- Loading ---
  if (!ml || permissionGranted === null) {
    return (
      <View style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator />
          <Text style={styles.muted}>Preparing...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Collapsible preview */}
      <Animated.View style={[styles.previewWrap, previewAnimStyle]}>
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => {
            (gridRef.current as any)?.scrollToOffset?.({ offset: 0, animated: true });
          }}
          style={styles.previewInner}
        >
          <View
            style={styles.previewSquare}
            onLayout={(e) => {
              const w = e.nativeEvent.layout.width;
              containerSizeRef.current = w;
              gesture.setContainerSize(w);
            }}
          >
            {selected ? (
              <GestureDetector gesture={gesture.composedGesture}>
                <Animated.View
                  style={[{ width: "100%", height: "100%" }, gesture.animatedImageStyle]}
                >
                  <Image
                    source={{ uri: selected.uri }}
                    style={styles.previewImage}
                    pointerEvents="none"
                  />
                </Animated.View>
              </GestureDetector>
            ) : (
              <View style={styles.previewEmpty}>
                <Ionicons name="image-outline" size={28} color="rgba(255,255,255,0.7)" />
                <Text style={styles.previewHint}>Select a photo</Text>
              </View>
            )}

            <CropOverlay
              mode={mode}
              containerSize={containerSizeRef.current}
            />
          </View>
        </TouchableOpacity>
      </Animated.View>

      {/* Grid */}
      <View style={styles.gridWrap}>
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator />
            <Text style={styles.muted}>Loading photos...</Text>
          </View>
        ) : permissionDenied ? (
          <View style={styles.center}>
            <Text style={styles.muted}>Photo permission denied.</Text>
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={async () => {
                const res = await ml.requestPermissionsAsync();
                setPermissionGranted(res.granted);
                if (res.granted) {
                  await loadAssets(ml);
                  await loadAlbums(ml);
                }
              }}
            >
              <Text style={styles.primaryBtnText}>Grant permission</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <Animated.FlatList
            ref={gridRef as any}
            data={assets}
            keyExtractor={(it) => it.id}
            renderItem={renderThumb}
            numColumns={3}
            columnWrapperStyle={{ gap: 2 }}
            contentContainerStyle={{ gap: 2, paddingBottom: 12 }}
            showsVerticalScrollIndicator={false}
            onEndReached={loadMore}
            onEndReachedThreshold={0.5}
            onScroll={gridScrollHandler}
            scrollEventThrottle={16}
            contentInsetAdjustmentBehavior="automatic"
          />
        )}
      </View>

      {/* Album picker sheet */}
      <TrueSheet
        ref={albumSheetRef}
        detents={["auto"]}
        backgroundColor={colors.sheetBackground}
        grabberOptions={{ height: 3, width: 36, topMargin: 6 }}
        dimmed
        dimmedDetentIndex={0}
      >
        <View style={styles.albumSheetHeader}>
          <Text style={styles.albumSheetTitle}>Albums</Text>
        </View>

        <TouchableOpacity
          style={[
            styles.albumRow,
            !selectedAlbum && styles.albumRowActive,
          ]}
          activeOpacity={0.75}
          onPress={() => handleAlbumSelect(null)}
        >
          <Text style={styles.albumRowText}>All Photos</Text>
        </TouchableOpacity>

        {albums.map((a) => (
          <TouchableOpacity
            key={a.id}
            style={[
              styles.albumRow,
              selectedAlbum?.id === a.id && styles.albumRowActive,
            ]}
            activeOpacity={0.75}
            onPress={() => handleAlbumSelect(a)}
          >
            <Text style={styles.albumRowText}>{a.title}</Text>
            <Text style={styles.albumRowCount}>{a.assetCount}</Text>
          </TouchableOpacity>
        ))}

        <View style={{ height: 20 }} />
      </TrueSheet>
    </View>
  );
}

const createStyles = (colors: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },

    // --- Album picker button (in native header) ---
    albumPickerBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    albumPickerText: {
      fontSize: 16,
      fontWeight: "700",
      fontFamily: theme.fonts.bold,
      color: colors.textPrimary,
    },

    // --- Preview ---
    previewWrap: {
      overflow: "hidden",
    },
    previewInner: {
      flex: 1,
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 8,
    },
    previewSquare: {
      width: "100%",
      flex: 1,
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

    // --- Grid ---
    gridWrap: { flex: 1 },

    thumbWrap: {
      flex: 1,
      aspectRatio: 1,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: "transparent",
    },
    thumbActive: { borderColor: colors.textPrimary, borderWidth: 2 },
    thumb: { width: "100%", height: "100%" },

    // --- Album sheet ---
    albumSheetHeader: {
      paddingHorizontal: 22,
      paddingTop: 20,
      paddingBottom: 14,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.cardBorder,
    },
    albumSheetTitle: {
      fontSize: 15,
      fontWeight: "600",
      fontFamily: theme.fonts.bold,
      color: colors.textPrimary,
      textAlign: "center",
    },
    albumRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 22,
      height: 50,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.cardBorder,
    },
    albumRowActive: {
      backgroundColor: colors.backgroundSecondary,
    },
    albumRowText: {
      fontSize: 15,
      fontWeight: "500",
      fontFamily: theme.fonts.medium,
      color: colors.textPrimary,
    },
    albumRowCount: {
      fontSize: 13,
      fontWeight: "400",
      color: colors.chartLabel,
    },

    // --- Shared ---
    center: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
    },
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
