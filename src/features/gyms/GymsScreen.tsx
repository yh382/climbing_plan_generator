import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import MapboxGL from "@rnmapbox/maps";
import type { MapState } from "@rnmapbox/maps";
import * as Location from "expo-location";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { router } from "expo-router";
import { TrueSheet } from "@lodev09/react-native-true-sheet";
import { Ionicons } from "@expo/vector-icons";

import { searchGymsNearby } from "../../../lib/poi";
import type { GymPlace, LatLng } from "../../../lib/poi/types";
import { useGymsStore } from "../../store/useGymsStore";
import { useSettings } from "../../contexts/SettingsContext";
import { useGymsColors } from "./useGymsColors";
import { sortAndFilterGyms } from "./utils/sortAndFilter";
import { distanceKm } from "./utils/distance";

import { GymMap } from "./components/GymMap";
import type { CragPin } from "./components/GymMap";
import { MapTopBar } from "../mapscreen/components/MapTopBar";
import { MapSearchBar } from "../mapscreen/components/MapSearchBar";
import { useMapSheetState, DETENT_COLLAPSED } from "../mapscreen/hooks/useMapSheetState";
import { GymList } from "./components/GymList";
import { GymsSavedSpotsRow } from "../mapscreen/components/GymsSavedSpotsRow";
import { GymDetailCard } from "./components/GymDetailCard";
import { AreaDetailCard } from "../outdoor/components/AreaDetailCard";
import { outdoorApi } from "../outdoor/api";
// BR Track A: top-level outdoor entity is now Region (was Area). Alias kept
// for caller minimum-diff — Track D will rename the variable + state.
import type { Region as Area } from "../outdoor/types";

// Sheet detent constants + state (including auto-present, safeResize, collapseSheet)
// live in useMapSheetState — see src/features/mapscreen/hooks/useMapSheetState.ts.

