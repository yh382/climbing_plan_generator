import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, StyleSheet } from "react-native";
import MapboxGL from "@rnmapbox/maps";
import type { MapState } from "@rnmapbox/maps";
import * as Location from "expo-location";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSharedValue } from "react-native-reanimated";
import { StatusBar } from "expo-status-bar";
import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import type BottomSheet from "@gorhom/bottom-sheet";


import { searchGymsNearby } from "../../../lib/poi";
import type { GymPlace, LatLng } from "../../../lib/poi/types";
import { useSettings } from "../../contexts/SettingsContext";
import { useGymsStore } from "../../store/useGymsStore";
import { useGymsColors } from "./useGymsColors";
import { sortAndFilterGyms } from "./utils/sortAndFilter";
import { isGlobal } from "../../lib/region";

import { GymMap } from "./components/GymMap";
import { MapHeaderControls } from "./components/MapHeaderControls";
import { TopGradientOverlay } from "./components/TopGradientOverlay";
import { GymBottomSheet } from "./components/GymBottomSheet";

export default function GymsScreen() {
  const mapRef = useRef<MapboxGL.MapView>(null);
  const camRef = useRef<MapboxGL.Camera>(null);
  const bsRef = useRef<BottomSheet>(null);
  const insets = useSafeAreaInsets();
  const { tr } = useSettings();
  const { colors, overlayTint, primary, primaryBg, scheme } = useGymsColors();
  const animatedIndex = useSharedValue(1);

  // Store
  const gyms = useGymsStore((s) => s.gyms);
  const loading = useGymsStore((s) => s.loading);
  const error = useGymsStore((s) => s.error);
  const selectedGym = useGymsStore((s) => s.selectedGym);
  const sheetIndex = useGymsStore((s) => s.sheetIndex);
  const query = useGymsStore((s) => s.query);
  const userLoc = useGymsStore((s) => s.userLoc);
  const center = useGymsStore((s) => s.center);
  const store = useGymsStore();

  // Local map state (not shared)
  const [is3D, setIs3D] = useState(false);
  const [styleId, setStyleId] = useState<"outdoors" | "satellite">("outdoors");

  // Reset sheet to default position on focus
  useFocusEffect(
    useCallback(() => {
      useGymsStore.getState().setSheetIndex(1);
      const t = setTimeout(() => bsRef.current?.snapToIndex(1), 150);
      return () => clearTimeout(t);
    }, []),
  );

  // Is map centered on user (≈120m threshold)
  const isAtUser = useMemo(() => {
    if (!userLoc || !center) return false;
    const rad = Math.PI / 180;
    const x = (center.lng - userLoc.lng) * Math.cos(((center.lat + userLoc.lat) * rad) / 2);
    const y = center.lat - userLoc.lat;
    const distM = Math.sqrt(x * x + y * y) * 111320;
    return distM < 120;
  }, [userLoc, center]);

  // Fetch nearby gyms
  const fetchNearby = useCallback(
    async (c: LatLng, q: string) => {
      store.setLoading(true);
      store.setError(null);
      try {
        const raw = await searchGymsNearby(c, 30, q);
        const filtered = sortAndFilterGyms(raw, c);
        store.setGyms(filtered);
      } catch (e: any) {
        store.setError(e?.message ?? "获取附近岩馆失败");
      } finally {
        store.setLoading(false);
      }
    },
    [store],
  );

  // Initial location
  useEffect(() => {
    (async () => {
      try {
        store.setError(null);
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          store.setError("未授权定位。你可以在搜索栏输入地址或城市。");
          return;
        }
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        const c = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        store.setUserLoc(c);
        store.setCenter(c);
        camRef.current?.setCamera({ centerCoordinate: [c.lng, c.lat], zoomLevel: 11, animationDuration: 600 });
        await fetchNearby(c, query);
      } catch (e: any) {
        store.setError(e?.message ?? "定位失败");
      }
    })();
  }, []);

  // Debounce map pan to avoid excessive API calls
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const onMapIdle = useCallback(
    (state: MapState) => {
      const { center } = state.properties;
      if (!center || center.length < 2) return;
      const lng = Number(center[0]);
      const lat = Number(center[1]);
      if (isNaN(lat) || isNaN(lng)) return;
      const c = { lat, lng };
      store.setCenter(c);

      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        if (sheetIndex <= 1) fetchNearby(c, query);
      }, 800);
    },
    [fetchNearby, query, sheetIndex, store],
  );

  const onSubmitSearch = useCallback(() => {
    if (!center) return;
    fetchNearby(center, query.trim());
  }, [center, query, fetchNearby]);

  const flyTo = useCallback(
    (p: GymPlace) => {
      camRef.current?.setCamera({
        centerCoordinate: [p.location.lng, p.location.lat],
        zoomLevel: 14,
        animationDuration: 600,
      });
      bsRef.current?.snapToIndex(1);
    },
    [],
  );

  const openGymDetails = useCallback(
    (g: GymPlace) => {
      store.setSelectedGym(g);
      flyTo(g);
    },
    [store, flyTo],
  );

  const mapStyleURL = useMemo(() => {
    if (styleId === "satellite") return "mapbox://styles/mapbox/satellite-streets-v12";
    return scheme === "dark"
      ? "mapbox://styles/mapbox/dark-v11"
      : "mapbox://styles/mapbox/outdoors-v12";
  }, [styleId, scheme]);

  const searchPlaceholder = tr("搜索附近的岩馆…", "Search nearby climbing gyms…");
  const emptyText = center
    ? tr("附近没有匹配结果", "No gyms found nearby.")
    : tr("等待定位或输入搜索关键字。", "Waiting for your location or a keyword…");

  return (
    <View style={[styles.root, { backgroundColor: scheme === "dark" ? "#0B1220" : "#E2E8F0" }]}>
      <StatusBar style={scheme === "dark" ? "light" : "dark"} translucent />

      <View style={styles.mapWrapper}>
        <GymMap
          mapRef={mapRef}
          camRef={camRef}
          gyms={gyms}
          styleURL={mapStyleURL}
          pitch={is3D ? 55 : 0}
          onMapIdle={onMapIdle}
          onSelectGym={openGymDetails}
        />
      </View>

      <TopGradientOverlay insets={insets} tintColor={overlayTint} />

      <View pointerEvents="box-none" style={StyleSheet.absoluteFillObject}>
        <GymBottomSheet
          bsRef={bsRef}
          animatedIndex={animatedIndex}
          sheetIndex={sheetIndex}
          onSheetChange={store.setSheetIndex}
          query={query}
          onChangeQuery={store.setQuery}
          onSubmitSearch={onSubmitSearch}
          searchPlaceholder={searchPlaceholder}
          gyms={gyms}
          selectedGym={selectedGym}
          onSelectGym={openGymDetails}
          onCloseDetail={() => store.setSelectedGym(null)}
          loading={loading}
          error={error}
          insets={insets}
          colors={colors}
          primary={primary}
          primaryBg={primaryBg}
          emptyText={emptyText}
        />
      </View>

      {/* Header rendered AFTER BottomSheet to ensure it's on top */}
      {isGlobal && (
        <MapHeaderControls
          animatedIndex={animatedIndex}
          sheetIndex={sheetIndex}
          insets={insets}
          scheme={scheme}
          isAtUser={isAtUser}
          styleId={styleId}
          is3D={is3D}
          onBack={() => router.back()}
          onToggleStyle={() => setStyleId((s) => (s === "outdoors" ? "satellite" : "outdoors"))}
          onToggle3D={() => setIs3D((v) => !v)}
          onLocate={() => {
            if (!userLoc) return;
            camRef.current?.setCamera({
              centerCoordinate: [userLoc.lng, userLoc.lat],
              zoomLevel: 12.5,
              animationDuration: 600,
            });
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  mapWrapper: { flex: 1 },
});
