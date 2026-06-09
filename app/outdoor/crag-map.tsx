// app/outdoor/crag-map.tsx
// Layer 2: Crag Map — map + multi-level zoom pins + TrueSheet with routes.
// Uses the shared MapTopBar / MapSearchBar / useMapSheetState primitives so
// visual + interaction behavior is identical to gyms-map.
//
// ⚠️ CN-ONLY (Amap): Overseas users are redirected to `/map` →
//   `src/features/mapscreen/MapScreenMapbox.tsx` (the unified Mapbox
//   screen) on mount. Any feature work touching outdoor map UX MUST land
//   in MapScreenMapbox FIRST; this file is kept in lock-step as the CN
//   counterpart only because Amap has no adapter for the unified screen
//   yet. Don't iterate here without mirroring the change there, or CN
//   and overseas users will diverge.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, ActivityIndicator, Alert,
  useColorScheme, useWindowDimensions,
} from 'react-native';
import * as Location from 'expo-location';
import MapboxGL from '@rnmapbox/maps';
import type { MapState } from '@rnmapbox/maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Stack, useFocusEffect, useRouter, useLocalSearchParams } from 'expo-router';
import { TrueSheet } from '@lodev09/react-native-true-sheet';
import { Ionicons } from '@expo/vector-icons';

import { useThemeColors } from '../../src/lib/useThemeColors';
import { useSettings } from '../../src/contexts/SettingsContext';
import { theme } from '../../src/lib/theme';
import { isCN } from '../../src/lib/region';
import { outdoorApi } from '../../src/features/outdoor/api';
import { outdoorListsApi } from '../../src/features/outdoor/listsApi';
// BR Track A: top-level outdoor entity is now Region (was Area). Alias kept
// for caller minimum-diff — Track D will rewrite this whole file.
import type { OutdoorAreaDetail, MapPin, Wall, OutdoorRoute, OutdoorListDetail } from '../../src/features/outdoor/types';
import { useTodaySendsButton } from '../../src/features/dailysummary/useTodaySendsButton';
import MapPinCluster from '../../src/features/outdoor/components/MapPinCluster';
import RoutePinCluster, {
  type WallPinContext,
} from '../../src/features/outdoor/components/RoutePinCluster';
import {
  useViewportPins,
  type ViewportBbox,
} from '../../src/features/outdoor/useViewportPins';
import WallGroup from '../../src/features/outdoor/components/WallGroup';
import RouteListCard from '../../src/features/outdoor/components/RouteListCard';
import { MapTopBar } from '../../src/features/mapscreen/components/MapTopBar';
import { MapSearchBar } from '../../src/features/mapscreen/components/MapSearchBar';
import { useMapSheetState, DETENT_COLLAPSED, DETENT_MEDIUM, DETENT_LARGE } from '../../src/features/mapscreen/hooks/useMapSheetState';
import { HeaderButton } from '../../src/components/ui/HeaderButton';
import CragMenuSheet, { type CragMenuSheetHandle } from '../../src/features/mapscreen/components/CragMenuSheet';
// CA Phase 4b — unified outdoor area sheet replaces RegionInfoSheet + CragInfoSheet.
import OutdoorAreaInfoSheet, {
  type OutdoorAreaInfoSheetHandle,
  type AreaSeedInput,
  areaListItemToSeed,
} from '../../src/features/mapscreen/components/OutdoorAreaInfoSheet';
import { FilterChipsBar } from '../../src/features/mapscreen/components/FilterChipsBar';
import useOutdoorMapFiltersStore from '../../src/store/useOutdoorMapFiltersStore';
import MyListSheet, { type MyListSheetHandle } from '../../src/features/mapscreen/components/MyListSheet';
import ReportsSheet, { type ReportsSheetHandle } from '../../src/features/mapscreen/components/ReportsSheet';
import AddRouteSheet, { type AddRouteSheetHandle } from '../../src/features/outdoor/components/AddRouteSheet';
import { Host, Button } from '@expo/ui/swift-ui';
import {
  buttonStyle,
  controlSize,
  frame,
  tint,
} from '@expo/ui/swift-ui/modifiers';
import {
  GlassUnionPill,
  type GlassUnionPillItem,
} from '../../modules/glass-effect-union/src';

