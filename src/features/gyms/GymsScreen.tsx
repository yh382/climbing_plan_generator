import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, StyleSheet } from "react-native";
import MapboxGL from "@rnmapbox/maps";
import type { MapState } from "@rnmapbox/maps";
import * as Location from "expo-location";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";

import { searchGymsNearby } from "../../../lib/poi";
import type { GymPlace, LatLng } from "../../../lib/poi/types";
import { useGymsStore } from "../../store/useGymsStore";
import { useGymsColors } from "./useGymsColors";
import { sortAndFilterGyms } from "./utils/sortAndFilter";

import { GymMap } from "./components/GymMap";
import { MapControls } from "./components/MapHeaderControls";

export default function GymsScreen() {
  const mapRef = useRef<MapboxGL.MapView>(null);
  const camRef = useRef<MapboxGL.Camera>(null);
  const insets = useSafeAreaInsets();
  const { scheme } = useGymsColors();

  // Store
  const gyms = useGymsStore((s) => s.gyms);
  const selectedGym = useGymsStore((s) => s.selectedGym);
  const query = useGymsStore((s) => s.query);
  const userLoc = useGymsStore((s) => s.userLoc);
  const center = useGymsStore((s) => s.center);
  const store = useGymsStore();

  // Local map state (not shared)
  const [is3D, setIs3D] = useState(false);
  const [styleId, setStyleId] = useState<"outdoors" | "satellite">("outdoors");

  // Track whether the sheet has been pushed
  const sheetPushed = useRef(false);

  // Fetch nearby gyms
  const fetchNearby = useCallback(
    async (c: LatLng, q: string) => {
      const s = useGymsStore.getState();
      s.setLoading(true);
      s.setError(null);
      try {
        const raw = await searchGymsNearby(c, 30, q);
        const filtered = sortAndFilterGyms(raw, c);
        s.setGyms(filtered);
      } catch (e: any) {
        s.setError(e?.message ?? "获取附近岩馆失败");
      } finally {
        s.setLoading(false);
      }
    },
    [],
  );

  // Push the native formSheet on focus
  useFocusEffect(
    useCallback(() => {
      if (!sheetPushed.current) {
        sheetPushed.current = true;
        // Small delay to let the map screen render first
        const t = setTimeout(() => router.push("/gyms-sheet"), 100);
        return () => clearTimeout(t);
      }

      // Re-fetch gyms on subsequent focus events
      const { center: c, query: q } = useGymsStore.getState();
      if (c) fetchNearby(c, q);
    }, [fetchNearby]),
  );

  // Fly to selected gym when it changes (triggered from the sheet)
  useEffect(() => {
    if (selectedGym) {
      camRef.current?.setCamera({
        centerCoordinate: [selectedGym.location.lng, selectedGym.location.lat],
        zoomLevel: 14,
        animationDuration: 600,
      });
    }
  }, [selectedGym]);

  // Is map centered on user (≈120m threshold)
  const isAtUser = useMemo(() => {
    if (!userLoc || !center) return false;
    const rad = Math.PI / 180;
    const x = (center.lng - userLoc.lng) * Math.cos(((center.lat + userLoc.lat) * rad) / 2);
    const y = center.lat - userLoc.lat;
    const distM = Math.sqrt(x * x + y * y) * 111320;
    return distM < 120;
  }, [userLoc, center]);

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
        fetchNearby(c, useGymsStore.getState().query);
      }, 800);
    },
    [fetchNearby, store],
  );

  const openGymDetails = useCallback(
    (g: GymPlace) => {
      store.setSelectedGym(g);
    },
    [store],
  );

  const mapStyleURL = useMemo(() => {
    if (styleId === "satellite") return "mapbox://styles/mapbox/satellite-streets-v12";
    return scheme === "dark"
      ? "mapbox://styles/mapbox/dark-v11"
      : "mapbox://styles/mapbox/outdoors-v12";
  }, [styleId, scheme]);

  return (
    <View style={[styles.root, { backgroundColor: scheme === "dark" ? "#0B1220" : "#E2E8F0" }]}>
      <StatusBar style={scheme === "dark" ? "light" : "dark"} translucent />

      <MapControls
        isAtUser={isAtUser}
        styleId={styleId}
        is3D={is3D}
        onBack={() => {
          // Dismiss both gyms-sheet and gyms screen (2 levels) back to home with animation
          router.dismiss(2);
        }}
        onToggleStyle={() => setStyleId((s) => (s === "outdoors" ? "satellite" : "outdoors"))}
        onToggle3D={() => setIs3D((v) => !v)}
        onLocate={() => {
          if (!userLoc) {
            store.setError("定位未获取，请检查定位权限。");
            return;
          }
          camRef.current?.setCamera({
            centerCoordinate: [userLoc.lng, userLoc.lat],
            zoomLevel: 12.5,
            animationDuration: 600,
          });
        }}
      />

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

      <LinearGradient
        pointerEvents="none"
        colors={
          scheme === "dark"
            ? ["rgba(11,18,32,0.85)", "rgba(11,18,32,0)"]
            : ["rgba(248,250,252,0.85)", "rgba(248,250,252,0)"]
        }
        style={[styles.statusBarOverlay, { height: insets.top + 16 }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  mapWrapper: { flex: 1 },
  statusBarOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 40,
  },
});
