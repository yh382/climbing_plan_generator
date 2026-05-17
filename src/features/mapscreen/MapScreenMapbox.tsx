// src/features/mapscreen/MapScreenMapbox.tsx
// Unified persistent map screen (Mapbox / overseas). One MapboxGL.MapView stays
// mounted across modes; mode swaps the pin layers + sheet content without
// navigating. Deep-linked `?areaId` / `?listId` enter the appropriate mode on
// mount. Back-from-deeper-mode flies the camera to the snapshotted gyms-mode
// view (or a default if none was snapshotted).
//
// Sheet model (minor deviation from EXEC_W_Y doc): a single primary TrueSheet
// swaps its header + body based on mode, rather than stacking independent
// primary sheets per mode. Two secondary sheets remain stacked on top:
//   - detailSheetRef — Apple Maps POI card (gym / area)
//   - areaInfoSheetRef — area's "详情" pill content
// Reason: content-swap keeps one sheet's detent state stable as the user
// transitions gyms → area → back, matching existing crag-map behavior.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  useColorScheme,
  useWindowDimensions,
} from 'react-native';
import MapboxGL from '@rnmapbox/maps';
import type { MapState } from '@rnmapbox/maps';
import Constants from 'expo-constants';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { TrueSheet } from '@lodev09/react-native-true-sheet';
import { Ionicons } from '@expo/vector-icons';

import { useThemeColors } from '../../lib/useThemeColors';
import { getMapSheetBottomInset } from '../../lib/sheetInsets';
import { useSettings } from '../../contexts/SettingsContext';
import { theme } from '../../lib/theme';
import { TopFadeMaskView } from '../../components/shared/TopFadeMaskView';
import MapSessionPill from '../journal/MapSessionPill';
import { useTodaySendsButton } from '../dailysummary/useTodaySendsButton';

import { useGymsStore } from '../../store/useGymsStore';
import AreaMenuSheet, { type AreaMenuSheetHandle } from './components/AreaMenuSheet';
import AreaInfoSheet, {
  type AreaInfoSheetHandle,
  type AreaInfoContext,
  type AreaInfoSeed,
} from './components/AreaInfoSheet';
import MyListSheet, { type MyListSheetHandle } from './components/MyListSheet';
import ReportsSheet, { type ReportsSheetHandle } from './components/ReportsSheet';
import OfflineMapsSheet, {
  type OfflineMapsSheetHandle,
} from './components/OfflineMapsSheet';
import AddRouteSheet, { type AddRouteSheetHandle } from '../outdoor/components/AddRouteSheet';
import { Host, Button, HStack, GlassEffectContainer } from '@expo/ui/swift-ui';
import {
  buttonStyle,
  controlSize,
  frame,
  tint,
  labelStyle,
  font,
  glassEffect,
} from '@expo/ui/swift-ui/modifiers';
import { HeaderButton } from '../../components/ui/HeaderButton';
import usePreviousTabStore from '../../store/usePreviousTabStore';
import {
  GlassUnionGroup,
  glassEffectUnion,
} from '../../../modules/glass-effect-union/src';
import type { GymPlace, LatLng } from '../../../lib/poi/types';

import { GymList } from '../gyms/components/GymList';
import { GymsSavedSpotsRow } from './components/GymsSavedSpotsRow';
import { GymDetailCard } from '../gyms/components/GymDetailCard';
import { GymDetailFooter } from '../gyms/components/GymDetailFooter';
import { useGymsColors } from '../gyms/useGymsColors';

import MapPinCluster from '../outdoor/components/MapPinCluster';
import TrailLayer from '../outdoor/components/TrailLayer';
import WallGroup from '../outdoor/components/WallGroup';
import RouteListCard from '../outdoor/components/RouteListCard';
import type {
  Area,
  MapPin,
  Wall,
  OutdoorRoute,
} from '../outdoor/types';

import { MapTopBar } from './components/MapTopBar';
import { MapSearchBar } from './components/MapSearchBar';
import {
  useMapSheetState,
  DETENT_COLLAPSED,
  DETENT_MEDIUM,
  DETENT_LARGE,
} from './hooks/useMapSheetState';
import { useMapMode } from './useMapMode';
import type { MapMode } from './useMapMode';
import { useGymsData } from './useGymsData';
import { useAreaData } from './useAreaData';
import { useListData } from './useListData';
import { distanceKm } from '../gyms/utils/distance';

const MAPBOX_TOKEN = (Constants.expoConfig?.extra as any)?.MAPBOX_TOKEN as string;
if (MAPBOX_TOKEN) MapboxGL.setAccessToken(MAPBOX_TOKEN);

// defensive: hide built-in clutter on outdoors-v12 / dark-v11 / satellite —
// keeps the gym map readable.
const HIDDEN_SYMBOL_LAYERS = [
  'poi-label',
  'transit-label',
  'airport-label',
  'road-label',
  'road-label-simple',
  'road-label-navigation',
  'road-number-shield',
  'road-exit-shield',
] as const;
const HIDDEN_LINE_LAYERS = [
  'road-minor',
  'road-minor-case',
  'road-minor-low',
  'road-street',
  'road-street-case',
  'road-street-low',
  'road-path',
  'road-path-bg',
  'road-pedestrian',
  'road-pedestrian-case',
  'road-steps',
  'road-service-track',
  'road-service-track-case',
] as const;
const HIDDEN_STYLE = { visibility: 'none' as const };

export interface MapScreenMapboxProps {
  /** External entry for list mode (profile/lists toolbar map button).
   *  Area mode no longer accepts an external entry — it's always
   *  entered internally via the gyms-sheet `GymsSavedSpotsRow` or area
   *  list tap (`onSelectAreaFromList`). */
  initialListId?: string;
}