export default function CragMapPage() {
  const colors = useThemeColors();
  const { tr } = useSettings();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme();
  const { areaId, areaName, listId } = useLocalSearchParams<{ areaId?: string; areaName?: string; listId?: string }>();
  const mode: 'area' | 'list' = listId ? 'list' : 'area';
  const styles = useMemo(() => createStyles(colors), [colors]);

  // Mapbox (overseas) users are redirected to the unified /map screen. CN
  // users keep rendering this legacy page in place — Amap has no adapter
  // for the unified screen yet.
  useEffect(() => {
    if (!isCN) {
      const params: Record<string, string> = {};
      if (typeof areaId === 'string') params.areaId = areaId;
      if (typeof areaName === 'string') params.areaName = areaName;
      if (typeof listId === 'string') params.listId = listId;
      router.replace({ pathname: '/map' as any, params });
    }
  }, [router, areaId, areaName, listId]);
  if (!isCN) return null;

  // Map refs
  const mapRef = useRef<MapboxGL.MapView>(null);
  const camRef = useRef<MapboxGL.Camera>(null);
  const sheetScrollRef = useRef<ScrollView>(null);
  const itemOffsetsRef = useRef<Record<string, number>>({});

  // Latest map center — ref-tracked so onCameraChanged updates it without
  // re-renders. The manual-drag refocus handler reads it to decide which
  // wall the user is looking at.
  const mapCenterRef = useRef<{ lat: number; lng: number } | null>(null);
  // Manual-open handler — assigned after all state is in scope, invoked
  // via this ref from the hook's stable callback.
  const manualOpenHandlerRef = useRef<(() => void) | null>(null);
  // See MapScreenMapbox for the rationale on the touch + lat-delta
  // tracking. Short version: rnmapbox doesn't give us onTouchMove, so we
  // infer the finger's current screen Y from cumulative camera latitude
  // shift and use that to tell "gesture crossed into the lower map half"
  // mid-pan.
  const touchStartYRef = useRef<number | null>(null);
  const prevCameraLatRef = useRef<number | null>(null);
  const cumulativeLatDeltaRef = useRef<number>(0);
  /** Lower-zone width in pt, anchored to sheet top — see MapScreenMapbox. */
  const LOWER_ZONE_PT = 40;
  const { height: windowHeight } = useWindowDimensions();

  // Shared sheet state (detents + auto-present + safeResize). Land at
  // MEDIUM on mount — crag-map is always area/list mode, and the
  // reason the user navigated here is to browse routes, not stare at
  // the map. COLLAPSED (peek) is still reachable by dragging down.
  const sheet = useMapSheetState({
    initialDetent: DETENT_MEDIUM,
    onManualOpen: useCallback(() => {
      manualOpenHandlerRef.current?.();
    }, []),
  });

  // Profile / My List sheet refs — stacked on top of the primary sheet.
  const areaMenuSheetRef = useRef<CragMenuSheetHandle>(null);
  const myListSheetRef = useRef<MyListSheetHandle>(null);
  const reportsSheetRef = useRef<ReportsSheetHandle>(null);
  const addRouteSheetRef = useRef<AddRouteSheetHandle>(null);
  const [pinPickMode, setPinPickMode] = useState(false);
  const prePinPickDetentRef = useRef<number>(DETENT_COLLAPSED);

  // Data state
  const [area, setArea] = useState<OutdoorAreaDetail | null>(null);
  // BR Track D Day 5e — `pins` is now list-mode-only. Area mode uses
  // `viewportPins` (bbox-driven RoutePin source) + `focusedWall`.
  // useListData mirror keeps the list-mode synth (one MapPin per listItem
  // with `wall_lat/wall_lng`) so list-mode MapPinCluster still works.
  const [pins, setPins] = useState<MapPin[]>([]);
  const [loading, setLoading] = useState(true);
  const [listDetail, setListDetail] = useState<OutdoorListDetail | null>(null);
  const [focusedItemId, setFocusedItemId] = useState<string | null>(null);
  // Route id that the user tapped on the map (route-level pin). Forwarded
  // to WallGroup so the tapped route's card gets reordered to the top of
  // its wall's list.
  const [highlightedRouteId, setHighlightedRouteId] = useState<string | null>(null);
  // BR Track D Day 5e — focused Wall context. When set, sheet header flips
  // to 2-row mode (Crag subtitle + Wall title, PLAN §3.2) and `walls`
  // contains only the focused wall. Cleared on areaId change.
  const [focusedWall, setFocusedWall] = useState<WallPinContext | null>(null);
  // CA Phase 4b — unified outdoor area info sheet (replaces RegionInfoSheet
  // + CragInfoSheet). One ref, one mount; seed swaps area-vs-crag context.
  const outdoorAreaSheetRef = useRef<OutdoorAreaInfoSheetHandle>(null);
  const presentArea = useCallback((seed: AreaSeedInput) => {
    void outdoorAreaSheetRef.current?.present(seed);
  }, []);

  // Sheet content
  const [sheetTitle, setSheetTitle] = useState('');
  const [walls, setWalls] = useState<Wall[]>([]);
  const [searchResults, setSearchResults] = useState<OutdoorRoute[] | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingSheet, setLoadingSheet] = useState(false);

  // Map + UI state
  const [styleReady, setStyleReady] = useState(false);
  const [mapReady, setMapReady] = useState(false);

  // BR Track D Day 5c lock-step (mirrors MapScreenMapbox Day 5b):
  // bbox-scoped outdoor route pin cluster. Updated in onCameraChanged
  // via mapRef.getVisibleBounds(). useViewportPins debounces 300ms.
  const [bbox, setBbox] = useState<ViewportBbox | null>(null);
  // BR Track D Day 6 lock-step — FilterChipsBar wiring (PLAN §8).
  const mapFilter = useOutdoorMapFiltersStore((s) => s.selected);
  const mapFilterParams = useMemo(() => {
    if (mapFilter === 'sport') return { style: 'sport' as const };
    if (mapFilter === 'trad') return { style: 'trad' as const };
    if (mapFilter === 'boulder') return { discipline: 'boulder' as const };
    return {};
  }, [mapFilter]);
  const viewportPins = useViewportPins(bbox, {
    enabled: styleReady,
    style: mapFilterParams.style,
    discipline: mapFilterParams.discipline,
  });

  // Wall pin tap — BR Track D Day 5e. Forwards to `focusOnWall` (declared
  // below this hook block, called via closure). CN mirror only handles
  // the area-mode case (the gyms→area transition path lives in the
  // unified MapScreenMapbox.tsx for overseas users).
  const focusOnWallRef = useRef<((ctx: WallPinContext) => void) | null>(null);
  const onWallPinPress = useCallback((ctx: WallPinContext) => {
    focusOnWallRef.current?.(ctx);
  }, []);

  const onClusterBubblePress = useCallback(
    async (coords: [number, number]) => {
      try {
        const currentZoom = (await mapRef.current?.getZoom()) ?? 12;
        const nextZoom = Math.min(16, currentZoom + 2);
        camRef.current?.setCamera({
          centerCoordinate: coords,
          zoomLevel: nextZoom,
          animationDuration: 350,
        });
      } catch {}
    },
    [],
  );
  const [modeIndex, setModeIndex] = useState(0); // 0=Routes, 1=Boulder
  const [searchExpanded, setSearchExpanded] = useState(false);
  // Area info is presented as a stacked TrueSheet (Apple Maps POI pattern),
  // not an inline accordion in the list header — lets the user pan/scroll
  // through full area detail without losing the map context.
  const openRegionInfo = useCallback(() => {
    if (!areaId) return;
    presentArea({
      id: areaId,
      name: area?.name ?? areaName ?? '',
      // crag-map area-mode is seeded from `outdoorApi.getRegion(areaId)` —
      // semantically this surface owns a Region. display_kind drives the
      // Hero badge during seed→detail hydration.
      display_kind: 'region',
      lat: area?.lat ?? null,
      lng: area?.lng ?? null,
      cover_url: area?.cover_url ?? null,
    });
  }, [presentArea, areaId, area, areaName]);
  // BR Track D Day 5e — title-tap routing (PLAN §3.2):
  //   focusedWall set → present unified sheet with Crag seed
  //   focusedWall unset → present unified sheet with Area seed
  const openCragOrAreaInfo = useCallback(() => {
    if (focusedWall) {
      presentArea({
        id: focusedWall.crag_id,
        name: focusedWall.crag_name,
        display_kind: 'crag',
        lat: focusedWall.lat,
        lng: focusedWall.lng,
        parent_name_hint: focusedWall.area_name,
      });
      return;
    }
    openRegionInfo();
  }, [focusedWall, openRegionInfo, presentArea]);

  // Load data: area-mode loads the Region only (no pin fan-out — that
  // was the legacy `getMapPins` flow, removed in Day 5e). Pin discovery
  // now goes through `viewportPins` (bbox cluster) + Wall pin tap →
  // focusOnWall. List-mode keeps the per-item synth pin source.
  useEffect(() => {
    if (mode === 'area') {
      // Reset wall/sheet scratch state on areaId change so a fresh
      // entry starts clean. focusedWall is cleared up-front; the user
      // refocuses by tapping a Wall pin once the cluster lands.
      setFocusedWall(null);
      setWalls([]);
      setSheetTitle('');
      setSearchResults(null);
      setSearchQuery('');
      setSearchExpanded(false);
      if (!areaId) return;
      setLoading(true);
      outdoorApi.getArea(areaId).then((areaData) => {
        if (areaData) setArea(areaData);
        setLoading(false);
      });
    } else {
      if (!listId) return;
      setLoading(true);
      outdoorListsApi
        .getDetail(listId)
        .then((d) => {
          setListDetail(d);
          const routePins: MapPin[] = d.items
            .filter((it) => it.wall_lat != null && it.wall_lng != null && it.route)
            .map((it) => ({
              id: it.id,
              name: it.route?.name ?? '',
              lat: it.wall_lat!,
              lng: it.wall_lng!,
              route_count: 1,
              level: 'wall' as const,
            }));
          setPins(routePins);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [mode, areaId, listId]);

  // BR Track D Day 5e — legacy autoLoadedAreaRef effect REMOVED. It used
  // `pins.filter('crag')` to fan out wall loads on first area-mode entry,
  // which depended on the deleted `getMapPins` source. The new flow is
  // tap-driven: enter area mode → camera flies to Region center → user
  // taps a Wall pin in the cluster → focusOnWall populates the sheet.

  // Camera: fitBounds to list pins. Area mode just centers on the Region
  // (no per-pin fit since `getMapPins` is gone in Day 5e).
  useEffect(() => {
    if (!styleReady || !mapReady) return;
    if (!camRef.current) return;

    const sourcePins = mode === 'list' ? pins : [];
    if (sourcePins.length >= 2) {
      const lats = sourcePins.map((p) => p.lat);
      const lngs = sourcePins.map((p) => p.lng);
      const ne = [Math.max(...lngs) + 0.05, Math.max(...lats) + 0.05] as [number, number];
      const sw = [Math.min(...lngs) - 0.05, Math.min(...lats) - 0.05] as [number, number];
      try {
        camRef.current.fitBounds(ne, sw, 50, 600);
      } catch {
        // Native view may still be tearing up/down during rapid nav — swallow.
      }
    } else if (sourcePins.length === 1) {
      try {
        camRef.current.setCamera({
          centerCoordinate: [sourcePins[0].lng, sourcePins[0].lat],
          zoomLevel: 13,
          animationDuration: 600,
        });
      } catch {}
    } else if (mode === 'area' && area?.lat && area?.lng) {
      try {
        camRef.current.setCamera({
          centerCoordinate: [area.lng, area.lat],
          zoomLevel: 10,
          animationDuration: 600,
        });
      } catch {
        // ignore
      }
    }
  }, [area, pins, styleReady, mapReady, mode]);

  // BR Track D Day 5e — list-mode pin tap. Scrolls the sheet list to the
  // matching list item and re-centers the camera. Area mode no longer
  // goes through this handler (RoutePinCluster owns Wall-pin taps via
  // `focusOnWall`).
  const onPinPress = useCallback(async (pin: MapPin) => {
    if (mode !== 'list') return;
    setFocusedItemId(pin.id);
    const offset = itemOffsetsRef.current[pin.id];
    if (offset != null) {
      sheetScrollRef.current?.scrollTo({ y: Math.max(0, offset - 8), animated: true });
    }
    try {
      camRef.current?.setCamera({
        centerCoordinate: [pin.lng, pin.lat],
        zoomLevel: 14,
        animationDuration: 400,
      });
    } catch {}
    sheet.safeResize(DETENT_MEDIUM);
  }, [sheet, mode]);

  // BR Track D Day 5e — Wall-pin focus (PLAN §3.2). Mirrors
  // MapScreenMapbox.focusOnWall: fetch the wall's routes, synthesize a
  // single Wall in `walls`, fly the camera in, resize sheet to MEDIUM,
  // and flip the sheet header into 2-row mode via `focusedWall`.
  const focusOnWall = useCallback(async (ctx: WallPinContext) => {
    setFocusedWall(ctx);
    setHighlightedRouteId(null);
    setSearchResults(null);
    setSheetTitle('');
    setLoadingSheet(true);
    try {
      const wallRoutes = await outdoorApi.listAreaRoutes(ctx.area_id);
      const wall: Wall = {
        id: ctx.wall_id,
        crag_id: ctx.crag_id,
        name: ctx.wall_name,
        lat: ctx.lat,
        lng: ctx.lng,
        sort_order: 0,
        status: 'approved',
        route_count: wallRoutes.length,
        routes: wallRoutes,
      };
      setWalls([wall]);
    } finally {
      setLoadingSheet(false);
    }
    try {
      camRef.current?.setCamera({
        centerCoordinate: [ctx.lng, ctx.lat],
        zoomLevel: 16,
        animationDuration: 500,
      });
    } catch {}
    sheet.safeResize(DETENT_MEDIUM);
    sheetScrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [sheet]);

  // Wire focusOnWall behind the ref so `onWallPinPress` (declared earlier)
  // can call it without a circular useCallback dep cycle.
  focusOnWallRef.current = focusOnWall;

  // BR Track D Day 5e — manual drag-up handler is now a no-op for area
  // mode. The Day 4 legacy was "find nearest wall pin to map center +
  // load its routes," which required the deleted `pins.filter('wall')`
  // source. New UX is tap-driven (PLAN §3.2): the user taps a Wall pin
  // to focus, not drag the sheet up.
  manualOpenHandlerRef.current = () => {};

  // Search
  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim() || !areaId) return;
    setLoadingSheet(true);
    const results = await outdoorApi.search(searchQuery.trim(), areaId);
    setSearchResults(results);
    setSheetTitle(tr('搜索结果', 'Search Results'));
    setLoadingSheet(false);
  }, [searchQuery, areaId, tr]);

  // Fix 3: tapping the 🔍 icon is a single composite action — expand the
  // search row, grow the sheet to the large detent (so the keyboard + results
  // have room), and autoFocus the UISearchBar so the keyboard rises with the
  // cursor already in the input.
  const openSearch = useCallback(() => {
    setSearchExpanded(true);
    sheet.safeResize(DETENT_LARGE);
  }, [sheet]);

  const closeSearch = useCallback(() => {
    setSearchExpanded(false);
    sheet.safeResize(DETENT_COLLAPSED);
  }, [sheet]);

  const navigateToRoute = useCallback((routeId: string) => {
    router.push({ pathname: '/outdoor/outdoor-route-detail' as any, params: { id: routeId } });
  }, [router]);

  const navigateToCommunity = useCallback(() => {
    if (!areaId) return;
    router.push({
      pathname: '/outdoor/crag-community' as any,
      params: { areaId, areaName: area?.name ?? '' },
    });
  }, [router, areaId, area]);

  const topBarHidden = sheet.currentDetentIndex === DETENT_LARGE || pinPickMode;
  // B1 — dismiss + re-present mirrors MapScreenMapbox; see that file for
  // the iOS modal-sheet rationale. CN-only file kept in lock-step.
  const dismissCragSheet = useCallback(() => {
    sheet.sheetRef.current?.dismiss().catch(() => {});
  }, [sheet]);
  // B1_FU_SWIFTUI — 走 MapTopBar 的 count kind，融进 right pill
  // glassEffectUnion；null when count<=0。
  const todaySendsBtn = useTodaySendsButton(dismissCragSheet);
  useFocusEffect(
    useCallback(() => {
      const id = requestAnimationFrame(() => {
        sheet.sheetRef.current?.present(DETENT_MEDIUM).catch(() => {});
      });
      return () => cancelAnimationFrame(id);
    }, [sheet]),
  );

  // CN top-bar is deliberately minimal — Amap SDK (not integrated here)
  // would differ enough from Mapbox's style/3D toggles that shipping them
  // for CN is low-ROI. The one control that maps cleanly: recenter on the
  // user's live location via expo-location.
  const recenterOnUser = useCallback(async () => {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      let granted = status === 'granted';
      if (!granted) {
        const req = await Location.requestForegroundPermissionsAsync();
        granted = req.status === 'granted';
      }
      if (!granted) {
        Alert.alert(tr('定位权限', 'Location permission'), tr('请在系统设置中授权定位。', 'Please enable Location access in Settings.'));
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      camRef.current?.setCamera({
        centerCoordinate: [pos.coords.longitude, pos.coords.latitude],
        zoomLevel: 13,
        animationDuration: 600,
      });
    } catch {
      Alert.alert(tr('定位未获取', 'Location unavailable'), tr('请稍后再试。', 'Please try again.'));
    }
  }, [tr]);

  // Filter walls by mode (boulder vs routes) + Day 6 FilterChipsBar style chip
  const filteredWalls = useMemo(() => {
    const byDiscipline = modeIndex === 0
      ? walls.map((w) => ({ ...w, routes: (w.routes ?? []).filter((r) => r.style !== 'boulder') }))
      : walls.map((w) => ({ ...w, routes: (w.routes ?? []).filter((r) => r.style === 'boulder') }));
    const byChip = byDiscipline.map((w) => {
      const filtered = (() => {
        if (mapFilter === 'sport') return (w.routes ?? []).filter((r) => r.style === 'sport');
        if (mapFilter === 'trad') return (w.routes ?? []).filter((r) => r.style === 'trad');
        if (mapFilter === 'boulder') return (w.routes ?? []).filter((r) => r.style === 'boulder');
        return w.routes ?? [];
      })();
      return { ...w, routes: filtered };
    });
    return byChip.filter((w) => (w.routes?.length ?? 0) > 0);
  }, [walls, modeIndex, mapFilter]);

  const mapStyleURL = useMemo(
    () => (scheme === 'dark' ? 'mapbox://styles/mapbox/dark-v11' : 'mapbox://styles/mapbox/outdoors-v12'),
    [scheme],
  );

  return (
    <View style={styles.root}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} translucent />
      <Stack.Screen options={{ headerShown: false }} />

      {/* Map — fills background */}
      <View
        style={styles.mapWrap}
        onTouchStart={(e) => {
          touchStartYRef.current = e.nativeEvent.pageY;
          prevCameraLatRef.current = null;
          cumulativeLatDeltaRef.current = 0;
        }}
        onStartShouldSetResponderCapture={(e) => {
          touchStartYRef.current = e.nativeEvent.pageY;
          prevCameraLatRef.current = null;
          cumulativeLatDeltaRef.current = 0;
          return false;
        }}
      >
        <MapboxGL.MapView
          ref={mapRef}
          styleURL={mapStyleURL}
          style={StyleSheet.absoluteFillObject}
          logoEnabled={false}
          scaleBarEnabled={false}
          compassEnabled={false}
          onDidFinishLoadingStyle={() => setStyleReady(true)}
          onDidFinishLoadingMap={() => setMapReady(true)}
          onCameraChanged={(state: MapState) => {
            const c = state.properties.center;
            const zoom = state.properties.zoom;
            if (!(c && c.length >= 2 && typeof zoom === 'number')) return;
            const currentLat = Number(c[1]);
            const currentLng = Number(c[0]);
            mapCenterRef.current = { lat: currentLat, lng: currentLng };

            // Day 5c — refresh bbox for useViewportPins. getVisibleBounds
            // returns [[ne_lng, ne_lat], [sw_lng, sw_lat]]; useViewportPins
            // internally debounces 300ms so we don't gate this further.
            mapRef.current
              ?.getVisibleBounds()
              .then((bounds) => {
                if (!bounds || bounds.length !== 2) return;
                const [ne, sw] = bounds;
                if (!ne || ne.length < 2 || !sw || sw.length < 2) return;
                setBbox({
                  south: Number(sw[1]),
                  west: Number(sw[0]),
                  north: Number(ne[1]),
                  east: Number(ne[0]),
                });
              })
              .catch(() => {});

            const touchY = touchStartYRef.current;
            if (touchY == null) return;

            if (prevCameraLatRef.current != null) {
              cumulativeLatDeltaRef.current += currentLat - prevCameraLatRef.current;
            }
            prevCameraLatRef.current = currentLat;

            const cosLat = Math.cos((currentLat * Math.PI) / 180);
            // Mapbox tiles are 512px — see MapScreenMapbox for derivation.
            const degreesLatPerPixel = (360 * cosLat) / (512 * Math.pow(2, zoom));
            const pixelDown = cumulativeLatDeltaRef.current / degreesLatPerPixel;
            const estimatedFingerY = touchY + pixelDown;

            const sheetTopY = windowHeight * (1 - sheet.detents[sheet.currentDetentIndex]);
            const boundaryY = sheetTopY - LOWER_ZONE_PT;
            const shouldCollapse =
              estimatedFingerY > boundaryY && estimatedFingerY < sheetTopY;
            if (shouldCollapse) sheet.collapseSheet();
          }}
        >
          <MapboxGL.Camera ref={camRef} />
          {styleReady && (
            <MapboxGL.UserLocation animated={false} visible showsUserHeadingIndicator />
          )}
          {/* List mode keeps MapPinCluster — list source is cherry-picked
              items (not a contiguous bbox), so the legacy per-item pin
              layer still fits. */}
          {mode === 'list' && (
            <MapPinCluster
              pins={pins}
              styleReady={styleReady}
              onPinPress={onPinPress}
            />
          )}
          {/* BR Track D Day 5e — area-mode pin source is now bbox-driven
              `RoutePinCluster` only. The legacy `MapPinCluster` for area
              mode is gone (Day 5d shipped on overseas; CN catches up
              here). Wall pin tap → `onWallPinPress` → `focusOnWall`. */}
          {mode === 'area' && (
            <RoutePinCluster
              pins={viewportPins.pins}
              styleReady={styleReady}
              onWallPress={onWallPinPress}
              onClusterPress={onClusterBubblePress}
            />
          )}
        </MapboxGL.MapView>

        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={colors.accent} />
          </View>
        )}

        {/* AddRouteSheet pin-pick overlay (pan + confirm) — see MapScreenMapbox. */}
        {pinPickMode ? (
          <View style={StyleSheet.absoluteFillObject} pointerEvents="box-none">
            <View style={styles.pinPickCrosshair} pointerEvents="none">
              <Ionicons name="add" size={44} color={colors.accent} />
            </View>
            <View style={[styles.pinPickHint, { top: insets.top + 12 }]}>
              <Text style={styles.pinPickHintText}>
                {tr('拖动地图对准路线位置', 'Pan the map to position the pin')}
              </Text>
            </View>
            <View style={[styles.pinPickActions, { bottom: insets.bottom + 24 }]}>
              <Host style={styles.pinPickCancelHost}>
                <Button
                  label={tr('取消', 'Cancel')}
                  onPress={() => {
                    setPinPickMode(false);
                    sheet.sheetRef.current
                      ?.present(prePinPickDetentRef.current)
                      .catch(() => {});
                    setTimeout(() => addRouteSheetRef.current?.present(), 180);
                  }}
                  modifiers={[
                    buttonStyle('glass'),
                    controlSize('large'),
                    frame({ maxWidth: 9999, height: 48 }),
                  ]}
                />
              </Host>
              <Host style={styles.pinPickConfirmHost}>
                <Button
                  label={tr('确认位置', 'Confirm')}
                  systemImage={'checkmark' as any}
                  onPress={() => {
                    const c = mapCenterRef.current;
                    if (!c) return;
                    setPinPickMode(false);
                    addRouteSheetRef.current?.setCoords([c.lng, c.lat]);
                    sheet.sheetRef.current
                      ?.present(prePinPickDetentRef.current)
                      .catch(() => {});
                    setTimeout(() => addRouteSheetRef.current?.present(), 180);
                  }}
                  modifiers={[
                    buttonStyle('glassProminent'),
                    controlSize('large'),
                    tint(colors.accent),
                    frame({ maxWidth: 9999, height: 48 }),
                  ]}
                />
              </Host>
            </View>
          </View>
        ) : null}
      </View>

      {/* Top bar — map-interaction only. CN gets just the recenter button;
          the Mapbox overseas page has style/3D/location. Community moved
          to the sheet header; Submit-Route / Report / Share moved into
          the profile sheet (AE/AF stubs for now). */}
      <MapTopBar
        unionId="crag-map-pill"
        leftButton={{ icon: 'chevron.left', onPress: () => router.back() }}
        rightButtons={[
          ...(mode === 'list'
            ? []
            : [{ icon: 'location', onPress: recenterOnUser }]),
          ...(todaySendsBtn ? [todaySendsBtn] : []),
        ]}
        // Fix 5: fade the floating toolbar out when the sheet is at its
        // large detent — otherwise it would overlap the sheet header.
        hidden={topBarHidden}
      />

      {/* TrueSheet with shared sheet state */}
      <TrueSheet
        ref={sheet.sheetRef}
        name="crag-map-sheet"
        detents={[...sheet.detents]}
        initialDetentIndex={DETENT_COLLAPSED}
        initialDetentAnimated
        dimmed={false}
        dismissible={false}
        grabber
        grabberOptions={{ height: 3, width: 36, topMargin: 6 }}
        onDidPresent={sheet.onDidPresent}
        onWillDismiss={sheet.onWillDismiss}
        onDidDismiss={sheet.onDidDismiss}
        onDetentChange={sheet.onDetentChange}
        scrollable
        header={
          // Pinned header:
          //   - searchExpanded=true → MapSearchBar
          //   - list mode → list title row
          //   - area mode not-searching → no pinned header (icons row lives
          //     in the scroll body so TrueSheet's scrollable drag linking
          //     can pick up the sheet pan — RN TouchableOpacity in the
          //     pinned header slot otherwise eats the drag gesture).
          searchExpanded ? (
            <MapSearchBar
              query={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitSearch={handleSearch}
              onCancel={closeSearch}
              autoFocus
              placeholder={tr('搜索路线名、等级...', 'Search routes, grades...')}
            />
          ) : mode === 'list' ? (
            <View style={[styles.headerRow, { justifyContent: 'center' }]}>
              <Ionicons name="list" size={18} color={colors.textPrimary} />
              <Text style={[styles.sheetTitleText, { marginLeft: 6 }]} numberOfLines={1}>
                {listDetail?.name ?? tr('清单', 'List')}
              </Text>
            </View>
          ) : undefined
        }
      >
        <ScrollView
          ref={sheetScrollRef}
          contentContainerStyle={[styles.sheetBody, { paddingBottom: insets.bottom + 20 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Icons row — lives at the TOP of the scroll body (not in the
              pinned sheet header) for area mode so TrueSheet's scroll-to-
              sheet drag linking can pick up pan gestures. RN
              TouchableOpacity + native UISegmentedControl capture touches
              when placed in the pinned header slot, blocking sheet drag. */}
          {mode === 'area' && !searchExpanded ? (
            <View style={styles.headerRow}>
              {/* Left: fused [search | community] pill — iOS 26 liquid
                  glass via GlassUnionPill (single SwiftUI subtree owning
                  the @Namespace, robust against RN re-renders). */}
              <GlassUnionPill
                axis="horizontal"
                unionId="sheet-left-pill"
                containerSpacing={0}
                buttonSize={44}
                style={{ width: 88, height: 44 }}
                items={
                  [
                    {
                      key: 'search',
                      kind: 'icon',
                      icon: 'magnifyingglass',
                      fontSize: 18,
                      onPress: openSearch,
                    },
                    {
                      key: 'community',
                      kind: 'icon',
                      icon: 'person.2',
                      fontSize: 18,
                      onPress: navigateToCommunity,
                    },
                  ] satisfies GlassUnionPillItem[]
                }
              />

              {/* Title in flex:1 middle slot — naturally constrained
                  between asymmetric toolbars (88px left pill vs 44px
                  right hamburger). Previous absolute-centered layout
                  put title at screen midpoint, which is left of the
                  available middle space → long names crashed into the
                  left pill. */}
              <TouchableOpacity
                onPress={openCragOrAreaInfo}
                activeOpacity={0.6}
                hitSlop={8}
                style={styles.headerTitleFlex}
              >
                {/* PLAN §3.2 2-row pattern:
                 *   row 1 (small) — Crag subtitle when wall focused
                 *   row 2 (large) — Wall title
                 * focusedWall unset → legacy single-row Region name. */}
                {focusedWall ? (
                  <>
                    <Text style={styles.headerSubtitleSmall} numberOfLines={1}>
                      {focusedWall.crag_name}
                    </Text>
                    <Text
                      style={styles.headerTitleLarge}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                      adjustsFontSizeToFit
                      minimumFontScale={0.65}
                    >
                      {focusedWall.wall_name}
                    </Text>
                  </>
                ) : (
                  <Text
                    style={styles.headerAreaName}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                    // Auto-shrink font (iOS): try to fit full name within
                    // the flex:1 slot first, only fall back to ellipsis when
                    // shrunk down to minimumFontScale * 20pt = 13pt. Most
                    // OpenBeta area names fit between 14-20pt.
                    adjustsFontSizeToFit
                    minimumFontScale={0.65}
                  >
                    {area?.name ?? areaName ?? tr('攀岩区', 'Area')}
                  </Text>
                )}
              </TouchableOpacity>

              {/* Right: hamburger button — glass circle. Opens the area
                  menu sheet (Area Tools + User Tools). Fixed-size wrap
                  pins RN layout bounds. */}
              <View style={{ width: 44, height: 44 }}>
                <HeaderButton
                  icon="line.3.horizontal"
                  variant="glass"
                  size={44}
                  onPress={() => areaMenuSheetRef.current?.present()}
                />
              </View>
            </View>
          ) : null}

          {/* BR Track D Day 6 — FilterChipsBar (PLAN §8). Area mode only.
              Sits between the title row and the sheet sub-title. List
              mode shows pre-selected saved routes, no chip filter. */}
          {mode === 'area' && !searchExpanded ? (
            <View style={styles.filterChipsRow}>
              <FilterChipsBar />
            </View>
          ) : null}

          {/* Sub-title: only when a pin/search sets sheetTitle, or list
              mode shows the count. Area name itself moved to the header. */}
          {mode === 'area' && sheetTitle ? (
            <View style={styles.titleRow}>
              <Text style={styles.sheetTitleText} numberOfLines={1}>
                {sheetTitle}
              </Text>
            </View>
          ) : mode === 'list' && listDetail ? (
            <View style={styles.titleRow}>
              <Text style={styles.sheetTitleText} numberOfLines={1}>
                {`${listDetail.item_count} ${tr('条路线', listDetail.item_count === 1 ? 'route' : 'routes')}`}
              </Text>
            </View>
          ) : null}

          {loadingSheet || loading ? (
            <ActivityIndicator size="large" color={colors.accent} style={{ marginTop: 40 }} />
          ) : mode === 'list' ? (
            listDetail && listDetail.items.length > 0 ? (
              listDetail.items.map((it) => {
                if (!it.route) return null;
                const routeId = it.route.id;
                const highlighted = focusedItemId === it.id;
                return (
                  <View
                    key={it.id}
                    onLayout={(e) => {
                      itemOffsetsRef.current[it.id] = e.nativeEvent.layout.y;
                    }}
                    style={highlighted ? { borderRadius: 14, backgroundColor: colors.backgroundSecondary } : undefined}
                  >
                    <RouteListCard
                      route={{ ...it.route, crag_name: it.crag_name, wall_name: it.wall_name }}
                      onPress={() => navigateToRoute(routeId)}
                    />
                  </View>
                );
              })
            ) : (
              <Text style={styles.emptyText}>{tr('清单暂无路线', 'No routes in this list yet')}</Text>
            )
          ) : searchResults ? (
            searchResults.length === 0 ? (
              <Text style={styles.emptyText}>{tr('无匹配路线', 'No matching routes')}</Text>
            ) : (
              searchResults.map((route) => (
                <RouteListCard
                  key={route.id}
                  route={route}
                  onPress={() => navigateToRoute(route.id)}
                />
              ))
            )
          ) : filteredWalls.length > 0 ? (
            filteredWalls.map((wall) => (
              <WallGroup
                key={wall.id}
                wall={wall}
                onRoutePress={navigateToRoute}
                highlightedRouteId={highlightedRouteId}
              />
            ))
          ) : (
            <Text style={styles.emptyText}>
              {tr('点击地图上的圆点查看路线', 'Tap a pin on the map to see routes')}
            </Text>
          )}
        </ScrollView>
      </TrueSheet>

      {/* CA Phase 4b — unified OutdoorAreaInfoSheet (Apple Maps POI pattern).
          One mount serves both area-mode info-pill taps and crag-mode
          subtitle taps; seed kind drives the rendering. */}
      <OutdoorAreaInfoSheet
        ref={outdoorAreaSheetRef}
        onRouteTap={(r) => {
          void outdoorAreaSheetRef.current?.dismiss();
          router.push({
            pathname: '/outdoor/outdoor-route-detail' as any,
            params: { id: r.id },
          });
        }}
        onChildTap={(c) => presentArea(areaListItemToSeed(c))}
      />

      {/* Crag menu sheet (stacked) — BR Track D Day 5e: now properly
          gated on `focusedWall`. PLAN §3.5 — the menu is Crag-scoped, so
          it only makes sense when the user has focused a Wall (which
          carries the parent Crag context). Browse Up + Share sections
          surface the parent Area + Region. */}
      {mode === 'area' && focusedWall ? (
        <CragMenuSheet
          ref={areaMenuSheetRef}
          crag={{
            id: focusedWall.crag_id,
            name: focusedWall.crag_name,
            cover_url: null,
            area_id: focusedWall.area_id,
            area_name: focusedWall.area_name,
            region_id: focusedWall.region_id,
            region_name: focusedWall.region_name,
            lat: focusedWall.lat,
            lng: focusedWall.lng,
            // Seed wall_count at 1 (the focused wall); CragInfoSheet's
            // own detail fetch hydrates the precise count later.
            wall_count: 1,
            route_count: focusedWall.route_count,
            boulder_count: 0,
          }}
          parentArea={{
            id: focusedWall.area_id,
            region_id: focusedWall.region_id,
            name: focusedWall.area_name,
            status: 'approved',
          }}
          areaModeIndex={modeIndex}
          setAreaModeIndex={setModeIndex}
          onPressMyList={() => myListSheetRef.current?.present()}
          onPressAddRoute={
            areaId ? () => addRouteSheetRef.current?.present() : undefined
          }
          onPressReports={() => reportsSheetRef.current?.present()}
        />
      ) : null}

      {/* My List sheet (stacked on top of the profile sheet). */}
      <MyListSheet ref={myListSheetRef} />

      {/* Reports sheet (stacked on top of the profile sheet). */}
      <ReportsSheet ref={reportsSheetRef} />

      {/* Add Route sheet — area mode only. */}
      {mode === 'area' && areaId ? (
        <AddRouteSheet
          ref={addRouteSheetRef}
          areaId={areaId}
          onRequestPinOnMap={() => {
            prePinPickDetentRef.current = sheet.currentDetentIndex;
            sheet.sheetRef.current?.dismiss().catch(() => {});
            setPinPickMode(true);
          }}
        />
      ) : null}
    </View>
  );
}

const createStyles = (c: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    root: { flex: 1 },
    mapWrap: { flex: 1 },
    loadingOverlay: {
      ...StyleSheet.absoluteFillObject,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(0,0,0,0.1)',
    },
    pinPickCrosshair: {
      position: 'absolute',
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
      alignItems: 'center',
      justifyContent: 'center',
    },
    pinPickHint: {
      position: 'absolute',
      alignSelf: 'center',
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: theme.borderRadius.pill,
      backgroundColor: 'rgba(0,0,0,0.7)',
    },
    pinPickHintText: {
      fontFamily: theme.fonts.medium,
      fontSize: 14,
      color: '#fff',
      textAlign: 'center',
    },
    pinPickActions: {
      position: 'absolute',
      left: 16,
      right: 16,
      flexDirection: 'row',
      gap: 12,
      alignItems: 'center',
    },
    // Symmetric pair: both Hosts flex: 1 (see MapScreenMapbox).
    pinPickCancelHost: { flex: 1, height: 48 },
    pinPickConfirmHost: { flex: 1, height: 48 },
    // Sheet header — collapsed row with icon + segment + info.
    // Generous paddingTop (Fix 1) so icons breathe under the sheet grabber
    // (grabber topMargin 6 + height 3 = 9pt; we add another ~14pt on top).
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      // Apple HIG sheet-header spec — see MapScreenMapbox headerRow
      // comment for the 16pt all-side inset math (sheetBody adds 4pt
      // top + 8pt horizontal of its own; grabber is an overlay).
      paddingHorizontal: 8,
      paddingTop: 12,
      paddingBottom: 16,
      gap: 10,
    },
    iconBtn: {
      width: 32,
      height: 32,
      alignItems: 'center',
      justifyContent: 'center',
    },
    // Title slot: flex:1 in the middle of the headerRow so it sits in
    // the actual available space between the left pill (88pt) and the
    // right hamburger (44pt). Asymmetric toolbars made the old absolute-
    // centered layout (left:0 / right:0) put the title at screen midpoint,
    // which fell left of the available middle and crashed long names
    // into the community pill.
    headerTitleFlex: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: 0,  // RN: required so flex children allow Text to truncate
    },
    headerAreaName: {
      fontFamily: theme.fonts.bold,
      fontSize: 20,
      textTransform: 'uppercase',
      color: c.textPrimary,
      flexShrink: 1,
    },
    // PLAN §3.2 2-row pattern — Crag subtitle + Wall large title when
    // focusedWall is set. Mirrors RoutesListSheet equivalent styles.
    headerSubtitleSmall: {
      fontFamily: theme.fonts.medium,
      fontSize: 12,
      color: c.textSecondary,
      flexShrink: 1,
    },
    headerTitleLarge: {
      fontFamily: theme.fonts.bold,
      fontSize: 18,
      color: c.textPrimary,
      flexShrink: 1,
    },
    headerAvatar: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: c.backgroundSecondary,
    },
    // Pure-RN fused pill — see MapScreenMapbox for rationale.
    fusedPill: {
      flexDirection: 'row',
      height: 44,
      borderRadius: 22,
      backgroundColor: c.backgroundSecondary,
      overflow: 'hidden',
    },
    fusedPillButton: {
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    inlineSegment: {
      flex: 1,
      height: 32,
    },
    // Segment row — own row below the icons row, full width.
    segmentRow: {
      paddingHorizontal: theme.spacing.screenPadding,
      paddingTop: 4,
      paddingBottom: 8,
    },
    // Day 6 FilterChipsBar row — full-width below the header pill row,
    // matches RoutesListSheet equivalent inset.
    filterChipsRow: {
      paddingHorizontal: 16,
      paddingTop: 4,
      paddingBottom: 8,
    },
    segmentControl: {
      height: 32,
    },
    // Fix 2: "Info" pill — icon + text, more discoverable than a lone icon.
    infoPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: theme.borderRadius.pill,
      backgroundColor: c.backgroundSecondary,
    },
    infoPillText: {
      fontFamily: theme.fonts.medium,
      fontSize: 13,
      color: c.accent,
    },
    // Sheet header
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.screenPadding,
      paddingBottom: 8,
      gap: 8,
    },
    sheetTitleText: {
      flex: 1,
      fontFamily: theme.fonts.bold,
      fontSize: 15,
      color: c.textPrimary,
    },
    infoPanel: {
      marginHorizontal: theme.spacing.screenPadding,
      marginBottom: 8,
      padding: 12,
      backgroundColor: c.cardBackground,
      borderRadius: theme.borderRadius.cardSmall,
      gap: 6,
    },
    sheetBody: {
      paddingHorizontal: 8,
      paddingTop: 4,
    },
    emptyText: {
      fontFamily: theme.fonts.regular,
      fontSize: 14,
      color: c.textTertiary,
      textAlign: 'center',
      marginTop: 40,
    },
  });