export default function GymsScreen() {
  const mapRef = useRef<MapboxGL.MapView>(null);
  const camRef = useRef<MapboxGL.Camera>(null);
  // Sheet state (ref + detents + auto-present + safeResize/collapseSheet) lives
  // in useMapSheetState so both gyms-map and crag-map share identical behavior.
  const sheet = useMapSheetState();
  const sheetRef = sheet.sheetRef;
  // Second TrueSheet stacked on top of the list sheet when a gym is selected
  // (Apple Maps POI pattern). Its lifecycle is fully independent from the
  // list sheet — presenting/dismissing it never resizes the list sheet.
  const detailSheetRef = useRef<TrueSheet>(null);
  // Local cache of the gym shown in the detail sheet. We can't read
  // selectedGym directly in the JSX because onDidDismiss clears the store
  // mid-animation, which would flash an empty card. This stays populated
  // until the dismiss animation finishes.
  const [detailGym, setDetailGym] = useState<GymPlace | null>(null);
  const detailSheetPresentedRef = useRef(false);
  // Outdoor areas for map pins
  const [areas, setAreas] = useState<Area[]>([]);
  const [selectedArea, setSelectedArea] = useState<Area | null>(null);
  const [detailArea, setDetailArea] = useState<Area | null>(null);
  const insets = useSafeAreaInsets();
  const { tr } = useSettings();
  const { scheme, colors, primary, primaryBg } = useGymsColors();

  // Store
  const gyms = useGymsStore((s) => s.gyms);
  const loading = useGymsStore((s) => s.loading);
  const error = useGymsStore((s) => s.error);
  const selectedGym = useGymsStore((s) => s.selectedGym);
  const query = useGymsStore((s) => s.query);
  const userLoc = useGymsStore((s) => s.userLoc);
  const center = useGymsStore((s) => s.center);
  const store = useGymsStore();

  // Local map state (not shared)
  const [is3D, setIs3D] = useState(false);
  const [styleId, setStyleId] = useState<"outdoors" | "satellite">("outdoors");

  // Track programmatic camera moves so we don't mistake them for user pan/zoom.
  const programmaticMoveRef = useRef(false);
  // When set, the next onMapIdle event will skip its debounced fetchNearby
  // call. We flip this on during the fly-to that happens when the user
  // taps a gym pin: the list should keep showing the user-centered
  // results instead of silently refocusing on the tapped gym's location.
  const suppressNextFetchRef = useRef(false);

  const markProgrammaticMove = useCallback((durationMs: number) => {
    programmaticMoveRef.current = true;
    setTimeout(() => {
      programmaticMoveRef.current = false;
    }, durationMs + 100);
  }, []);

  // Alias hook helpers into the variable names the rest of the file expects.
  const { safeResize, collapseSheet } = sheet;

  // Fetch nearby gyms
  const fetchNearby = useCallback(
    async (c: LatLng, q: string) => {
      const s = useGymsStore.getState();
      s.setLoading(true);
      s.setError(null);
      try {
        const raw = await searchGymsNearby(c, 30, q);
        // Distance display semantics: "how far is this gym from ME".
        // Backend computes `distance_m` from the request lat/lng (= map
        // center), so after the user taps a pin and the camera flies
        // there, any subsequent refetch would silently switch the list
        // to show distances from the tapped gym. Override client-side
        // with the actual user location whenever we have it so the
        // list always reflects the user's real-world distance.
        const userLoc = s.userLoc;
        const normalized = userLoc
          ? raw.map((g) => ({
              ...g,
              distance_m: Math.round(distanceKm(userLoc, g.location) * 1000),
            }))
          : raw;
        const filtered = sortAndFilterGyms(normalized, c);
        s.setGyms(filtered);
      } catch (e: any) {
        s.setError(e?.message ?? "获取附近岩馆失败");
      } finally {
        s.setLoading(false);
      }
    },
    [],
  );

  // When a gym is selected (from map pin or list tap), fly the camera to it
  // AND present the detail sheet on top of the list sheet (Apple Maps POI
  // pattern). The list sheet is intentionally NOT resized — its detent is
  // entirely user-controlled. The two sheets are stacked via UIKit's
  // UISheetPresentationController presentation chain.
  useEffect(() => {
    if (selectedGym) {
      // Update the local cache BEFORE presenting the sheet so that when
      // TrueSheet finishes presenting, GymDetailCard already has content.
      setDetailGym(selectedGym);
      // Clear any selected area when a gym is tapped
      setDetailArea(null);
      setSelectedArea(null);
      markProgrammaticMove(600);
      // Block the debounced refetch that the camera fly-to would
      // otherwise trigger via onMapIdle. The list must keep its
      // user-centered contents while we briefly park the camera on
      // the tapped gym.
      suppressNextFetchRef.current = true;
      camRef.current?.setCamera({
        centerCoordinate: [selectedGym.location.lng, selectedGym.location.lat],
        zoomLevel: 14,
        animationDuration: 600,
      });
      // present() is idempotent — calling it on an already-presented sheet
      // is a no-op, so tapping another pin while the sheet is open just
      // swaps the card content smoothly.
      detailSheetRef.current?.present(0).catch(() => {});
    } else if (detailSheetPresentedRef.current) {
      // selectedGym cleared externally (not via the sheet's own dismiss
      // callback, which already handles this) → dismiss the detail sheet.
      detailSheetRef.current?.dismiss().catch(() => {});
    }
  }, [selectedGym, markProgrammaticMove]);

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
        markProgrammaticMove(600);
        camRef.current?.setCamera({ centerCoordinate: [c.lng, c.lat], zoomLevel: 11, animationDuration: 600 });
        await fetchNearby(c, query);
      } catch (e: any) {
        store.setError(e?.message ?? "定位失败");
      }
    })();
  }, []);

  // Fetch outdoor areas for map pins (fire-and-forget, non-blocking)
  useEffect(() => {
    outdoorApi.listRegions({ country: 'CN', status: 'approved' }).then((data) => {
      if (data) setAreas(data);
    }).catch(() => {});
  }, []);

  // Convert areas to CragPin format for the map layer
  const cragPins: CragPin[] = useMemo(
    () =>
      areas
        .filter((a) => a.lat != null && a.lng != null)
        .map((a) => ({
          id: a.id,
          name: a.name,
          lat: a.lat!,
          lng: a.lng!,
          route_count: a.route_count,
          region: a.region,
        })),
    [areas],
  );

  const onSelectCrag = useCallback((pin: CragPin) => {
    const area = areas.find((a) => a.id === pin.id);
    if (!area) return;
    // Clear any selected gym first
    useGymsStore.getState().setSelectedGym(null);
    setSelectedArea(area);
    setDetailArea(area);
    markProgrammaticMove(600);
    suppressNextFetchRef.current = true;
    camRef.current?.setCamera({
      centerCoordinate: [pin.lng, pin.lat],
      zoomLevel: 14,
      animationDuration: 600,
    });
    detailSheetRef.current?.present(0).catch(() => {});
  }, [areas, markProgrammaticMove]);

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

      // Skip this idle's refetch if it was caused by the programmatic
      // fly-to after tapping a gym pin — the list must keep its
      // user-centered contents instead of silently refocusing on the
      // tapped gym's coordinates.
      if (suppressNextFetchRef.current) {
        suppressNextFetchRef.current = false;
        return;
      }

      debounceRef.current = setTimeout(() => {
        fetchNearby(c, useGymsStore.getState().query);
      }, 800);
    },
    [fetchNearby, store],
  );

  // Collapse sheet when user pans/zooms the map (not on programmatic camera moves).
  const onCameraChanged = useCallback(() => {
    if (programmaticMoveRef.current) return;
    collapseSheet();
  }, [collapseSheet]);

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

  const onSubmitSearch = useCallback(() => {
    if (!center) return;
    fetchNearby(center, useGymsStore.getState().query.trim());
  }, [center, fetchNearby]);

  const onSelectGymFromList = useCallback((gym: GymPlace) => {
    useGymsStore.getState().setSelectedGym(gym);
  }, []);

  // Item 1 (KAYA): area card in the sheet list → navigate straight to crag-map.
  // Area pin on the map still opens AreaDetailCard via onSelectCrag (unchanged)
  // — the detail card has its own "View Route Map" CTA.
  const onSelectAreaFromList = useCallback(
    (target: { id: string; name: string }) => {
      // CA Phase 6.1 — broadened from (area: Area) to {id, name} so
      // SavedSpot-typed callers (GymsSavedSpotsRow onSelectArea) and
      // Area-typed callers (GymList onSelectArea) both type-check
      // without a synthesizing wrapper.
      router.push({
        pathname: "/outdoor/crag-map" as any,
        params: { areaId: target.id, areaName: target.name },
      });
    },
    [router],
  );

  // Distance from current user → each area (meters), for mixed-list sort + display.
  const areaDistances = useMemo<Record<string, number>>(() => {
    if (!userLoc) return {};
    const out: Record<string, number> = {};
    for (const a of areas) {
      if (a.lat != null && a.lng != null) {
        out[a.id] = Math.round(distanceKm(userLoc, { lat: a.lat, lng: a.lng }) * 1000);
      }
    }
    return out;
  }, [areas, userLoc]);

  const searchPlaceholder = tr("搜索岩馆或攀岩区…", "Search gyms or crags…");
  const emptyText = center
    ? tr("附近没有匹配结果", "No gyms found nearby.")
    : tr("等待定位或输入搜索关键字。", "Waiting for your location or a keyword…");

  return (
    <View style={[styles.root, { backgroundColor: scheme === "dark" ? "#0B1220" : "#E2E8F0" }]}>
      <StatusBar style={scheme === "dark" ? "light" : "dark"} translucent />

      <MapTopBar
        unionId="gyms-map-pill"
        leftButton={{ icon: "chevron.left", onPress: () => router.back() }}
        rightButtons={[
          {
            icon: styleId === "outdoors" ? "square.3.layers.3d.down.left" : "photo",
            onPress: () => setStyleId((s) => (s === "outdoors" ? "satellite" : "outdoors")),
          },
          {
            icon: is3D ? "cube.fill" : "cube",
            onPress: () => setIs3D((v) => !v),
          },
          {
            icon: "location",
            visible: !isAtUser,
            onPress: () => {
              if (!userLoc) {
                store.setError("定位未获取，请检查定位权限。");
                return;
              }
              markProgrammaticMove(600);
              camRef.current?.setCamera({
                centerCoordinate: [userLoc.lng, userLoc.lat],
                zoomLevel: 12.5,
                animationDuration: 600,
              });
            },
          },
        ]}
      />

      <View style={styles.mapWrapper}>
        <GymMap
          mapRef={mapRef}
          camRef={camRef}
          gyms={gyms}
          crags={cragPins}
          styleURL={mapStyleURL}
          pitch={is3D ? 55 : 0}
          onMapIdle={onMapIdle}
          onCameraChanged={onCameraChanged}
          onSelectGym={openGymDetails}
          onSelectCrag={onSelectCrag}
        />
      </View>

      <TrueSheet
        ref={sheetRef}
        name="gyms-sheet"
        detents={[...sheet.detents]}
        initialDetentIndex={DETENT_COLLAPSED}
        initialDetentAnimated
        dimmed={false}
        // Prevent pan-down-to-dismiss. Without this, dragging the sheet below
        // its smallest detent dismisses it entirely, and since the screen
        // never re-presents it, the UI becomes stuck. Apple Maps has the
        // same "sticky" behavior — its sheet can't be dismissed, only
        // collapsed to the search-bar-only state.
        dismissible={false}
        grabber
        grabberOptions={{ height: 3, width: 36, topMargin: 6 }}
        // cornerRadius, backgroundColor, backgroundBlur intentionally
        // omitted. iOS 26 applies a default liquid-glass backgroundEffect
        // and concentric corner radius to every UISheetPresentationController
        // at runtime. TrueSheet internally inserts a UIVisualEffectView
        // (_blurView) at subview index 0 of the presenting view, which
        // only becomes transparent when backgroundBlur is not provided
        // (TrueSheetBlurView.mm:51-55 sets `self.effect = nil`). Passing
        // backgroundBlur would make _blurView render its own UIBlurEffect
        // and cover the native iOS 26 liquid glass underneath. Any
        // non-negative cornerRadius also overrides the OS concentric
        // corner radius.
        //
        // `header` pins the search bar at the top of the sheet, and the
        // `scrollable` FlatList fills the remaining space below it. The
        // collapsed detent is a runtime-computed fraction equal to
        // (search bar height + safe-area bottom) / window height, which
        // gives us an Apple Maps-style "search bar only" collapsed state
        // without relying on TrueSheet's `'auto'` detent (which breaks
        // when combined with `scrollable` — contentView ends up with
        // flex:1 in an absoluteFill container and auto-height resolves
        // to either 0 or the full sheet height).
        header={
          <MapSearchBar
            query={query}
            onChangeText={useGymsStore.getState().setQuery}
            onSubmitSearch={onSubmitSearch}
            placeholder={searchPlaceholder}
          />
        }
        // Pins the inner FlatList to the sheet's available space below
        // the header. Without this, the FlatList container has no
        // bounded height.
        scrollable
        onDidPresent={sheet.onDidPresent}
        onWillDismiss={sheet.onWillDismiss}
        onDidDismiss={sheet.onDidDismiss}
        onDetentChange={sheet.onDetentChange}
      >
        {/*
          paddingBottom = safe-area bottom. TrueSheet's scrollable layout
          puts an absoluteFill container around header + content; content
          has flex:1 and naturally includes the bottom safe-area region.
          On iOS 26 with detent height <= 150, `detentBottomAdjustment`
          returns 0 (TrueSheetViewController.mm:130-134), so iOS never
          clips the content above the home indicator. We manually reserve
          `insets.bottom` here so that at the collapsed detent (header +
          safe area) the content area resolves to 0 visible pt — no list
          row leaks behind the home indicator.
        */}
        <View style={[styles.sheetContent, { paddingBottom: insets.bottom }]}>
          <GymsSavedSpotsRow
            onSelectArea={(spot) =>
              onSelectAreaFromList({ id: spot.target_id, name: spot.target_name })
            }
          />
          <GymList
            gyms={gyms}
            areas={areas}
            areaDistances={areaDistances}
            onSelectGym={onSelectGymFromList}
            onSelectArea={onSelectAreaFromList}
            loading={loading}
            error={error}
            colors={colors}
            emptyText={emptyText}
          />
        </View>
      </TrueSheet>

      {/*
        Detail sheet — Apple Maps POI pattern. Stacked on top of the list
        sheet via UIKit's UISheetPresentationController presentation chain.
        TrueSheet's native findPresentingViewController walks the chain and
        picks the list sheet as presenter, so this sheet sits on top of it.

        - detents=[0.45, 0.9] — mid + large. Users open to mid; scrolling
          card content within 0.45 first expands the sheet to 0.9, then
          the ScrollView takes over (TrueSheet `scrollable` unifies the
          sheet-drag and content-scroll gestures).
        - scrollable — pins the first ScrollView descendant's edges and
          unifies drag/scroll. The pinned close X is an absolute sibling
          of the ScrollView so it stays visible while content scrolls.
        - dimmed={false} — list sheet stays visible & interactive behind
        - dismissible — swipe-down works
        - No backgroundColor / backgroundBlur / cornerRadius — inherit iOS
          26 default liquid glass and concentric corners, same reasoning as
          the list sheet above.
      */}
      <TrueSheet
        ref={detailSheetRef}
        name="gym-detail-sheet"
        detents={[0.45, 0.9]}
        scrollable
        dimmed={false}
        dismissible
        grabber
        grabberOptions={{ height: 3, width: 36, topMargin: 6 }}
        onDidPresent={() => {
          detailSheetPresentedRef.current = true;
        }}
        onWillDismiss={() => {
          detailSheetPresentedRef.current = false;
        }}
        onDidDismiss={() => {
          detailSheetPresentedRef.current = false;
          // Clear both local cache and store. Covers both X-button and
          // swipe-down dismiss paths. The useEffect guard prevents this
          // setSelectedGym(null) from re-triggering a redundant dismiss()
          // because detailSheetPresentedRef.current is already false.
          setDetailGym(null);
          setDetailArea(null);
          setSelectedArea(null);
          useGymsStore.getState().setSelectedGym(null);
        }}
      >
        <View style={styles.detailSheetContainer}>
          <ScrollView
            contentContainerStyle={[
              styles.detailScrollContent,
              { paddingBottom: insets.bottom + 8 },
            ]}
            showsVerticalScrollIndicator={false}
          >
            {detailGym && !detailArea && (
              <GymDetailCard
                gym={detailGym}
                onClose={() => detailSheetRef.current?.dismiss().catch(() => {})}
              />
            )}
            {detailArea && (
              <AreaDetailCard
                area={detailArea}
                onClose={() => detailSheetRef.current?.dismiss().catch(() => {})}
              />
            )}
          </ScrollView>

          {/*
            Close X — pinned to the sheet's top-right, NOT inside the
            ScrollView. Stays visible when the user scrolls card content
            at the 0.9 detent. Sibling of the ScrollView inside the
            detailSheetContainer so TrueSheet's `scrollable` edge-pinning
            only affects the ScrollView.
          */}
          <TouchableOpacity
            style={styles.detailCloseBtn}
            onPress={() => detailSheetRef.current?.dismiss().catch(() => {})}
            hitSlop={8}
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={20} color={colors.iconLabel} />
          </TouchableOpacity>
        </View>
      </TrueSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  mapWrapper: { flex: 1 },
  sheetContent: {
    flex: 1,
  },
  detailSheetContainer: {
    flex: 1,
  },
  detailScrollContent: {
    paddingTop: 8,
  },
  // iOS systemFill-like semi-transparent gray. Works in both light/dark
  // and lets the sheet's liquid glass show through, matching Apple Maps.
  detailCloseBtn: {
    position: "absolute",
    top: 22,
    right: 22,
    zIndex: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(120, 120, 128, 0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
});
