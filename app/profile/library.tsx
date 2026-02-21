import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

type AssetItem = {
  id: string;
  uri: string;
  width: number;
  height: number;
};

type MediaLibraryModule = typeof import("expo-media-library");

export default function LibraryScreen() {
  const router = useRouter();

  // ✅ 动态加载 expo-media-library，避免 native module 缺失时启动即崩
  const [ml, setMl] = useState<MediaLibraryModule | null>(null);
  const [mlError, setMlError] = useState<string | null>(null);

  // 权限 & 数据状态
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [assets, setAssets] = useState<AssetItem[]>([]);
  const [selected, setSelected] = useState<AssetItem | null>(null);

  const canDone = !!selected;

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const mod = await import("expo-media-library");
        if (!mounted) return;
        setMl(mod);
        setMlError(null);

        // 这里直接请求权限（不使用 usePermissions hook，避免 hook 依赖模块存在）
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
        first: 60,
      });

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

  // ✅ fallback：模块不可用时，页面仍能打开，不会影响 App 启动
  if (mlError) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.topbar}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color="#0F172A" />
          </TouchableOpacity>
          <Text style={styles.title}>Library</Text>
          <View style={styles.iconBtn} />
        </View>

        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={28} color="#0F172A" />
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

  // 加载模块/权限中的过渡态
  if (!ml || permissionGranted === null) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.topbar}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color="#0F172A" />
          </TouchableOpacity>
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
        <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#0F172A" />
        </TouchableOpacity>

        <Text style={styles.title}>Library</Text>

        <TouchableOpacity
          style={[styles.iconBtn, !canDone && { opacity: 0.35 }]}
          disabled={!canDone}
          onPress={() => {
            // 先不回传，暂时直接返回
            router.back();
          }}
        >
          <Ionicons name="checkmark" size={24} color="#0F172A" />
        </TouchableOpacity>
      </View>

      {/* Preview square */}
      <View style={styles.previewWrap}>
        <View style={styles.previewSquare}>
          {selected ? (
            <Image source={{ uri: selected.uri }} style={styles.previewImage} />
          ) : (
            <View style={styles.previewEmpty}>
              <Ionicons name="image-outline" size={28} color="rgba(255,255,255,0.7)" />
              <Text style={styles.previewHint}>Select a photo</Text>
            </View>
          )}

          {/* 圆形裁切框（静态） */}
          <View pointerEvents="none" style={styles.cropCircle} />
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
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },

  topbar: {
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E2E8F0",
    justifyContent: "space-between",
  },
  iconBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 16, fontWeight: "700", color: "#0F172A" },

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
    borderColor: "#E2E8F0",
  },
  thumbActive: { borderColor: "#111827" },
  thumb: { width: "100%", height: "100%" },

  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
  muted: { color: "#64748B", fontWeight: "600" },
  primaryBtn: {
    marginTop: 6,
    paddingHorizontal: 14,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#111827",
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnText: { color: "#FFFFFF", fontWeight: "700" },
});
