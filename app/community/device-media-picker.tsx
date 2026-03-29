// app/community/device-media-picker.tsx
// Custom media picker: Select photos/videos from device library → Return to caller

import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useLayoutEffect,
  useRef,
} from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  FlatList,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useNavigation } from "@react-navigation/native";
import { useThemeColors } from "src/lib/useThemeColors";
import { theme } from "src/lib/theme";
import { TrueSheet } from "@lodev09/react-native-true-sheet";
import { setPendingMedia } from "src/features/community/pendingMedia";
import type { PickedMediaItem } from "src/features/community/types";

// --- Types ---
type AssetItem = {
  id: string;
  uri: string;
  mediaType: "photo" | "video";
  width: number;
  height: number;
  duration: number; // seconds, 0 for photos
};

type AlbumItem = { id: string; title: string; assetCount: number };

type MediaLibraryModule = typeof import("expo-media-library");

// --- Constants ---
const MAX_SELECT = 10;
const INITIAL_PAGE_SIZE = 200;
const LOAD_MORE_SIZE = 200;
const { width: SCREEN_WIDTH } = Dimensions.get("window");
const SELECT_COLUMNS = 3;
const SELECT_ITEM_SIZE = (SCREEN_WIDTH - (SELECT_COLUMNS - 1) * 2) / SELECT_COLUMNS;

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function DeviceMediaPickerScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const navigation = useNavigation();
  const { mode: routeMode } = useLocalSearchParams<{ mode?: string }>();
  const isInitial = routeMode === "initial";

  // --- Media Library ---
  const [ml, setMl] = useState<MediaLibraryModule | null>(null);
  const [mlError, setMlError] = useState<string | null>(null);
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [assets, setAssets] = useState<AssetItem[]>([]);

  // --- Albums ---
  const [albums, setAlbums] = useState<AlbumItem[]>([]);
  const [selectedAlbum, setSelectedAlbum] = useState<AlbumItem | null>(null);
  const albumSheetRef = useRef<TrueSheet>(null);
  const selectedAlbumRef = useRef<AlbumItem | null>(null);

  // --- Pagination ---
  const endCursorRef = useRef<string | undefined>(undefined);
  const hasNextRef = useRef(true);
  const loadingMoreRef = useRef(false);

  // --- Selection (ordered array) ---
  const [selectedItems, setSelectedItems] = useState<AssetItem[]>([]);

  // --- Selected lookup for O(1) ---
  const selectedIdSet = useMemo(
    () => new Set(selectedItems.map((s) => s.id)),
    [selectedItems]
  );

  const selectedIndexMap = useMemo(() => {
    const map = new Map<string, number>();
    selectedItems.forEach((item, idx) => map.set(item.id, idx));
    return map;
  }, [selectedItems]);

  // --- Load media library ---
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
        setMlError(
          e?.message ?? "ExpoMediaLibrary is unavailable in this build."
        );
      }
    })();

    return () => {
      mounted = false;
    };
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
      // Silently fail
    }
  };

  const loadAssets = async (
    mod: MediaLibraryModule,
    album?: AlbumItem | null
  ) => {
    try {
      setLoading(true);
      const page = await mod.getAssetsAsync({
        mediaType: [mod.MediaType.photo, mod.MediaType.video],
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
          mediaType: (a.mediaType === "video" ? "video" : "photo") as
            | "photo"
            | "video",
          width: a.width ?? 0,
          height: a.height ?? 0,
          duration: a.duration ?? 0,
        }))
        .filter((x) => !!x.uri);

      setAssets(list);
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
        mediaType: [ml.MediaType.photo, ml.MediaType.video],
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
          mediaType: (a.mediaType === "video" ? "video" : "photo") as
            | "photo"
            | "video",
          width: a.width ?? 0,
          height: a.height ?? 0,
          duration: a.duration ?? 0,
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
    [ml]
  );

  // --- Selection toggle ---
  const toggleSelect = useCallback((item: AssetItem) => {
    setSelectedItems((prev) => {
      const idx = prev.findIndex((s) => s.id === item.id);
      if (idx >= 0) {
        return prev.filter((_, i) => i !== idx);
      } else if (prev.length < MAX_SELECT) {
        return [...prev, item];
      }
      return prev;
    });
  }, []);

  // --- Next handler ---
  const handleNext = useCallback(() => {
    const mapped: PickedMediaItem[] = selectedItems.map((a) => ({
      id: a.id,
      uri: a.uri,
      mediaType: a.mediaType === "video" ? "video" : "image",
      width: a.width,
      height: a.height,
      duration: a.duration || undefined,
    }));
    setPendingMedia(mapped);

    if (isInitial) {
      // From Community "+": push forward to create page
      router.push('/community/create?fromPicker=1');
    } else {
      // From Create "Add Media": go back to create
      router.back();
    }
  }, [selectedItems, router, isInitial]);

  // --- Stable refs for header ---
  const handleNextRef = useRef(handleNext);
  handleNextRef.current = handleNext;

  // --- Native header ---
  useLayoutEffect(() => {
    navigation.setOptions({
      headerTransparent: true,
      headerTitle: () => (
        <TouchableOpacity
          style={styles.albumPickerBtn}
          activeOpacity={0.7}
          onPress={() => albumSheetRef.current?.present()}
        >
          <Text style={styles.albumPickerText}>
            {selectedAlbum?.title ?? "All Photos"}
          </Text>
          <Ionicons
            name="chevron-down"
            size={14}
            color={colors.textPrimary}
          />
        </TouchableOpacity>
      ),
      headerLeft: () => (
        <Pressable
          onPress={() => router.back()}
          hitSlop={8}
          style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
        >
          <Ionicons name="chevron-back" size={28} color={colors.textPrimary} />
        </Pressable>
      ),
      headerRight: () => (
        <Pressable
          onPress={() => handleNextRef.current()}
          disabled={selectedItems.length === 0}
          style={({ pressed }) => [
            styles.headerPill,
            selectedItems.length === 0 && styles.headerPillDisabled,
            { opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <Text style={styles.headerPillText}>
            {selectedItems.length > 0 ? `Next (${selectedItems.length})` : "Next"}
          </Text>
        </Pressable>
      ),
    });
  }, [navigation, selectedAlbum, selectedItems.length, colors, isInitial]);

  const permissionDenied = permissionGranted === false;

  // --- Render: select grid cell ---
  const renderSelectItem = useCallback(
    ({ item }: { item: AssetItem }) => {
      const isSelected = selectedIdSet.has(item.id);
      const selIdx = selectedIndexMap.get(item.id);
      const atMax = selectedItems.length >= MAX_SELECT;
      const disabled = !isSelected && atMax;

      return (
        <TouchableOpacity
          onPress={() => toggleSelect(item)}
          disabled={disabled}
          activeOpacity={0.8}
          style={[
            styles.selectCell,
            { width: SELECT_ITEM_SIZE, height: SELECT_ITEM_SIZE },
          ]}
        >
          <Image
            source={{ uri: item.uri }}
            style={StyleSheet.absoluteFill}
            recyclingKey={item.id}
          />

          {/* Selected overlay */}
          {isSelected && <View style={styles.selectedOverlay} />}

          {/* Disabled overlay */}
          {disabled && <View style={styles.disabledOverlay} />}

          {/* Number badge */}
          {isSelected && selIdx !== undefined && (
            <View style={styles.numberBadge}>
              <Text style={styles.numberBadgeText}>{selIdx + 1}</Text>
            </View>
          )}

          {/* Unselected circle */}
          {!isSelected && !disabled && (
            <View style={styles.emptyBadge} />
          )}

          {/* Video duration */}
          {item.mediaType === "video" && item.duration > 0 && (
            <View style={styles.durationBadge}>
              <Text style={styles.durationText}>
                {formatDuration(item.duration)}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      );
    },
    [selectedIdSet, selectedIndexMap, selectedItems.length, toggleSelect]
  );

  const listHeader = useMemo(() => (
    <View style={styles.hintRow}>
      <Text style={styles.hintText}>
        Select up to {MAX_SELECT} photos & videos
      </Text>
      {selectedItems.length > 0 && (
        <Text style={styles.hintCount}>
          {selectedItems.length}/{MAX_SELECT}
        </Text>
      )}
    </View>
  ), [selectedItems.length, styles]);

  // --- Fallback: module unavailable ---
  if (mlError) {
    return (
      <View style={styles.container}>
        <View style={styles.center}>
          <Ionicons
            name="alert-circle-outline"
            size={28}
            color={colors.textPrimary}
          />
          <Text
            style={[
              styles.muted,
              { textAlign: "center", paddingHorizontal: 24 },
            ]}
          >
            Media Library is not available in this build.
          </Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => router.back()}>
            <Text style={styles.primaryBtnText}>Go back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // --- Loading initial ---
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
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator />
          <Text style={styles.muted}>Loading photos...</Text>
        </View>
      ) : permissionDenied ? (
        <View style={styles.center}>
          <Ionicons
            name="images-outline"
            size={40}
            color={colors.textTertiary}
          />
          <Text style={styles.muted}>Photo permission denied.</Text>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={async () => {
              if (!ml) return;
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
        <FlatList
          data={assets}
          keyExtractor={(it) => it.id}
          renderItem={renderSelectItem}
          numColumns={SELECT_COLUMNS}
          ListHeaderComponent={listHeader}
          columnWrapperStyle={{ gap: 2 }}
          contentContainerStyle={{ gap: 2, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          contentInsetAdjustmentBehavior="automatic"
        />
      )}

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

// --- Styles ---
const createStyles = (colors: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },

    // --- Hint bar ---
    hintRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingVertical: 10,
    },
    hintText: {
      fontSize: 13,
      fontFamily: theme.fonts.regular,
      color: colors.textSecondary,
    },
    hintCount: {
      fontSize: 13,
      fontFamily: theme.fonts.medium,
      fontWeight: "600",
      color: colors.accent,
    },

    // --- Album picker button (header) ---
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

    // --- Select grid cell ---
    selectCell: {
      overflow: "hidden",
    },
    selectedOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(48,110,111,0.2)",
    },
    disabledOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(255,255,255,0.5)",
    },
    numberBadge: {
      position: "absolute",
      top: 6,
      right: 6,
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: "#306E6F",
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 2,
      borderColor: "#fff",
    },
    numberBadgeText: {
      color: "#fff",
      fontSize: 11,
      fontWeight: "700",
      fontFamily: theme.fonts.bold,
    },
    emptyBadge: {
      position: "absolute",
      top: 6,
      right: 6,
      width: 24,
      height: 24,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: "rgba(255,255,255,0.7)",
      backgroundColor: "rgba(0,0,0,0.15)",
    },
    durationBadge: {
      position: "absolute",
      bottom: 5,
      right: 5,
      backgroundColor: "rgba(0,0,0,0.55)",
      borderRadius: 4,
      paddingHorizontal: 5,
      paddingVertical: 2,
    },
    durationText: {
      color: "#fff",
      fontSize: 10,
      fontFamily: theme.fonts.monoMedium,
    },

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

    // --- Header text button ---
    headerPill: {
      paddingVertical: 4,
      paddingHorizontal: 8,
    },
    headerPillDisabled: {
      opacity: 0.35,
    },
    headerPillText: {
      color: colors.accent,
      fontSize: 17,
      fontWeight: "600",
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