export default function MapScreenMapbox({
  initialListId,
}: MapScreenMapboxProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const { tr } = useSettings();
  const scheme = useColorScheme();
  const gymsPalette = useGymsColors();

  const styles = useMemo(() => createStyles(colors), [colors]);

  // ---- Mode ----
  // Area mode is ALWAYS entered internally (via gyms-sheet Saved Spots
  // row → `onSelectAreaFromList`). Home Saved Spots / AreaDetailCard
  // navigate to gyms mode + highlight; the user then taps the spot in
  // the sheet to drill in. This removes the cross-tab param-propagation
  // bug entirely — `mode` only changes via in-component callbacks.
  //
  // List mode keeps its URL-param external path (profile/lists toolbar
  // map button) because it has a single user-driven entry and no
  // cross-list switching flow.
  const initialMode: MapMode = initialListId
    ? { kind: 'list', listId: initialListId }
    : { kind: 'gyms' };
  const modeState = useMapMode(initialMode);
  const { mode, prevCamera, observeCamera, enterArea, enterList, backToGyms } = modeState;

  // ---- Refs ----
  const mapRef = useRef<MapboxGL.MapView>(null);
  const camRef = useRef<MapboxGL.Camera>(null);
  const sheetScrollRef = useRef<ScrollView>(null);
  const itemOffsetsRef = useRef<Record<string, number>>({});

  // Latest map center — kept in a ref so onCameraChanged can update it
  // without triggering re-renders. The manual-drag refocus handler reads
  // it to figure out which wall the user is looking at.
  const mapCenterRef = useRef<{ lat: number; lng: number } | null>(null);
  // rnmapbox only lets the touch-start event bubble to RN (onTouchMove /
  // onTouchEnd are swallowed by Mapbox's UIGestureRecognizer — see
  // rnmapbox issues #3019, #1667). We work around the missing onTouchMove
  // by inferring the finger's current screen position from camera
  // latitude movement: dragging a finger DOWN pulls map content DOWN,
  // which shifts the camera center NORTH (lat increases). Converting that
  // lat delta back to screen pixels at the current zoom gives us an
  // estimate of where the finger *currently* is, not just where it
  // started. That's how we can tell "gesture crossed into the lower half"
  // mid-pan without ever seeing a move event.
  const touchStartYRef = useRef<number | null>(null);
  const prevCameraLatRef = useRef<number | null>(null);
  const cumulativeLatDeltaRef = useRef<number>(0);
  /** Width of the "collapse zone" directly above the sheet, in pt. Anchored
   *  to the sheet's top edge rather than to a fixed screen Y, so the zone
   *  follows the sheet when the detent changes (tighter sheet ⇒ boundary
   *  slides down with it, preserving the same tap-target width near the
   *  sheet that the user tuned at MEDIUM). */
  const LOWER_ZONE_PT = 40;
  // Manual-open handler — assigned later (after areaData/state are in
  // scope) but the hook is set up here, so we pass a stable wrapper that
  // dereferences the ref at call time.
  const manualOpenHandlerRef = useRef<(() => void) | null>(null);
  const sheet = useMapSheetState({
    // Gyms mode keeps the classic header-only collapsed look (max
    // map); area/list mode widens to 25% so the first route card
    // peeks out at COLLAPSED. The memo in useMapSheetState picks up
    // this change dynamically as the user transitions modes.
    collapsedFraction: mode.kind === 'gyms' ? 'header-only' : 0.25,
    // Gyms mode lands the user directly at MEDIUM so the list is
    // visible on first frame (Apple Maps default). Area/list mode
    // keeps COLLAPSED (peek) since the map is the primary focus
    // there until the user decides to browse.
    initialDetent: initialMode.kind === 'gyms' ? DETENT_MEDIUM : DETENT_COLLAPSED,
    onManualOpen: useCallback(() => {
      manualOpenHandlerRef.current?.();
    }, []),
  });
  const detailSheetRef = useRef<TrueSheet>(null);
  const areaInfoSheetRef = useRef<AreaInfoSheetHandle>(null);
  const [areaInfoContext, setAreaInfoContext] = useState<AreaInfoContext>('crag');
  const [areaInfoSeed, setAreaInfoSeed] = useState<AreaInfoSeed | null>(null);
  const [areaInfoId, setAreaInfoId] = useState<string | null>(null);
  const areaMenuSheetRef = useRef<AreaMenuSheetHandle>(null);
  const myListSheetRef = useRef<MyListSheetHandle>(null);
  const reportsSheetRef = useRef<ReportsSheetHandle>(null);
  const offlineMapsSheetRef = useRef<OfflineMapsSheetHandle>(null);
  const addRouteSheetRef = useRef<AddRouteSheetHandle>(null);
  // Pin-pick mode: when true, the map shows a crosshair overlay and the
  // next tap is captured as the new route's coords (dispatched back to
  // AddRouteSheet via ref.setCoords + ref.present).
  const [pinPickMode, setPinPickMode] = useState(false);
  // Detent snapshot to restore the primary sheet to after pin-pick
  // ends. Dismissing the sheet while picking gives the user an
  // uncluttered map; we then re-present at whatever detent they had
  // before (usually MEDIUM, since that's what area mode lands at).
  const prePinPickDetentRef = useRef<number>(DETENT_COLLAPSED);
  const detailSheetPresentedRef = useRef(false);

  // Camera padding when flying to a tapped pin. The primary/detail sheet
  // lands at the medium detent (≈45% of screen height — see
  // useMapSheetState.detents[1]). Without bottom padding the pin would
  // land at the geometric center of the map view and get hidden under
  // the sheet header. Mapbox's CameraStop.padding shifts the effective
  // viewport so the coordinate sits in the visible upper half.
  const { height: windowHeight } = useWindowDimensions();
  const pinFocusPadding = useMemo(
    () => ({
      paddingTop: 0,
      paddingLeft: 0,
      paddingRight: 0,
      paddingBottom: Math.round(windowHeight * 0.45),
    }),
    [windowHeight],
  );
  // Track whether either secondary sheet is at its full-height detent so the
  // top bar (back + right buttons) can hide and avoid overlapping the sheet
  // header. Primary sheet already exposes this via sheet.currentDetentIndex.
  const [detailSheetFull, setDetailSheetFull] = useState(false);
  const anySheetFull =
    sheet.currentDetentIndex === DETENT_LARGE || detailSheetFull;


  // defensive: distinguish programmatic camera moves from user pan/zoom so
  // we don't collapse the sheet when flyTo fires. Mirrors GymsScreen.
  const programmaticMoveRef = useRef(false);
  // defensive: after tapping a pin, the next onMapIdle's refetch must be
  // skipped — otherwise the gyms list would silently re-center on the
  // tapped gym. Mirrors GymsScreen.
  const suppressNextFetchRef = useRef(false);
  const markProgrammaticMove = useCallback((durationMs: number) => {
    programmaticMoveRef.current = true;
    setTimeout(() => {
      programmaticMoveRef.current = false;
    }, durationMs + 100);
  }, []);

  // ---- Map style ----
  const [is3D, setIs3D] = useState(false);
  const [styleId, setStyleId] = useState<'outdoors' | 'satellite'>('outdoors');
  const [styleReady, setStyleReady] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const mapStyleURL = useMemo(() => {
    if (styleId === 'satellite') return 'mapbox://styles/mapbox/satellite-streets-v12';
    return scheme === 'dark'
      ? 'mapbox://styles/mapbox/dark-v11'
      : 'mapbox://styles/mapbox/outdoors-v12';
  }, [styleId, scheme]);
  const [loadedStyleURL, setLoadedStyleURL] = useState<string | null>(null);
  // defensive: gate ShapeSource / overrides behind a styleURL-keyed readiness
  // flag — without this, swapping style can fire updateLayer on a style
  // that has already torn down.
  const styleLoaded = loadedStyleURL === mapStyleURL;
  useEffect(() => {
    setStyleReady(false);
    setLoadedStyleURL(null);
  }, [mapStyleURL]);

  // ---- Data hooks ----
  const gymsEnabled = mode.kind === 'gyms';
  const gymsData = useGymsData(gymsEnabled);
  const areaId = mode.kind === 'area' ? mode.areaId : undefined;
  const areaData = useAreaData(areaId);
  const listId = mode.kind === 'list' ? mode.listId : undefined;
  const listData = useListData(listId);

  // ---- Gyms store bindings ----
  const gyms = useGymsStore((s) => s.gyms);
  const gymsLoading = useGymsStore((s) => s.loading);
  const gymsError = useGymsStore((s) => s.error);
  const selectedGym = useGymsStore((s) => s.selectedGym);
  const gymsQuery = useGymsStore((s) => s.query);
  const userLoc = useGymsStore((s) => s.userLoc);
  const center = useGymsStore((s) => s.center);

  // Detail sheet local cache — mirrors GymsScreen. Local state prevents the
  // card from flashing empty mid-dismiss when the store clears.
  const [detailGym, setDetailGym] = useState<GymPlace | null>(null);
  // Internal gym_id is resolved inside GymDetailCard via ensureGym; we
  // lift it up so the sheet's glass footer (Favorite/Share) can react
  // without re-running the resolve.
  const [detailGymId, setDetailGymId] = useState<string | null>(null);

  // Area-mode sheet content (walls / search)
  const [sheetTitle, setSheetTitle] = useState('');
  const [walls, setWalls] = useState<Wall[]>([]);
  const [areaSearchResults, setAreaSearchResults] = useState<OutdoorRoute[] | null>(null);
  const [areaSearchQuery, setAreaSearchQuery] = useState('');
  const [loadingSheet, setLoadingSheet] = useState(false);
  const [areaModeIndex, setAreaModeIndex] = useState(0); // 0=Routes, 1=Boulder

  // BK fix: when entering area mode, default the Routes/Boulder toggle
  // to whichever discipline actually has content. Without this, an
  // all-boulder area (e.g. OpenBeta Bishop Mountain seed) lands on
  // "Routes" tab with everything filtered out → empty sheet. Resets on
  // every area transition so a previous boulder area doesn't pin the
  // toggle to boulder when the user moves to a rope-only area.
  useEffect(() => {
    if (mode.kind !== 'area') return;
    const area = areaData.area;
    if (!area) return;
    const routeCount = (area.route_count ?? 0) - (area.boulder_count ?? 0);
    const boulderCount = area.boulder_count ?? 0;
    if (boulderCount > 0 && routeCount === 0) {
      setAreaModeIndex(1);
    } else if (routeCount > 0 && boulderCount === 0) {
      setAreaModeIndex(0);
    }
    // Mixed area → keep current selection (user's last choice or default).
  }, [mode.kind, areaData.area?.id, areaData.area?.route_count, areaData.area?.boulder_count]);

  const [searchExpanded, setSearchExpanded] = useState(false);
  // Route id that the user tapped on the map — forwarded to WallGroup so
  // that route card is moved to the top of its wall's route list. Cleared
  // whenever a non-route (wall/sector/crag) pin is tapped.
  const [highlightedRouteId, setHighlightedRouteId] = useState<string | null>(null);

  // List-mode focus highlight
  const [focusedItemId, setFocusedItemId] = useState<string | null>(null);

  // Reset area-mode scratch state when the active area changes
  useEffect(() => {
    setSheetTitle('');
    setWalls([]);
    setAreaSearchResults(null);
    setAreaSearchQuery('');
    setSearchExpanded(false);
  }, [areaId]);

  // Auto-load walls for the area on first entry, so the sheet shows the
  // route list by default instead of the empty "tap a pin" state. Loads
  // walls for every top-level (crag) pin in parallel, deduped by wall id.
  // Guarded by a ref keyed on areaId so we run at most once per area.
  const autoLoadedAreaRef = useRef<string | null>(null);
  useEffect(() => {
    if (mode.kind !== 'area') {
      autoLoadedAreaRef.current = null;
      return;
    }
    if (!mode.areaId) return;
    if (areaData.loading) return;
    if (areaData.pins.length === 0) return;
    if (autoLoadedAreaRef.current === mode.areaId) return;
    autoLoadedAreaRef.current = mode.areaId;

    const topPins = areaData.pins.filter((p) => p.level === 'crag');
    const targets =
      topPins.length > 0
        ? topPins
        : areaData.pins.filter((p) => p.level !== 'route');
    if (targets.length === 0) return;

    setLoadingSheet(true);
    Promise.all(targets.map((p) => areaData.loadWallsForPin(p)))
      .then((results) => {
        const flat = results.flat();
        const seen = new Set<string>();
        const dedup: typeof flat = [];
        for (const w of flat) {
          if (!seen.has(w.id)) {
            seen.add(w.id);
            dedup.push(w);
          }
        }
        setWalls(dedup);
      })
      .catch(() => {
        // Swallow — user can still tap a pin to load a specific wall.
      })
      .finally(() => setLoadingSheet(false));
  }, [mode, areaData.pins, areaData.loading, areaData.loadWallsForPin]);

  // ---- Map is centered on user? (for gyms mode location button) ----
  const isAtUser = useMemo(() => {
    if (!userLoc || !center) return false;
    const rad = Math.PI / 180;
    const x = (center.lng - userLoc.lng) * Math.cos(((center.lat + userLoc.lat) * rad) / 2);
    const y = center.lat - userLoc.lat;
    const distM = Math.sqrt(x * x + y * y) * 111320;
    return distM < 120;
  }, [userLoc, center]);

  // ---- Camera choreography on mode change ----
  // On entering area mode via deep link (mount) or via in-screen transition,
  // fit to area pins once data loads. On backToGyms, fly to prevCamera.
  useEffect(() => {
    if (!styleReady || !mapReady || !camRef.current) return;
    if (mode.kind === 'area') {
      // Area mode lands at MEDIUM — the user navigated here to browse
      // the crag's routes, not to stare at the map, so default to
      // showing a useful chunk of list. COLLAPSED is still reachable
      // via drag-down.
      sheet.safeResize(DETENT_MEDIUM);
      const sourcePins = areaData.pins.filter((p) => p.level === 'crag');
      if (sourcePins.length >= 2) {
        const lats = sourcePins.map((p) => p.lat);
        const lngs = sourcePins.map((p) => p.lng);
        const ne: [number, number] = [Math.max(...lngs) + 0.05, Math.max(...lats) + 0.05];
        const sw: [number, number] = [Math.min(...lngs) - 0.05, Math.min(...lats) - 0.05];
        markProgrammaticMove(600);
        try {
          camRef.current.fitBounds(ne, sw, 50, 600);
        } catch {
          // defensive: native view may still be tearing up/down during rapid nav
        }
      } else if (sourcePins.length === 1) {
        markProgrammaticMove(600);
        try {
          camRef.current.setCamera({
            centerCoordinate: [sourcePins[0].lng, sourcePins[0].lat],
            zoomLevel: 13,
            animationDuration: 600,
          });
        } catch {}
      } else if (areaData.area?.lat != null && areaData.area?.lng != null) {
        markProgrammaticMove(600);
        try {
          camRef.current.setCamera({
            centerCoordinate: [areaData.area.lng, areaData.area.lat],
            zoomLevel: 10,
            animationDuration: 600,
          });
        } catch {}
      }
    } else if (mode.kind === 'list') {
      const sourcePins = listData.pins;
      if (sourcePins.length >= 2) {
        const lats = sourcePins.map((p) => p.lat);
        const lngs = sourcePins.map((p) => p.lng);
        const ne: [number, number] = [Math.max(...lngs) + 0.05, Math.max(...lats) + 0.05];
        const sw: [number, number] = [Math.min(...lngs) - 0.05, Math.min(...lats) - 0.05];
        markProgrammaticMove(600);
        try {
          camRef.current.fitBounds(ne, sw, 50, 600);
        } catch {}
      } else if (sourcePins.length === 1) {
        markProgrammaticMove(600);
        try {
          camRef.current.setCamera({
            centerCoordinate: [sourcePins[0].lng, sourcePins[0].lat],
            zoomLevel: 13,
            animationDuration: 600,
          });
        } catch {}
      }
    }
    // gyms mode on mount: the location-permission flow in useGymsData
    // drives the initial camera via store.userLoc. We handle the explicit
    // "back to gyms" fly-to separately in onBackToGyms.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode.kind, areaId, listId, areaData.pins, areaData.area, listData.pins, styleReady, mapReady]);

  // gyms mode: when user location first arrives, snap the camera to it.
  // Map + style must both be ready — otherwise setCamera can be eaten by
  // the native view before the first frame, and we'd never retry because
  // the done-flag is already set. animationDuration: 0 avoids a visible
  // fly-from-null-island if GPS resolves after the style loads.
  // State (not ref) so the loading overlay below can react to it.
  const [initialGymsCenterDone, setInitialGymsCenterDone] = useState(false);
  useEffect(() => {
    if (mode.kind !== 'gyms' || !userLoc || !camRef.current) return;
    if (!styleReady || !mapReady) return;
    if (initialGymsCenterDone) return;
    markProgrammaticMove(100);
    try {
      camRef.current.setCamera({
        centerCoordinate: [userLoc.lng, userLoc.lat],
        zoomLevel: 11,
        animationDuration: 0,
      });
      setInitialGymsCenterDone(true);
    } catch {}
  }, [mode.kind, userLoc, styleReady, mapReady, initialGymsCenterDone, markProgrammaticMove]);

  // ---- Back to gyms: fly to prevCamera or default ----
  const onBackToGyms = useCallback(() => {
    backToGyms();
    // Close any stacked sheets
    detailSheetRef.current?.dismiss().catch(() => {});
    areaInfoSheetRef.current?.dismiss();
    setDetailGym(null);
    useGymsStore.getState().setSelectedGym(null);

    const target = prevCamera ?? (userLoc ? { center: [userLoc.lng, userLoc.lat] as [number, number], zoom: 11 } : null);
    if (target && camRef.current) {
      markProgrammaticMove(600);
      try {
        camRef.current.setCamera({
          centerCoordinate: target.center,
          zoomLevel: target.zoom,
          animationDuration: 600,
        });
      } catch {}
    }
  }, [backToGyms, prevCamera, userLoc, markProgrammaticMove]);

  // ---- Map events ----
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  // Center of the last fetched gyms search — onMapIdle skips refetches when
  // the camera hasn't moved enough to matter. Google Places search spans
  // ~30km radius here, so a sub-km drift (GPS tick, minor gesture, style
  // reload settle) doesn't change the result set and shouldn't spend an
  // API call or flash the list.
  const GYMS_REFETCH_THRESHOLD_KM = 2;
  const lastFetchedCenterRef = useRef<LatLng | null>(null);
  const onMapIdle = useCallback(
    (state: MapState) => {
      const c = state.properties.center;
      if (!c || c.length < 2) return;
      const lat = Number(c[1]);
      const lng = Number(c[0]);
      if (isNaN(lat) || isNaN(lng)) return;
      const next: LatLng = { lat, lng };
      // Always track the center so `isAtUser` computes correctly across all
      // modes (needed for the location-recenter button in the area/list
      // top-bar). The debounced gyms fetchNearby stays gated to gyms mode.
      useGymsStore.getState().setCenter(next);
      if (mode.kind === 'gyms') {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        if (suppressNextFetchRef.current) {
          suppressNextFetchRef.current = false;
          lastFetchedCenterRef.current = next;
          return;
        }
        const last = lastFetchedCenterRef.current;
        if (last && distanceKm(last, next) < GYMS_REFETCH_THRESHOLD_KM) {
          return;
        }
        debounceRef.current = setTimeout(() => {
          lastFetchedCenterRef.current = next;
          gymsData.fetchNearby(next, useGymsStore.getState().query);
        }, 800);
      }
    },
    [mode.kind, gymsData],
  );

  const onCameraChanged = useCallback(
    (state: MapState) => {
      const c = state.properties.center;
      const zoom = state.properties.zoom;
      if (!(c && c.length >= 2 && typeof zoom === 'number')) return;
      const currentLat = Number(c[1]);
      const currentLng = Number(c[0]);
      mapCenterRef.current = { lat: currentLat, lng: currentLng };
      observeCamera({ center: [currentLng, currentLat], zoom });

      // Programmatic flyTo — don't let it poison the lat-delta tracking.
      if (programmaticMoveRef.current) {
        prevCameraLatRef.current = null;
        cumulativeLatDeltaRef.current = 0;
        return;
      }

      const touchY = touchStartYRef.current;
      if (touchY == null) return;

      // Accumulate lat change since touch start.
      if (prevCameraLatRef.current != null) {
        cumulativeLatDeltaRef.current += currentLat - prevCameraLatRef.current;
      }
      prevCameraLatRef.current = currentLat;

      // Mercator degrees-of-latitude per screen pixel at this zoom/lat.
      // Mapbox tiles are 512px (not 256 — that's OSM/Leaflet convention);
      // `zoom` is defined so the whole world fits in one 512px tile at
      // zoom 0. Formula:
      //   meters/px = 40,075,016.686 * cos(lat) / (512 * 2^zoom)
      //   ÷ 111,319.9 (meters per degree lat) ≈ 360 * cos(lat) / (512 * 2^zoom)
      const cosLat = Math.cos((currentLat * Math.PI) / 180);
      const degreesLatPerPixel = (360 * cosLat) / (512 * Math.pow(2, zoom));

      // Finger moved DOWN on screen ⇒ lat increased ⇒ pixelDown > 0.
      const pixelDown = cumulativeLatDeltaRef.current / degreesLatPerPixel;
      const estimatedFingerY = touchY + pixelDown;

      const sheetTopY = windowHeight * (1 - sheet.detents[sheet.currentDetentIndex]);
      const boundaryY = sheetTopY - LOWER_ZONE_PT;
      const shouldCollapse =
        estimatedFingerY > boundaryY && estimatedFingerY < sheetTopY;

      if (shouldCollapse) sheet.collapseSheet();
    },
    [observeCamera, sheet, windowHeight],
  );

  // ---- Gyms-mode pin presses ----
  // When a gym is selected, fly camera +
  // present detail sheet (stacked on the gyms list sheet).
  useEffect(() => {
    if (mode.kind !== 'gyms') return;
    if (selectedGym) {
      setDetailGym(selectedGym);
      markProgrammaticMove(600);
      suppressNextFetchRef.current = true;
      camRef.current?.setCamera({
        centerCoordinate: [selectedGym.location.lng, selectedGym.location.lat],
        zoomLevel: 14,
        animationDuration: 600,
        padding: pinFocusPadding,
      });
      detailSheetRef.current?.present(0).catch(() => {});
    } else if (detailSheetPresentedRef.current) {
      detailSheetRef.current?.dismiss().catch(() => {});
    }
  }, [mode.kind, selectedGym, markProgrammaticMove]);

  // Gyms-mode shape sources
  const gymsGeoJSON = useMemo(
    () => ({
      type: 'FeatureCollection' as const,
      features: gyms.map((g) => ({
        type: 'Feature' as const,
        id: g.place_id,
        properties: { name: g.name, place_id: g.place_id },
        geometry: { type: 'Point' as const, coordinates: [g.location.lng, g.location.lat] },
      })),
    }),
    [gyms],
  );
  const cragsGeoJSON = useMemo(
    () => ({
      type: 'FeatureCollection' as const,
      features: gymsData.cragPins.map((c) => ({
        type: 'Feature' as const,
        id: c.id,
        properties: { name: c.name, crag_id: c.id, route_count: c.route_count ?? 0 },
        geometry: { type: 'Point' as const, coordinates: [c.lng, c.lat] },
      })),
    }),
    [gymsData.cragPins],
  );

  const onGymPinPress = useCallback(
    (e: { features: GeoJSON.Feature[] }) => {
      const placeId = e.features?.[0]?.properties?.place_id;
      if (!placeId) return;
      const gym = gyms.find((g) => g.place_id === placeId);
      if (gym) useGymsStore.getState().setSelectedGym(gym);
    },
    [gyms],
  );

  const onCragPinPress = useCallback(
    (e: { features: GeoJSON.Feature[] }) => {
      const cragId = e.features?.[0]?.properties?.crag_id;
      if (!cragId) return;
      const area = gymsData.areas.find((a) => a.id === cragId);
      if (!area) return;
      useGymsStore.getState().setSelectedGym(null);
      setDetailGym(null);
      markProgrammaticMove(600);
      suppressNextFetchRef.current = true;
      try {
        camRef.current?.setCamera({
          centerCoordinate: [area.lng!, area.lat!],
          zoomLevel: 14,
          animationDuration: 600,
          padding: pinFocusPadding,
        });
      } catch {}
      setAreaInfoContext('gyms');
      setAreaInfoSeed({
        id: area.id,
        name: area.name,
        cover_url: area.cover_url,
        region: area.region,
        country: area.country,
        lat: area.lat,
        lng: area.lng,
        crag_count: area.crag_count,
        route_count: area.route_count,
        boulder_count: area.boulder_count,
      });
      setAreaInfoId(area.id);
      areaInfoSheetRef.current?.present();
    },
    [gymsData.areas, markProgrammaticMove, pinFocusPadding],
  );

  // ---- Area / list-mode pin press ----
  const onOutdoorPinPress = useCallback(
    async (pin: MapPin) => {
      if (mode.kind === 'list') {
        // Route pins don't appear in list mode, so skip the route branch.
        setFocusedItemId(pin.id);
        const offset = itemOffsetsRef.current[pin.id];
        if (offset != null) {
          sheetScrollRef.current?.scrollTo({ y: Math.max(0, offset - 8), animated: true });
        }
        try {
          markProgrammaticMove(400);
          camRef.current?.setCamera({
            centerCoordinate: [pin.lng, pin.lat],
            zoomLevel: 14,
            animationDuration: 400,
            padding: pinFocusPadding,
          });
        } catch {}
        sheet.safeResize(DETENT_MEDIUM);
        return;
      }
      if (mode.kind !== 'area') return;

      setLoadingSheet(true);
      setAreaSearchResults(null);
      // Highlight only when a route pin was tapped — wall/sector/crag taps
      // clear any previous highlight so WallGroup renders in natural order.
      setHighlightedRouteId(pin.level === 'route' ? pin.id : null);
      // Title: for route pins show the parent wall's name (looked up by
      // parent_id) so the sheet header reads like a location, not a grade.
      if (pin.level === 'route') {
        const parentWall = areaData.pins.find(
          (p) => p.level === 'wall' && p.id === pin.parent_id,
        );
        setSheetTitle(parentWall?.name ?? '');
      } else {
        setSheetTitle(pin.name);
      }

      try {
        const wallsResult = await areaData.loadWallsForPin(pin);
        setWalls(wallsResult);
      } finally {
        setLoadingSheet(false);
      }
      // Scroll sheet body to top so the highlighted route (now first in
      // its wall's list) lands at the top of the visible area.
      sheetScrollRef.current?.scrollTo({ y: 0, animated: false });
      sheet.safeResize(DETENT_MEDIUM);
    },
    [mode.kind, areaData, sheet, markProgrammaticMove],
  );

  // Re-focus the sheet content to whatever wall the map is currently
  // centered on. Fires on manual drag-up from COLLAPSED — user's gesture
  // is a "show me what's here" intent, so we mirror the pin-tap
  // refresh path (minus the route highlight and the sheet resize, since
  // the drag itself is already moving the sheet).
  manualOpenHandlerRef.current = () => {
    if (mode.kind !== 'area') return;
    const center = mapCenterRef.current;
    if (!center) return;
    const wallPins = areaData.pins.filter((p) => p.level === 'wall');
    if (wallPins.length === 0) return;
    let nearest: MapPin | null = null;
    let minDist = Infinity;
    for (const p of wallPins) {
      const dLat = p.lat - center.lat;
      const dLng = p.lng - center.lng;
      const d = dLat * dLat + dLng * dLng;
      if (d < minDist) {
        minDist = d;
        nearest = p;
      }
    }
    if (!nearest) return;
    const picked = nearest;
    setHighlightedRouteId(null);
    setSheetTitle(picked.name);
    setAreaSearchResults(null);
    setLoadingSheet(true);
    areaData
      .loadWallsForPin(picked)
      .then((wallsResult) => setWalls(wallsResult))
      .finally(() => setLoadingSheet(false));
    sheetScrollRef.current?.scrollTo({ y: 0, animated: false });
  };

  // ---- Area-mode search ----
  const handleAreaSearch = useCallback(async () => {
    if (!areaSearchQuery.trim() || mode.kind !== 'area') return;
    setLoadingSheet(true);
    const results = await areaData.search(areaSearchQuery.trim());
    setAreaSearchResults(results);
    setSheetTitle(tr('搜索结果', 'Search Results'));
    setLoadingSheet(false);
  }, [areaSearchQuery, mode.kind, areaData, tr]);

  const openAreaSearch = useCallback(() => {
    setSearchExpanded(true);
    sheet.safeResize(DETENT_LARGE);
  }, [sheet]);

  const closeAreaSearch = useCallback(() => {
    setSearchExpanded(false);
    sheet.safeResize(DETENT_COLLAPSED);
  }, [sheet]);

  const openAreaInfo = useCallback(() => {
    if (mode.kind !== 'area') return;
    setAreaInfoContext('crag');
    setAreaInfoSeed(null);
    setAreaInfoId(mode.areaId);
    areaInfoSheetRef.current?.present();
  }, [mode]);

  // ---- Navigations / actions ----
  const navigateToRoute = useCallback(
    (routeId: string) => {
      // Dismiss the outdoor sheet before pushing — iOS otherwise presents
      // the new screen behind a half-open modal sheet. Fire-and-forget so
      // the dismiss animation overlaps with the push transition.
      sheet.sheetRef.current?.dismiss().catch(() => {});
      router.push({ pathname: '/outdoor/outdoor-route-detail' as any, params: { id: routeId } });
    },
    [router, sheet],
  );

  const navigateToCommunity = useCallback(() => {
    if (mode.kind !== 'area') return;
    router.push({
      pathname: '/outdoor/crag-community' as any,
      params: { areaId: mode.areaId, areaName: areaData.area?.name ?? '' },
    });
  }, [router, mode, areaData.area]);

  // ---- Gyms-mode sheet handlers ----
  const onSubmitGymSearch = useCallback(() => {
    if (!center) return;
    gymsData.fetchNearby(center, useGymsStore.getState().query.trim());
  }, [center, gymsData]);

  const onSelectGymFromList = useCallback((gym: GymPlace) => {
    useGymsStore.getState().setSelectedGym(gym);
  }, []);

  const onSelectAreaFromList = useCallback(
    (area: Area) => {
      // Single entry path to area mode — also used by the gyms-sheet
      // Saved Spots row (`GymsSavedSpotsRow`). Transitions on the same
      // MapView; back button (chevron.left) reverts to gyms in place.
      enterArea(area.id, area.name);
    },
    [enterArea],
  );

  // Shared map-view control buttons (style / 3D / location). Used by the
  // top-bar in all modes — user's principle: top-bar is ONLY for
  // interactions with the map itself. Community and the 3-dot menu that
  // previously lived here moved into the sheet header / profile sheet.
  const mapViewControlButtons = useMemo(
    () => [
      {
        icon: styleId === 'outdoors' ? 'square.3.layers.3d.down.left' : 'photo',
        onPress: () => setStyleId((s) => (s === 'outdoors' ? 'satellite' : 'outdoors')),
      },
      {
        icon: is3D ? 'cube.fill' : 'cube',
        onPress: () => setIs3D((v) => !v),
      },
      {
        icon: 'location',
        visible: !isAtUser,
        onPress: () => {
          if (!userLoc) {
            useGymsStore.getState().setError('定位未获取，请检查定位权限。');
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
    ],
    [styleId, is3D, isAtUser, userLoc, markProgrammaticMove],
  );

  const filteredWalls = useMemo(() => {
    if (areaModeIndex === 0) {
      return walls
        .map((w) => ({ ...w, routes: (w.routes ?? []).filter((r) => r.style !== 'boulder') }))
        .filter((w) => (w.routes?.length ?? 0) > 0);
    }
    return walls
      .map((w) => ({ ...w, routes: (w.routes ?? []).filter((r) => r.style === 'boulder') }))
      .filter((w) => (w.routes?.length ?? 0) > 0);
  }, [walls, areaModeIndex]);

  // ---- Top bar ----
  // Same buttons across gyms / area / list — only the back button differs.
  // Area/list mode used to host community + 3-dot menu; those migrated to
  // the sheet header (community) and profile sheet (add route / reports /
  // offline / share).
  // B1 — dismiss the persistent primary sheet before TodaySendsButton
  // pushes /daily-summary. iOS UISheetPresentationController is presented
  // modally on this screen's view controller; pushing a new screen via
  // the navigation stack happens UNDER the sheet, so the new screen would
  // appear masked unless the sheet is dismissed first. Fire-and-forget so
  // dismiss animation runs in parallel with the push transition.
  const dismissPrimarySheet = useCallback(() => {
    sheet.sheetRef.current?.dismiss().catch(() => {});
  }, [sheet]);

  // B1_FU_SWIFTUI — TodaySendsButton 走 SwiftUI Host 路径，作为 right
  // pill 第 4 个 child fuse 进同一 glassEffectUnion。null when count<=0。
  const todaySendsBtn = useTodaySendsButton(dismissPrimarySheet);

  // B1 — re-present the primary sheet when the screen regains focus
  // Re-present primary sheet on focus, dismiss on blur. Destructure
  // stable refs from `sheet` (a fresh object each render) so useCallback
  // deps don't change every render — otherwise useFocusEffect would
  // cleanup-then-setup on every render → infinite dismiss/present loop.
  const sheetRefForFocus = sheet.sheetRef;
  const sheetSafePresent = sheet.safePresent;
  useFocusEffect(
    useCallback(() => {
      const id = requestAnimationFrame(() => sheetSafePresent(DETENT_MEDIUM));
      return () => {
        cancelAnimationFrame(id);
        sheetRefForFocus.current?.dismiss().catch(() => {});
      };
    }, [sheetRefForFocus, sheetSafePresent]),
  );

  // ---- Top bar back button — 2 branches ----
  // - area mode: ALWAYS internal entry (only path is gyms-sheet
  //   GymsSavedSpotsRow / area list tap → `onSelectAreaFromList`).
  //   Back = chevron.left → revert to gyms-mode-in-place.
  // - gyms / list mode: chevron.down → return to previous tab.
  //   List has a single external entry (profile/lists toolbar map
  //   button); we keep it returning straight to the previous tab.
  const goToPreviousTab = useCallback(() => {
    sheet.sheetRef.current?.dismiss().catch(() => {});
    const previousTab = usePreviousTabStore.getState().previousTab;
    const route = previousTab === 'index' ? '/' : `/${previousTab}`;
    router.navigate(route as any);
  }, [router, sheet]);

  const topBar = (
    <MapTopBar
      unionId="map-pill"
      leftButton={{
        icon: mode.kind === 'area' ? 'chevron.left' : 'chevron.down',
        onPress: mode.kind === 'area' ? onBackToGyms : goToPreviousTab,
      }}
      rightButtons={[
        ...mapViewControlButtons,
        ...(todaySendsBtn ? [todaySendsBtn] : []),
      ]}
      hidden={anySheetFull || pinPickMode}
    />
  );

  // ---- Sheet content (header + body) ----
  const sheetHeader = (() => {
    if (mode.kind === 'gyms') {
      return (
        <MapSearchBar
          query={gymsQuery}
          onChangeText={useGymsStore.getState().setQuery}
          onSubmitSearch={onSubmitGymSearch}
          placeholder={tr('搜索岩馆或攀岩区…', 'Search gyms or crags…')}
        />
      );
    }
    if (mode.kind === 'list') {
      // Single-row header (60pt) — fits the 68pt COLLAPSED detent. The
      // route count sub-title moves into the scroll body top so it's only
      // visible when the user expands the sheet.
      return (
        <View style={[cragStyles(colors).headerRow, { justifyContent: 'center' }]}>
          <Ionicons name="list" size={18} color={colors.textPrimary} />
          <Text style={[cragStyles(colors).sheetTitleText, { marginLeft: 6 }]} numberOfLines={1}>
            {listData.listDetail?.name ?? tr('清单', 'List')}
          </Text>
        </View>
      );
    }
    // area mode
    // Pinned header:
    //   - searchExpanded=true  → MapSearchBar (user is typing a search)
    //   - searchExpanded=false → no pinned header (undefined)
    // When not searching, the icons row (🔍/segment/info) lives at the
    // top of the scroll body instead. This matters for drag: RN
    // TouchableOpacity + native UISegmentedControl capture touches in
    // the pinned header slot, blocking TrueSheet's sheet pan. Inside
    // the scroll body, TrueSheet's `prefersScrollingExpandsWhenScrolledToEdge`
    // links scroll drag to sheet detent, so up-drag anywhere in the
    // content reliably expands the sheet — same way gyms mode works.
    if (searchExpanded) {
      return (
        <MapSearchBar
          query={areaSearchQuery}
          onChangeText={setAreaSearchQuery}
          onSubmitSearch={handleAreaSearch}
          onCancel={closeAreaSearch}
          autoFocus
          placeholder={tr('搜索路线名、等级...', 'Search routes, grades...')}
        />
      );
    }
    return undefined;
  })();

  // ---- Render ----
  return (
    <View style={styles.root}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} translucent />
      <Stack.Screen options={{ headerShown: false }} />

      {/* B2 #1: top-center "session active" pill — visible on all map modes
          when a climbing session is running. Tap → daily-summary (end). */}
      <MapSessionPill />

      {/* Persistent MapView — stays mounted across modes. Pin layers are
          conditional on mode to avoid overlap between gyms pins and the
          MapPinCluster. UserLocation stays mounted whenever the style is
          ready, so toggling modes never hides the blue dot. */}
      <View
        style={styles.mapWrap}
        onTouchStart={(e) => {
          touchStartYRef.current = e.nativeEvent.pageY;
          prevCameraLatRef.current = null;
          cumulativeLatDeltaRef.current = 0;
        }}
        onStartShouldSetResponderCapture={(e) => {
          // Belt-and-suspenders: capture phase fires before any native
          // gesture recognizer resolves. Returning false = we don't claim
          // responder, so Mapbox still handles pan/pinch.
          touchStartYRef.current = e.nativeEvent.pageY;
          prevCameraLatRef.current = null;
          cumulativeLatDeltaRef.current = 0;
          return false;
        }}
      >
        {MAPBOX_TOKEN ? (
          <MapboxGL.MapView
            ref={mapRef}
            styleURL={mapStyleURL}
            style={StyleSheet.absoluteFillObject}
            logoEnabled={false}
            scaleBarEnabled={false}
            compassEnabled={false}
            onMapIdle={onMapIdle}
            onCameraChanged={onCameraChanged}
            onDidFinishLoadingStyle={() => {
              setLoadedStyleURL(mapStyleURL);
              setStyleReady(true);
            }}
            onDidFinishLoadingMap={() => setMapReady(true)}
          >
            <MapboxGL.Camera ref={camRef} pitch={is3D ? 55 : 0} heading={0} />

            {styleLoaded && (
              <MapboxGL.UserLocation animated={false} visible showsUserHeadingIndicator />
            )}

            {/* Gyms mode: inline gym + crag shape sources */}
            {styleLoaded && mode.kind === 'gyms' && (
              <>
                <MapboxGL.ShapeSource id="gyms-src" shape={gymsGeoJSON} onPress={onGymPinPress}>
                  <MapboxGL.CircleLayer
                    id="gyms-pins"
                    style={{
                      circleRadius: 7,
                      circleColor: '#306E6F',
                      circleStrokeWidth: 2.5,
                      circleStrokeColor: '#fff',
                    }}
                  />
                  <MapboxGL.SymbolLayer
                    id="gyms-labels"
                    style={{
                      textField: ['get', 'name'] as any,
                      textSize: 12,
                      textColor: scheme === 'dark' ? '#E2E8F0' : '#0F172A',
                      textHaloColor:
                        scheme === 'dark' ? 'rgba(11,18,32,0.85)' : 'rgba(255,255,255,0.85)',
                      textHaloWidth: 1.2,
                      textVariableAnchor: ['top', 'bottom', 'left', 'right'],
                      textRadialOffset: 1.1,
                      textJustify: 'auto',
                      textAllowOverlap: false,
                      textIgnorePlacement: false,
                      textPadding: 4,
                      textMaxWidth: 8,
                      symbolZOrder: 'auto',
                    }}
                  />
                </MapboxGL.ShapeSource>

                {cragsGeoJSON.features.length > 0 && (
                  <MapboxGL.ShapeSource id="crags-src" shape={cragsGeoJSON} onPress={onCragPinPress}>
                    <MapboxGL.CircleLayer
                      id="crags-pins"
                      style={{
                        circleRadius: 7,
                        circleColor: '#FF9500',
                        circleStrokeWidth: 2.5,
                        circleStrokeColor: '#fff',
                      }}
                    />
                    <MapboxGL.SymbolLayer
                      id="crags-labels"
                      style={{
                        textField: ['get', 'name'] as any,
                        textSize: 11,
                        textColor: scheme === 'dark' ? '#E2E8F0' : '#0F172A',
                        textHaloColor:
                          scheme === 'dark' ? 'rgba(11,18,32,0.85)' : 'rgba(255,255,255,0.85)',
                        textHaloWidth: 1.2,
                        textAnchor: 'top',
                        textOffset: [0, 1.3],
                        textJustify: 'center',
                        textAllowOverlap: false,
                        textIgnorePlacement: false,
                        textPadding: 4,
                        textMaxWidth: 10,
                        symbolZOrder: 'auto',
                      }}
                    />
                  </MapboxGL.ShapeSource>
                )}
              </>
            )}

            {/* Area / list mode: MapPinCluster (multi-level crag/sector/wall pins) */}
            {(mode.kind === 'area' || mode.kind === 'list') && (
              <MapPinCluster
                pins={mode.kind === 'area' ? areaData.pins : listData.pins}
                styleReady={styleLoaded}
                onPinPress={onOutdoorPinPress}
              />
            )}

            {/* Area mode: approach trail overlay (dashed earth-tone line).
                List mode skips it — a list may span multiple areas and the
                overlay would be incoherent across them. */}
            {mode.kind === 'area' && styleLoaded && (
              <TrailLayer trailGeoJSON={areaData.area?.trail_geojson} />
            )}

            {/* Hide built-in clutter layers (POI + secondary roads). */}
            {styleLoaded &&
              HIDDEN_SYMBOL_LAYERS.map((id) => (
                <MapboxGL.SymbolLayer key={id} id={id} existing style={HIDDEN_STYLE} />
              ))}
            {styleLoaded &&
              HIDDEN_LINE_LAYERS.map((id) => (
                <MapboxGL.LineLayer key={id} id={id} existing style={HIDDEN_STYLE} />
              ))}
          </MapboxGL.MapView>
        ) : (
          <View style={styles.missingToken}>
            <Text style={styles.missingTokenText}>缺少 MAPBOX_TOKEN（请在 app.json 的 extra 中配置）。</Text>
          </View>
        )}

        {(mode.kind === 'area' && areaData.loading) ||
        (mode.kind === 'list' && listData.loading) ? (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={colors.accent} />
          </View>
        ) : null}

        {/* Hide the map with a fully opaque overlay while we wait for the
            first camera center. Otherwise Mapbox's default [0,0] view (the
            "null island" in the Gulf of Guinea) flashes for a second or
            two every time the user enters /map. The shared loadingOverlay
            above is 10% opacity (meant for pin-loading on top of pins),
            which is why it didn't actually hide the null-island flash. */}
        {mode.kind === 'gyms' && !initialGymsCenterDone && !gymsError ? (
          <View style={[styles.initialMapCover, { backgroundColor: colors.background }]}>
            <ActivityIndicator size="large" color={colors.accent} />
          </View>
        ) : null}

        {/* Pin-pick overlay (pan + confirm). Action bar sits 16pt above
            the 76pt COLLAPSED primary sheet so it doesn't get clipped.
            Buttons use native SwiftUI Button styles (.bordered /
            .borderedProminent + .controlSize("extraLarge")) for an
            iOS-native feel. */}
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
                    // Restore primary sheet to where the user left it,
                    // then re-present AddRouteSheet on top.
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

      {topBar}

      {/* Primary sheet — single sheet, content swaps by mode. */}
      <TrueSheet
        ref={sheet.sheetRef}
        name="map-primary-sheet"
        detents={[...sheet.detents]}
        initialDetentIndex={initialMode.kind === 'gyms' ? DETENT_MEDIUM : DETENT_COLLAPSED}
        initialDetentAnimated
        dimmed={false}
        dismissible={false}
        grabber
        grabberOptions={{ height: 3, width: 36, topMargin: 6 }}
        header={sheetHeader}
        scrollable
        onDidPresent={sheet.onDidPresent}
        onWillDismiss={sheet.onWillDismiss}
        onDidDismiss={sheet.onDidDismiss}
        onDetentChange={sheet.onDetentChange}
      >
        {mode.kind === 'gyms' ? (
          <View style={[styles.gymsSheetContent, { paddingBottom: getMapSheetBottomInset(insets) }]}>
            <GymsSavedSpotsRow onSelectArea={onSelectAreaFromList} />
            <GymList
              gyms={gyms}
              areas={gymsData.areas}
              areaDistances={gymsData.areaDistances}
              onSelectGym={onSelectGymFromList}
              onSelectArea={onSelectAreaFromList}
              // Stale-while-revalidate: suppress the spinner once we have a
              // list. onMapIdle refetches happen on every tiny camera settle
              // (GPS tick, small gestures, style reload) and were flashing
              // the loader in the sheet header every few seconds. Refetches
              // now update the list silently; the spinner only fires when
              // the list is genuinely empty (first load / after clearing).
              loading={gymsLoading && gyms.length === 0}
              error={gymsError}
              colors={gymsPalette.colors}
              emptyText={
                center
                  ? tr('附近没有匹配结果', 'No gyms found nearby.')
                  : tr('等待定位或输入搜索关键字。', 'Waiting for your location or a keyword…')
              }
            />
          </View>
        ) : (
          <>
          <TopFadeMaskView topFadeRatio={0.15}>
          <ScrollView
            ref={sheetScrollRef}
            contentContainerStyle={[
              cragStyles(colors).sheetBody,
              {
                paddingTop:
                  mode.kind === 'area' && !searchExpanded ? 76 : 4,
                paddingBottom: getMapSheetBottomInset(insets) + 20,
              },
            ]}
            showsVerticalScrollIndicator={false}
          >
            {/* Scoped sub-title row: shown only when a pin/search has set
                sheetTitle, OR for list-mode showing the list length. Area
                name itself has moved up into the pinned header overlay. */}
            {mode.kind === 'area' && sheetTitle ? (
              <View style={cragStyles(colors).titleRow}>
                <Text style={cragStyles(colors).sheetTitleText} numberOfLines={1}>
                  {sheetTitle}
                </Text>
              </View>
            ) : mode.kind === 'list' && listData.listDetail ? (
              <View style={cragStyles(colors).titleRow}>
                <Text style={cragStyles(colors).sheetTitleText} numberOfLines={1}>
                  {`${listData.listDetail.item_count} ${tr('条路线', listData.listDetail.item_count === 1 ? 'route' : 'routes')}`}
                </Text>
              </View>
            ) : null}

            {loadingSheet || (mode.kind === 'area' && areaData.loading) || (mode.kind === 'list' && listData.loading) ? (
              <ActivityIndicator size="large" color={colors.accent} style={{ marginTop: 40 }} />
            ) : mode.kind === 'list' ? (
              listData.listDetail && listData.listDetail.items.length > 0 ? (
                listData.listDetail.items.map((it) => {
                  if (!it.route) return null;
                  const routeId = it.route.id;
                  const highlighted = focusedItemId === it.id;
                  return (
                    <View
                      key={it.id}
                      onLayout={(e) => {
                        itemOffsetsRef.current[it.id] = e.nativeEvent.layout.y;
                      }}
                      style={
                        highlighted
                          ? { borderRadius: 14, backgroundColor: colors.backgroundSecondary }
                          : undefined
                      }
                    >
                      <RouteListCard
                        route={{ ...it.route, sector_name: it.sector_name, wall_name: it.wall_name }}
                        onPress={() => navigateToRoute(routeId)}
                      />
                    </View>
                  );
                })
              ) : (
                <Text style={cragStyles(colors).emptyText}>
                  {tr('清单暂无路线', 'No routes in this list yet')}
                </Text>
              )
            ) : areaSearchResults ? (
              areaSearchResults.length === 0 ? (
                <Text style={cragStyles(colors).emptyText}>{tr('无匹配路线', 'No matching routes')}</Text>
              ) : (
                areaSearchResults.map((route) => (
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
              <Text style={cragStyles(colors).emptyText}>
                {tr('点击地图上的圆点查看路线', 'Tap a pin on the map to see routes')}
              </Text>
            )}
          </ScrollView>
          </TopFadeMaskView>

          {/* Pinned area header overlay — sits on top of TopFadeMaskView
              so the alpha gradient (set ratio 0.15) fades scroll content
              behind it. Buttons + title remain fully visible (sibling,
              not masked). Mirrors gym/[gymId].tsx pattern. */}
          {mode.kind === 'area' && !searchExpanded ? (
            <View style={cragStyles(colors).pinnedHeaderOverlay} pointerEvents="box-none">
              <View style={{ width: 88, height: 44 }}>
                <Host matchContents>
                  <GlassEffectContainer spacing={0}>
                    <GlassUnionGroup>
                      <HStack spacing={0}>
                        <Button
                          systemImage={'magnifyingglass' as any}
                          label=""
                          onPress={openAreaSearch}
                          modifiers={[
                            buttonStyle('plain'),
                            labelStyle('iconOnly'),
                            font({ size: 18, weight: 'light' }),
                            frame({ width: 44, height: 44, alignment: 'center' }),
                            glassEffect({
                              glass: { variant: 'regular', interactive: true },
                              shape: 'capsule',
                            }),
                            glassEffectUnion('sheet-left-pill'),
                          ] as any}
                        />
                        <Button
                          systemImage={'person.2' as any}
                          label=""
                          onPress={navigateToCommunity}
                          modifiers={[
                            buttonStyle('plain'),
                            labelStyle('iconOnly'),
                            font({ size: 18, weight: 'light' }),
                            frame({ width: 44, height: 44, alignment: 'center' }),
                            glassEffect({
                              glass: { variant: 'regular', interactive: true },
                              shape: 'capsule',
                            }),
                            glassEffectUnion('sheet-left-pill'),
                          ] as any}
                        />
                      </HStack>
                    </GlassUnionGroup>
                  </GlassEffectContainer>
                </Host>
              </View>

              <View style={{ flex: 1 }} />

              <View style={{ width: 44, height: 44 }}>
                <HeaderButton
                  icon="line.3.horizontal"
                  variant="glass"
                  size={44}
                  onPress={() => areaMenuSheetRef.current?.present()}
                />
              </View>

              <View style={cragStyles(colors).headerTitleAbsolute} pointerEvents="box-none">
                <TouchableOpacity
                  onPress={openAreaInfo}
                  activeOpacity={0.6}
                  hitSlop={8}
                  style={cragStyles(colors).headerTitleHit}
                >
                  <Text style={cragStyles(colors).headerAreaName} numberOfLines={1}>
                    {areaData.area?.name ?? mode.areaName ?? tr('攀岩区', 'Area')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : null}
          </>
        )}
      </TrueSheet>

      {/* Detail sheet — gyms mode POI card (gym or area). */}
      <TrueSheet
        ref={detailSheetRef}
        name="map-detail-sheet"
        detents={[0.45, 0.9]}
        scrollable
        dimmed={false}
        dismissible
        grabber
        grabberOptions={{ height: 3, width: 36, topMargin: 6 }}
        footer={
          detailGym ? (
            <GymDetailFooter gym={detailGym} gymId={detailGymId} />
          ) : undefined
        }
        onDidPresent={() => {
          detailSheetPresentedRef.current = true;
        }}
        onWillDismiss={() => {
          detailSheetPresentedRef.current = false;
          setDetailSheetFull(false);
        }}
        onDidDismiss={() => {
          detailSheetPresentedRef.current = false;
          setDetailSheetFull(false);
          setDetailGym(null);
          setDetailGymId(null);
          useGymsStore.getState().setSelectedGym(null);
        }}
        onDetentChange={(e) => setDetailSheetFull(e.nativeEvent.index === 1)}
      >
        {/* TrueSheet's `scrollable` traverses children recursively to
            find the ScrollView and pin its edges, so adding a sibling
            (the bottom fade) doesn't break it. The fade sits in the
            content layer; the native footer view is mounted later by
            TrueSheet's container, so its z-order is on top of both. */}
        <ScrollView
          contentContainerStyle={[styles.detailScrollContent, { paddingBottom: getMapSheetBottomInset(insets) + 8 }]}
          showsVerticalScrollIndicator={false}
        >
          {detailGym && (
            <GymDetailCard
              gym={detailGym}
              onClose={() => detailSheetRef.current?.dismiss().catch(() => {})}
              onGymIdResolved={setDetailGymId}
            />
          )}
        </ScrollView>
      </TrueSheet>

      {/* Canonical area info sheet — presented from gyms-mode area pin,
          crag-mode area name tap, and AreaMenuSheet. */}
      <AreaInfoSheet
        ref={areaInfoSheetRef}
        areaId={areaInfoId}
        context={areaInfoContext}
        seedArea={areaInfoSeed}
        onPressRouteMap={() => {
          if (areaInfoContext === 'gyms' && areaInfoSeed) {
            areaInfoSheetRef.current?.dismiss();
            enterArea(areaInfoSeed.id, areaInfoSeed.name);
          }
        }}
      />
      {/* Area menu sheet (stacked) — spawned from the sheet-header
          hamburger tap. Hosts area header card + climb-type segment +
          Area Tools + User Tools. Only mounted in area mode (gyms/list
          modes have no area context for the header card). */}
      {mode.kind === 'area' && areaData.area ? (
        <AreaMenuSheet
          ref={areaMenuSheetRef}
          area={{
            id: areaData.area.id,
            name: areaData.area.name,
            cover_url: areaData.area.cover_url,
            crag_count: areaData.area.crag_count ?? 0,
            route_count: areaData.area.route_count ?? 0,
            boulder_count: areaData.area.boulder_count ?? 0,
          }}
          areaModeIndex={areaModeIndex}
          setAreaModeIndex={setAreaModeIndex}
          onPressMyList={() => myListSheetRef.current?.present()}
          onPressAddRoute={() => addRouteSheetRef.current?.present()}
          onPressReports={() => reportsSheetRef.current?.present()}
          onPressOfflineMaps={() => offlineMapsSheetRef.current?.present()}
        />
      ) : null}

      {/* My List sheet (stacked on top of the profile sheet). */}
      <MyListSheet ref={myListSheetRef} />

      {/* Reports sheet (stacked on top of the profile sheet). */}
      <ReportsSheet ref={reportsSheetRef} />

      {/* Offline Maps sheet (AG, Mapbox only). CN Amap page at
          app/outdoor/crag-map.tsx intentionally doesn't mount this. */}
      <OfflineMapsSheet ref={offlineMapsSheetRef} currentStyleId={styleId} />

      {/* Add Route sheet — only meaningful in area mode (submissions are
          scoped to an area). In other modes the AreaMenuSheet entry is
          suppressed. */}
      {mode.kind === 'area' ? (
        <AddRouteSheet
          ref={addRouteSheetRef}
          areaId={mode.areaId}
          onRequestPinOnMap={() => {
            // AddRouteSheet dismissed itself already. Snapshot the
            // primary sheet's detent, dismiss it for a clean map view,
            // then enter pin-pick mode. Cancel/Confirm restore the
            // sheet to the saved detent and re-present AddRouteSheet.
            prePinPickDetentRef.current = sheet.currentDetentIndex;
            sheet.sheetRef.current?.dismiss().catch(() => {});
            setPinPickMode(true);
          }}
        />
      ) : null}
    </View>
  );
}

const createStyles = (_c: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    root: { flex: 1 },
    mapWrap: { flex: 1 },
    missingToken: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 24,
    },
    missingTokenText: { color: '#ef4444', fontSize: 16, textAlign: 'center' },
    gymsSheetContent: { flex: 1 },
    loadingOverlay: {
      ...StyleSheet.absoluteFillObject,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(0,0,0,0.1)',
    },
    initialMapCover: {
      ...StyleSheet.absoluteFillObject,
      alignItems: 'center',
      justifyContent: 'center',
      // backgroundColor injected inline so it follows the theme
      // (light: #FFF, dark: #000) without needing a dark-mode StyleSheet variant.
    },
    // PlaceSheetHero owns its own marginTop:12 so the visible inset
    // from the sheet edge is uniform 12pt on top + sides. No extra
    // ScrollView paddingTop here — that would push the hero down and
    // break the concentric layout.
    detailScrollContent: { paddingTop: 0 },
    // AddRouteSheet pin-pick overlay (pan + confirm).
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
    // Symmetric pair: both Hosts flex: 1 so Cancel + Confirm take
    // equal width. Explicit height prevents SwiftUI's intrinsic
    // content measurement from collapsing a label-only .bordered
    // button to a dot. Matching `frame({ maxWidth: 9999 })` on each
    // button expands the SwiftUI content to fill the Host.
    pinPickCancelHost: { flex: 1, height: 48 },
    pinPickConfirmHost: { flex: 1, height: 48 },
  });

// area-mode sheet styles — mirror crag-map.tsx's createStyles so visuals stay identical.
const cragStyles = (c: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      // Apple HIG sheet-header spec: 16pt inset on all four sides for
      // 44pt icon buttons. Stacks with sheetBody's own padding
      // (paddingHorizontal:8, paddingTop:4), so headerRow contributes
      // the remainder: 8 + 8 = 16 horizontal, 4 + 12 = 16 top,
      // 16 bottom directly. Grabber (y=6-9) is a native overlay — it
      // doesn't offset the ScrollView, so we don't subtract it here.
      paddingHorizontal: 8,
      paddingTop: 12,
      paddingBottom: 16,
      gap: 10,
    },
    pinnedHeaderOverlay: {
      // Absolute-positioned pinned header sitting on top of the
      // TopFadeMaskView. Sheet edges have 16pt symmetric inset (full
      // value here since the absolute overlay isn't nested in
      // sheetBody's 8pt horizontal padding). Same buttons + title
      // structure as the old in-scroll header, just floating.
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 16,
      gap: 10,
      zIndex: 10,
    },
    // Title absolutely positioned across the headerRow. Because the
    // headerRow's horizontal padding is symmetric (8 + 8 sheetBody =
    // 16 on each side), the absolute layer's center equals the sheet's
    // horizontal midline — the title lines up with the grabber bar
    // above it regardless of the left-pill and right-avatar widths.
    headerTitleAbsolute: {
      position: 'absolute',
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitleHit: {
      // Reserve margin so a long area name doesn't collide with the
      // left pill (~88pt wide) or right avatar (44pt + gap). 120 on
      // each side ~= space beyond both elements on most iPhone widths.
      maxWidth: '60%',
    },
    headerAreaName: {
      fontFamily: theme.fonts.bold,
      fontSize: 20,
      textTransform: 'uppercase',
      color: c.textPrimary,
      flexShrink: 1,
    },
    headerAvatar: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: c.backgroundSecondary,
    },
    headerAvatarFallback: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: c.backgroundSecondary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    // Pure-RN fused pill — capsule container with two 44×44 buttons
    // inside. Avoids the @expo/ui Host re-measure race during fast
    // TrueSheet collapse animations.
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
    // Segment row — own row below the icons row, full width.
    segmentRow: {
      paddingHorizontal: theme.spacing.screenPadding,
      paddingTop: 4,
      paddingBottom: 8,
    },
    segmentControl: {
      height: 32,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.screenPadding,
      paddingBottom: 8,
      gap: 8,
    },
    sheetTitleText: { flex: 1, fontFamily: theme.fonts.bold, fontSize: 15, color: c.textPrimary },
    sheetBody: { paddingHorizontal: 8, paddingTop: 4 },
    emptyText: {
      fontFamily: theme.fonts.regular,
      fontSize: 14,
      color: c.textTertiary,
      textAlign: 'center',
      marginTop: 40,
    },
  });
