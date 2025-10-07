import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, FlatList, ActivityIndicator, Platform } from "react-native";
import MapboxGL from "@rnmapbox/maps";
import * as Location from "expo-location";
import Constants from "expo-constants";
import { SafeAreaView } from "react-native-safe-area-context";
import { searchGymsNearby, type GymPlace } from "../../lib/poi";
import BottomSheet, { BottomSheetView } from "@gorhom/bottom-sheet";
import type { Feature, Point } from "geojson";

type LatLng = { lat: number; lng: number };

const MILES_30_IN_METERS = 30 * 1609.344;
const SNAP_POINTS = ["16%", "50%", "88%"] as const;

const MAPBOX_TOKEN = (Constants.expoConfig?.extra as any)?.MAPBOX_TOKEN as string;

MapboxGL.setAccessToken(MAPBOX_TOKEN);

export default function GymsScreen() {
  const mapRef = useRef<MapboxGL.MapView>(null);
  const camRef = useRef<MapboxGL.Camera>(null);
  const bsRef = useRef<BottomSheet>(null);
  const [sheetIndex, setSheetIndex] = useState(0);
  const [query, setQuery] = useState("");
  const [userLoc, setUserLoc] = useState<LatLng | null>(null);
  const [center, setCenter] = useState<LatLng | null>(null);
  const [gyms, setGyms] = useState<GymPlace[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [is3D, setIs3D] = useState(false);
  const [styleId, setStyleId] = useState<"outdoors" | "satellite">("outdoors");

  // 初次定位
  useEffect(() => {
    (async () => {
      try {
        setError(null);
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          setError("未授权定位。你可以在搜索栏输入地址或城市。");
          return;
        }
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        const c = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLoc(c);
        setCenter(c);
        camRef.current?.setCamera({
          centerCoordinate: [c.lng, c.lat],
          zoomLevel: 11,
          animationDuration: 600,
        });
        fetchNearby(c, "");
      } catch (e: any) {
        setError(e?.message ?? "定位失败");
      }
    })();
  }, []);

  // 拉取附近岩馆
  const fetchNearby = useCallback(
    async (c: LatLng, q: string) => {
      setLoading(true);
      setError(null);
      try {
        const list = await searchGymsNearby(c, 30, q);
        setGyms(list);
      } catch (e: any) {
        setError(e?.message ?? "获取附近岩馆失败");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // 地图移动结束，节流触发刷新
  type RegionEvent = {
    geometry?: { type: "Point"; coordinates: [number, number] };
    properties?: {
      visibleBounds?: [[number, number], [number, number]]; // [[swLng, swLat], [neLng, neLat]]
      zoomLevel?: number;
      pitch?: number;
      heading?: number;
    };
  };

const onRegionDidChange = useCallback(
  (f?: Feature<Point, any>) => {
    if (!f) return;

    let lat: number | undefined;
    let lng: number | undefined;

    // 1) 优先从 geometry 读中心点（Position = number[]，长度≥2）
    const coords = f.geometry?.coordinates;
    if (Array.isArray(coords) && coords.length >= 2) {
      lng = Number(coords[0]);
      lat = Number(coords[1]);
    }

    // 2) 若没拿到 geometry，再从 properties.visibleBounds 求中心
    const vb = (f.properties as any)?.visibleBounds;
    if ((lat === undefined || lng === undefined) && Array.isArray(vb) && vb.length >= 2) {
      const sw = vb[0], ne = vb[1];
      if (Array.isArray(sw) && sw.length >= 2 && Array.isArray(ne) && ne.length >= 2) {
        lng = (Number(sw[0]) + Number(ne[0])) / 2;
        lat = (Number(sw[1]) + Number(ne[1])) / 2;
      }
    }

    if (typeof lat !== "number" || typeof lng !== "number") return;

    const c = { lat, lng };
    setCenter(c);

    // 仅在面板未全展开时自动刷新
    if (sheetIndex <= 1) {
      fetchNearby(c, query);
    }
  },
  [fetchNearby, query, sheetIndex]
);


  // 搜索提交
  const onSubmitSearch = useCallback(() => {
    if (!center) return;
    fetchNearby(center, query.trim());
  }, [center, query, fetchNearby]);

  // 列表点击 -> 相机聚焦
  const flyTo = useCallback((p: GymPlace) => {
    camRef.current?.setCamera({
      centerCoordinate: [p.location.lng, p.location.lat],
      zoomLevel: 14,
      animationDuration: 600,
    });
    // 轻推一下面板到半露，露出地图
    bsRef.current?.snapToIndex(0);
  }, []);

  const mapStyleURL = useMemo(() => {
    return styleId === "outdoors"
      ? "mapbox://styles/mapbox/outdoors-v12"
      : "mapbox://styles/mapbox/satellite-streets-v12";
  }, [styleId]);

  const pitch = is3D ? 55 : 0;
  const bearing = 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f8fafc" }} edges={["top", "left", "right"]}>
      {/* 地图层 */}
      <View style={{ flex: 1 }}>
        {MAPBOX_TOKEN ? (
          <>
            <MapboxGL.MapView
              ref={mapRef}
              styleURL={mapStyleURL}
              style={{ flex: 1 }}
              logoEnabled={false}
              scaleBarEnabled={false}
              compassEnabled={false}
              onRegionDidChange={onRegionDidChange}
            >
              <MapboxGL.Camera ref={camRef} pitch={pitch} heading={bearing} />

              {/* 用户位置 */}
              <MapboxGL.UserLocation visible={true} androidRenderMode="normal" showsUserHeadingIndicator={true} />

              {/* 标记（简单版；后续可换聚类 ShapeSource） */}
              {gyms.map((g) => (
                <MapboxGL.PointAnnotation
                  key={g.place_id}
                  id={g.place_id}
                  coordinate={[g.location.lng, g.location.lat]}
                  onSelected={() => flyTo(g)}
                >
                  <View
                    style={{
                      backgroundColor: "#2563EB",
                      borderRadius: 999,
                      padding: 6,
                      borderWidth: 2,
                      borderColor: "white",
                    }}
                  />
                </MapboxGL.PointAnnotation>
              ))}
            </MapboxGL.MapView>

            {/* 右侧浮动控制栏 */}
            <View
              pointerEvents="box-none"
              style={{
                position: "absolute",
                right: 12,
                top: 100,
              }}
            >
              <View
                style={{
                  backgroundColor: "rgba(255,255,255,0.96)",
                  borderRadius: 14,
                  paddingVertical: 6,
                  paddingHorizontal: 6,
                  gap: 8,
                  shadowColor: "#000",
                  shadowOpacity: 0.15,
                  shadowRadius: 8,
                  shadowOffset: { width: 0, height: 4 },
                }}
              >
                {/* 图层切换 */}
                <IconButton
                  label="Layer"
                  onPress={() => setStyleId((s) => (s === "outdoors" ? "satellite" : "outdoors"))}
                />
                {/* 2D/3D */}
                <IconButton label="2D" active={is3D} onPress={() => setIs3D((v) => !v)} />
                {/* 定位到我 */}
                <IconButton
                  label="Locate"
                  onPress={async () => {
                    if (!userLoc) return;
                    camRef.current?.setCamera({
                      centerCoordinate: [userLoc.lng, userLoc.lat],
                      zoomLevel: 12.5,
                      animationDuration: 600,
                    });
                  }}
                />
              </View>
            </View>
          </>
        ) : (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ color: "#ef4444", fontSize: 16 }}>缺少 MAPBOX_TOKEN（请在 app.json 的 extra 中配置）。</Text>
          </View>
        )}
      </View>

      {/* BottomSheet：半露搜索 + 列表 */}
      <BottomSheet ref={bsRef} snapPoints={SNAP_POINTS as any} enablePanDownToClose={false} index={0} onChange={setSheetIndex}>
        <BottomSheetView style={{ paddingHorizontal: 12, paddingBottom: 8 }}>
          {/* 搜索栏 */}
          <View
            style={{
              height: 44,
              borderRadius: 12,
              backgroundColor: "#F1F5F9",
              flexDirection: "row",
              alignItems: "center",
              paddingHorizontal: 12,
              marginBottom: 8,
            }}
          >
            <Text style={{ marginRight: 8, fontSize: 16 }}>🔎</Text>
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search climbing gyms within 30 miles…"
              style={{ flex: 1, fontSize: 16 }}
              returnKeyType="search"
              onSubmitEditing={onSubmitSearch}
            />
            <TouchableOpacity onPress={onSubmitSearch}>
              <Text style={{ fontWeight: "700", color: "#2563EB" }}>Search</Text>
            </TouchableOpacity>
          </View>

          {/* 列表 */}
          {loading && (
            <View style={{ paddingVertical: 8 }}>
              <ActivityIndicator />
            </View>
          )}
          {error ? <Text style={{ color: "#ef4444", marginBottom: 8 }}>{error}</Text> : null}
          <FlatList
            data={gyms}
            keyExtractor={(it) => it.place_id}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => flyTo(item)}
                style={{
                  paddingVertical: 12,
                  borderBottomWidth: 1,
                  borderBottomColor: "#eef2f7",
                }}
              >
                <Text style={{ fontSize: 16, fontWeight: "700" }}>{item.name}</Text>
                <Text style={{ color: "#64748b", marginTop: 2 }}>
                  {item.distanceMiles.toFixed(1)} mi
                  {item.rating ? ` · ${item.rating} (${item.user_ratings_total ?? 0})` : ""}
                </Text>
                <Text style={{ color: "#475569", marginTop: 2 }}>
                  {item.vicinity || item.formatted_address || "Address unknown"}
                </Text>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              !loading ? (
                <Text style={{ paddingVertical: 8, color: "#64748b" }}>
                  {center ? "附近没有匹配结果（试试换关键字或拖动地图）。" : "等待定位或输入搜索关键字。"}
                </Text>
              ) : null
            }
            style={{ maxHeight: 480 }}
          />
        </BottomSheetView>
      </BottomSheet>
    </SafeAreaView>
  );
}

//——— 小按钮（右侧控制）———
function IconButton({
  label,
  active,
  onPress,
}: {
  label: string;
  active?: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        width: 44,
        height: 44,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: active ? "#e8eefc" : "white",
        borderWidth: active ? 1 : 0,
        borderColor: "#93c5fd",
      }}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <Text style={{ fontWeight: "700" }}>{label}</Text>
    </TouchableOpacity>
  );
}

