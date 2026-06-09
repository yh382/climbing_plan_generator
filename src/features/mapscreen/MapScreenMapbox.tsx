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
  AppState,
  type AppStateStatus,
  View,
  Text,
  StyleSheet,
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
import useSettingsStore from '../../store/useSettingsStore';
import { theme } from '../../lib/theme';
// TopFadeMaskView moved into RoutesListSheet (Day 2 extraction).
import MapSessionPill from '../journal/MapSessionPill';
import { useTodaySendsButton } from '../dailysummary/useTodaySendsButton';

import { useGymsStore } from '../../store/useGymsStore';
import CragMenuSheet, { type CragMenuSheetHandle } from './components/CragMenuSheet';
// CA Phase 4b — single unified sheet replaces RegionInfoSheet / AreaInfoSheet /
// CragInfoSheet. Display kind is derived from the OutdoorArea, not the route.
import OutdoorAreaInfoSheet, {
  type OutdoorAreaInfoSheetHandle,
  type AreaSeedInput,
} from './components/OutdoorAreaInfoSheet';
import MyListSheet, { type MyListSheetHandle } from './components/MyListSheet';
import ReportsSheet, { type ReportsSheetHandle } from './components/ReportsSheet';
import OfflineMapsSheet, {
  type OfflineMapsSheetHandle,
} from './components/OfflineMapsSheet';
import AddRouteSheet, { type AddRouteSheetHandle } from '../outdoor/components/AddRouteSheet';
import { Host, Button } from '@expo/ui/swift-ui';
import {
  buttonStyle,
  controlSize,
  frame,
  tint,
} from '@expo/ui/swift-ui/modifiers';
// HeaderButton moved into RoutesListSheet (Day 2 extraction).
import usePreviousTabStore from '../../store/usePreviousTabStore';
// GlassUnionPill moved into RoutesListSheet (Day 2 extraction).
import type { GymPlace, LatLng } from '../../../lib/poi/types';

import { GymList } from '../gyms/components/GymList';
import { GymsSavedSpotsRow } from './components/GymsSavedSpotsRow';
import { GymDetailCard } from '../gyms/components/GymDetailCard';
import { GymDetailFooter } from '../gyms/components/GymDetailFooter';
import { useGymsColors } from '../gyms/useGymsColors';

import MapPinCluster from '../outdoor/components/MapPinCluster';
import RoutePinCluster, {
  type WallPinContext,
} from '../outdoor/components/RoutePinCluster';
import CragOverviewCluster, {
  getMinRoutesForZoom,
  type CragPinContext,
} from '../outdoor/components/CragOverviewCluster';
import { useViewportPins, type ViewportBbox } from '../outdoor/useViewportPins';
import { outdoorApi } from '../outdoor/api';
import { useCragsOverview } from './useCragsOverview';
import TrailLayer from '../outdoor/components/TrailLayer';
import CragPolygonOverlay from '../outdoor/components/CragPolygonOverlay';
import { getDevTrailFallback } from '../outdoor/devTrailFixture';
import { FilterChipsBar } from './components/FilterChipsBar';
import useOutdoorMapFiltersStore from '../../store/useOutdoorMapFiltersStore';
import { MapSearchResultsList } from './components/MapSearchResultsList';
// WallGroup + RouteListCard moved into RoutesListSheet (Day 2 extraction).
import RoutesListSheet, {
  type RoutesListSheetMode,
  type BrowsingCragSummary,
} from './components/RoutesListSheet';
// BR Track A: top-level outdoor entity is now Region. Alias kept for
// caller minimum-diff — Track D will rename across this file.
import type {
  Region as Area,
  MapPin,
  Wall,
  OutdoorRoute,
  SearchResult,
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
  // navigate to explore mode + highlight; the user then taps the spot in
  // the sheet to drill in. This removes the cross-tab param-propagation
  // bug entirely — `mode` only changes via in-component callbacks.
  //
  // List mode keeps its URL-param external path (profile/lists toolbar
  // map button) because it has a single user-driven entry and no
  // cross-list switching flow.
  const initialMode: MapMode = initialListId
    ? { kind: 'list', listId: initialListId }
    : { kind: 'explore' };
  const modeState = useMapMode(initialMode);
  const { mode, prevCamera, observeCamera, enterArea, enterList, backToExplore } = modeState;

  // ---- Refs ----
  const mapRef = useRef<MapboxGL.MapView>(null);
  const camRef = useRef<MapboxGL.Camera>(null);
  const sheetScrollRef = useRef<ScrollView>(null);
  const itemOffsetsRef = useRef<Record<string, number>>({});

  // Latest map center — kept in a ref so onCameraChanged can update it
  // without triggering re-renders. The manual-drag refocus handler reads
  // it to figure out which wall the user is looking at.
  const mapCenterRef = useRef<{ lat: number; lng: number } | null>(null);
  // Latest full camera snapshot (center + zoom). Used to restore camera
  // position after MapView key-bump remount on AppState background→
  // active recovery (otherwise Mapbox resets to [0,0] default).
  const lastCameraSnapshotRef = useRef<{ center: [number, number]; zoom: number } | null>(null);
  // BS-P1-ε — Importance-by-zoom tier for outdoor crag overview.
  // Only re-renders the cluster source when the tier crosses a
  // boundary (zoom 6 / 8 / 10 / 12) rather than every camera frame.
  const [cragMinRoutes, setCragMinRoutes] = useState(() => getMinRoutesForZoom(0));
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
    // Explore mode keeps the classic header-only collapsed look (max
    // map); area/list mode widens to 25% so the first route card
    // peeks out at COLLAPSED. The memo in useMapSheetState picks up
    // this change dynamically as the user transitions modes.
    collapsedFraction: mode.kind === 'explore' ? 'header-only' : 0.25,
    // Explore mode lands the user directly at MEDIUM so the list is
    // visible on first frame (Apple Maps default). Area/list mode
    // keeps COLLAPSED (peek) since the map is the primary focus
    // there until the user decides to browse.
    initialDetent: initialMode.kind === 'explore' ? DETENT_MEDIUM : DETENT_COLLAPSED,
    onManualOpen: useCallback(() => {
      manualOpenHandlerRef.current?.();
    }, []),
  });
  const detailSheetRef = useRef<TrueSheet>(null);
  // CA Phase 4b — unified sheet ref. Replaces 3 separate refs (areaInfoSheetRef
  // for Region, cragInfoSheetRef for Crag, areaInfoFromSpotsSheetRef for Area).
  // Sheet looks up by area_id and derives layout from display_kind.
  const outdoorAreaSheetRef = useRef<OutdoorAreaInfoSheetHandle>(null);
  // BK: track area info sheet presented state so the top-bar back button
  // dismisses the sheet first (Apple Maps pattern) instead of returning
  // to the previous tab when an info sheet is on top of the gyms sheet.
  const [areaInfoOpen, setAreaInfoOpen] = useState(false);
  const cragMenuSheetRef = useRef<CragMenuSheetHandle>(null);
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

  // BR Track D Day 5b — bbox-scoped outdoor route pins. Updated in
  // onMapIdle via mapRef.getVisibleBounds(). useViewportPins debounces
  // BE fetches 300ms behind camera changes (see data-flow doc 14).
  const [bbox, setBbox] = useState<ViewportBbox | null>(null);
  // BR Track D Day 6 — FilterChipsBar selection forwarded to /outdoor/pins
  // for server-side style/discipline filter (PLAN §8). Select the primitive
  // string from the store (Object.is-stable across no-op renders) and
  // derive the BE param shape via useMemo. useViewportPins re-fires on
  // style/discipline change with its own 300ms debounce, same as bbox.
  const mapFilter = useOutdoorMapFiltersStore((s) => s.selected);
  const mapFilterParams = useMemo(() => {
    if (mapFilter === 'sport') return { style: 'sport' as const };
    if (mapFilter === 'trad') return { style: 'trad' as const };
    if (mapFilter === 'boulder') return { discipline: 'boulder' as const };
    return {};
  }, [mapFilter]);
  const viewportPins = useViewportPins(bbox, {
    enabled: (mode.kind === 'explore' || mode.kind === 'area') && styleReady,
    style: mapFilterParams.style,
    discipline: mapFilterParams.discipline,
  });
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

  // 2026-06-06 fix — when iOS releases the Mapbox GL context under
  // memory pressure during backgrounding, returning to foreground
  // silently leaves the map empty: tiles + style come back but our
  // JS-side ShapeSource/Layer children never re-add to the recovered
  // style. Just resetting styleReady doesn't help because Mapbox does
  // not re-fire onDidFinishLoadingStyle for a recovered style. The
  // bulletproof fix is to force MapboxGL.MapView to remount entirely
  // via a key bump, which tears down and rebuilds the native view +
  // all child sources/layers from JSX. Brief flash on return is
  // acceptable; previously the alternative was permanently empty map.
  // Independent of BS Track A/B; surfaced during real-device dogfood.
  const [mapMountKey, setMapMountKey] = useState(0);
  useEffect(() => {
    let prev: AppStateStatus = AppState.currentState;
    const sub = AppState.addEventListener('change', (next) => {
      if (prev !== 'active' && next === 'active') {
        setMapMountKey((k) => k + 1);
      }
      prev = next;
    });
    return () => sub.remove();
  }, []);

  // ---- Data hooks ----
  const gymsEnabled = mode.kind === 'explore';
  const gymsData = useGymsData(gymsEnabled);
  // BR Track D Day 7 follow-up — tier-1 Crag overview source (~15k crags,
  // loaded once + cached at module level). Drives the gyms-mode
  // `CragOverviewCluster` ShapeSource. PLAN §3.2 redesign.
  const cragsOverview = useCragsOverview(gymsEnabled);
  const areaId = mode.kind === 'area' ? mode.areaId : undefined;
  const areaData = useAreaData(areaId);
  const listId = mode.kind === 'list' ? mode.listId : undefined;
  const listData = useListData(listId);

  // ---- Gyms store bindings ----
  const gyms = useGymsStore((s) => s.gyms);
  // BR Track D Day 7 follow-up — accumulated gyms across the session
  // drive the map ShapeSource so cluster positions stay stable as the
  // user pans. PLAN §3.2 redesign.
  const accumulatedGyms = useGymsStore((s) => s.accumulatedGyms);
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
  // BR Track D Day 5d — focused Wall pin context. When set, RoutesListSheet
  // flips to 2-row header (Crag subtitle + large Wall title per PLAN §3.2),
  // and `walls` is reduced to that single wall. Cleared on enterArea /
  // mode change so a fresh area entry starts in default state.
  const [focusedWall, setFocusedWall] = useState<WallPinContext | null>(null);
  // BR Track D Day 7 — focused Crag's full detail, fetched on focusedWall
  // change. Used by TrailLayer (PLAN §9.1 — trail_geojson lives on Crag,
  // not Region post-Track-A). null when no wall focused; null
  // trail_geojson on the response is also expected (OSM Overpass backfill
  // BR-Track-C-FU-(c) hasn't run for most crags).
  const [focusedCragDetail, setFocusedCragDetail] = useState<
    import('../outdoor/types').CragDetail | null
  >(null);
  // BS-FU-A — crag-browse sub-state. Set on tier-1 crag pin tap (without
  // focusing a wall). RoutesListSheet then renders the Crag's walls list
  // sorted by route_count desc, and the user can pan the map to discover
  // other crags' walls (RoutePinCluster bbox follows the camera). Cleared
  // on area change / wall focus / back to explore.
  const [browsingCrag, setBrowsingCrag] = useState<CragPinContext | null>(null);
  const primaryDiscipline = useSettingsStore((s) => s.primaryDiscipline);
  const [areaModeIndex, setAreaModeIndex] = useState(
    primaryDiscipline === "boulder" ? 1 : 0,
  ); // 0=Routes, 1=Boulder

  // BK fix: when entering an area, default the toggle to the user's
  // preferred discipline. If the area has zero of that, auto-switch
  // to the other so the sheet isn't empty. Mixed areas stay on the
  // user's preference (visible to them = consistent across areas).
  useEffect(() => {
    if (mode.kind !== 'area') return;
    const area = areaData.area;
    if (!area) return;
    const routeCount = (area.route_count ?? 0) - (area.boulder_count ?? 0);
    const boulderCount = area.boulder_count ?? 0;
    const preferred = primaryDiscipline === "boulder" ? 1 : 0;
    const preferredCount = preferred === 1 ? boulderCount : routeCount;
    const otherCount = preferred === 1 ? routeCount : boulderCount;
    if (preferredCount > 0) {
      setAreaModeIndex(preferred);
    } else if (otherCount > 0) {
      setAreaModeIndex(preferred === 1 ? 0 : 1);
    } else {
      setAreaModeIndex(preferred);
    }
  }, [
    mode.kind,
    areaData.area?.id,
    areaData.area?.route_count,
    areaData.area?.boulder_count,
    primaryDiscipline,
  ]);

  // BS-FU-A — crag-browse derived: synthesize summary for the mini snapshot
  // (seeds from CragPinContext for instant render, refined when
  // focusedCragDetail lands). Walls list reused from focusedCragDetail.walls
  // sorted by route_count desc.
  const browsingCragSummary: BrowsingCragSummary | null = useMemo(() => {
    if (!browsingCrag) return null;
    return {
      id: browsingCrag.crag_id,
      name: browsingCrag.crag_name,
      region_name: browsingCrag.region_name,
      cover_url: focusedCragDetail?.cover_url ?? null,
      wall_count: focusedCragDetail?.walls?.length ?? undefined,
      route_count: focusedCragDetail?.route_count ?? browsingCrag.route_count,
      boulder_count: browsingCrag.boulder_count,
    };
  }, [browsingCrag, focusedCragDetail]);

  const browsingCragWalls = useMemo(() => {
    if (!browsingCrag) return null;
    const walls = focusedCragDetail?.walls;
    if (!walls) return null;
    return [...walls].sort((a, b) => (b.route_count ?? 0) - (a.route_count ?? 0));
  }, [browsingCrag, focusedCragDetail]);

  const [searchExpanded, setSearchExpanded] = useState(false);
  // Route id that the user tapped on the map — forwarded to WallGroup so
  // that route card is moved to the top of its wall's route list. Cleared
  // whenever a non-route (wall/sector/crag) pin is tapped.
  const [highlightedRouteId, setHighlightedRouteId] = useState<string | null>(null);

  // List-mode focus highlight
  const [focusedItemId, setFocusedItemId] = useState<string | null>(null);

  // Reset area-mode scratch state when the active area changes.
  // BS-FU-A: browsingCrag is INTENTIONALLY excluded from this reset.
  // `onCragOverviewPress` sets browsingCrag in the same batch that calls
  // enterArea() — including the reset here would clobber it on the very
  // first render of the new area mode (areaId-change effect runs AFTER
  // commit). browsingCrag is reset explicitly on backToExplore (the
  // mode.kind effect below) and by focusOnWall implicitly (focusedWall
  // takes render precedence). focusedCragDetail also excluded for the
  // same reason — it's reset by its own crag_id-driven effect.
  useEffect(() => {
    setSheetTitle('');
    setWalls([]);
    setAreaSearchResults(null);
    setAreaSearchQuery('');
    setSearchExpanded(false);
    setFocusedWall(null);
  }, [areaId]);

  // BS-FU-A — clear crag-browse sub-state when leaving area mode.
  useEffect(() => {
    if (mode.kind !== 'area') {
      setBrowsingCrag(null);
      setFocusedCragDetail(null);
    }
  }, [mode.kind]);

  // BR Track D Day 7 — when a Wall is focused, lazy-fetch its parent
  // Crag's full detail (PLAN §9.1 trail_geojson lives on Crag). Cached
  // by crag_id so flipping between walls on the same crag is a no-op.
  // Same crag's detail also seeds CragInfoSheet — but that sheet runs
  // its own fetch on present(); we accept the duplicate cost as small
  // (response is light, BE cache is hot).
  useEffect(() => {
    // BS-FU-A: also fires for browsingCrag (crag-browse sub-state) — the
    // RoutesListSheet needs the same CragDetail.walls list to render the
    // sorted walls overview. focusedWall takes precedence when both set.
    const cragId = focusedWall?.crag_id ?? browsingCrag?.crag_id;
    if (!cragId) {
      setFocusedCragDetail(null);
      return;
    }
    if (focusedCragDetail?.id === cragId) return;
    let cancelled = false;
    outdoorApi
      .getCragDetail(cragId)
      .then((detail) => {
        if (cancelled) return;
        setFocusedCragDetail(detail);
      })
      .catch(() => {
        if (cancelled) return;
        setFocusedCragDetail(null);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusedWall?.crag_id, browsingCrag?.crag_id]);

  // BR Track D Day 5e — legacy autoLoadedAreaRef effect REMOVED.
  // It used `areaData.pins.filter('crag')` + `areaData.loadWallsForPin`
  // to fan out wall loads on first area-mode entry, which depended on
  // the deleted `getMapPins` source. New flow per PLAN §3.2:
  //   - Region center fits the camera (camera choreography effect below)
  //   - viewportPins streams Wall pins in the visible bbox
  //   - User taps a Wall pin → focusOnWall populates the sheet
  // Entry path ① (gyms sheet `GymsSavedSpotsRow → onSelectAreaFromList`)
  // lands the user on the empty "Tap a pin on the map" state until they
  // pick a wall — an explicit UX trade per PLAN §3.2.

  // ---- Map is centered on user? (for explore mode location button) ----
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
  // fit to area pins once data loads. On backToExplore, fly to prevCamera.
  //
  // BU 2026-06-07 two-path invariant for area-mode camera:
  //   - **Crag-browse path** (onCragOverviewPress): sets browsingCrag FIRST,
  //     then enterArea + explicit flyTo(crag.lat, crag.lng, zoom 14). The
  //     `!browsingCrag` gate below SKIPS the region-centroid setCamera so
  //     the per-crag flyTo wins.
  //   - **Direct enterArea path** (saved-spots row / search hit / deep link):
  //     does NOT touch browsingCrag → gate is true → region-centroid fires
  //     normally (zoom 10 region overview is the right framing here).
  useEffect(() => {
    if (!styleReady || !mapReady || !camRef.current) return;
    if (mode.kind === 'area' && !browsingCrag) {
      // Area mode lands at MEDIUM — the user navigated here to browse
      // the crag's routes, not to stare at the map, so default to
      // showing a useful chunk of list. COLLAPSED is still reachable
      // via drag-down.
      sheet.safeResize(DETENT_MEDIUM);
      // BR Track D Day 5e — area-mode camera centers on the Region only.
      // Legacy fitBounds-to-crag-pins was the `getMapPins` pre-aggregated
      // flow (removed Day 5e); RoutePinCluster now streams pins via
      // bbox queries that follow the camera, so the initial framing is
      // the Region centroid + a comfortable zoom 10.
      if (areaData.area?.lat != null && areaData.area?.lng != null) {
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
    // explore mode on mount: the location-permission flow in useGymsData
    // drives the initial camera via store.userLoc. We handle the explicit
    // "back to gyms" fly-to separately in onBackToExplore.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    // BU dep: `browsingCrag` is read in the area-mode gate. Without it in
    // deps, the effect doesn't re-evaluate when browsingCrag changes —
    // exhaustive-deps would complain, but the gate would never re-evaluate
    // on subsequent crag-pin taps even though the effect IS supposed to
    // run on mode/area transitions. Effect identity is fine: when a NEW
    // crag is browsed (focusedWall cleared, browsingCrag flipped), we
    // already rely on the per-tap onCragOverviewPress flyTo, not this
    // effect. So the dep is conservative — it just gates correctness.
  }, [mode.kind, areaId, listId, areaData.area, listData.pins, styleReady, mapReady, browsingCrag]);

  // explore mode: when user location first arrives, snap the camera to it.
  // Map + style must both be ready — otherwise setCamera can be eaten by
  // the native view before the first frame, and we'd never retry because
  // the done-flag is already set. animationDuration: 0 avoids a visible
  // fly-from-null-island if GPS resolves after the style loads.
  // State (not ref) so the loading overlay below can react to it.
  const [initialGymsCenterDone, setInitialGymsCenterDone] = useState(false);
  useEffect(() => {
    if (mode.kind !== 'explore' || !userLoc || !camRef.current) return;
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
  const onBackToExplore = useCallback(() => {
    backToExplore();
    // Close any stacked sheets
    detailSheetRef.current?.dismiss().catch(() => {});
    outdoorAreaSheetRef.current?.dismiss();
    setDetailGym(null);
    setFocusedWall(null);
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
  }, [backToExplore, prevCamera, userLoc, markProgrammaticMove]);

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
      // top-bar). The debounced gyms fetchNearby stays gated to explore mode.
      useGymsStore.getState().setCenter(next);
      if (mode.kind === 'explore') {
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

      // BR Track D Day 5b — refresh bbox so useViewportPins picks up
      // the new viewport. getVisibleBounds returns [[ne_lng, ne_lat],
      // [sw_lng, sw_lat]] per @rnmapbox/maps@10.1.45. useViewportPins
      // handles its own 300ms debounce so we don't gate this on the
      // gyms 2km threshold above.
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
    },
    [mode.kind, gymsData],
  );

  // Wall pin tap handler — fires when the user taps a single Wall pin
  // (zoom ≥15 in the bbox cluster source). PLAN §3.2:
  //   - explore mode → enter the wall's parent Region first, then focus the
  //     wall once area mode is active. We set focusedWall up-front so the
  //     area-mode mount effect (autoLoadedAreaRef guard) can short-circuit
  //     to a single-wall load instead of fanning the entire region.
  //   - area mode → just focus the wall + load its routes inline.
  const focusOnWall = useCallback(
    async (ctx: WallPinContext) => {
      setFocusedWall(ctx);
      setHighlightedRouteId(null);
      setAreaSearchResults(null);
      setSheetTitle('');
      setLoadingSheet(true);
      try {
        const routes = await outdoorApi.getRoutes(ctx.wall_id);
        const wall: Wall = {
          id: ctx.wall_id,
          crag_id: ctx.crag_id,
          name: ctx.wall_name,
          lat: ctx.lat,
          lng: ctx.lng,
          sort_order: 0,
          status: 'approved',
          route_count: routes.length,
          routes,
        };
        setWalls([wall]);
      } finally {
        setLoadingSheet(false);
      }
      try {
        markProgrammaticMove(500);
        camRef.current?.setCamera({
          centerCoordinate: [ctx.lng, ctx.lat],
          zoomLevel: 16,
          animationDuration: 500,
          padding: pinFocusPadding,
        });
      } catch {}
      sheet.safeResize(DETENT_MEDIUM);
      sheetScrollRef.current?.scrollTo({ y: 0, animated: false });
    },
    [markProgrammaticMove, pinFocusPadding, sheet],
  );

  // BS-FU-A — crag-browse wall row tap. Synthesizes a WallPinContext from
  // the Wall + browsingCrag (the tier-1 overview only projects Region, so
  // area_id/area_name are left empty; CragMenuSheet Browse Up → Area row
  // degrades gracefully). Routes through focusOnWall for unified state
  // (camera fly + sheet detent + routes fetch).
  const onPressBrowseWall = useCallback(
    (wall: Wall) => {
      if (!browsingCrag) return;
      const ctx: WallPinContext = {
        wall_id: wall.id,
        wall_name: wall.name,
        crag_id: browsingCrag.crag_id,
        crag_name: browsingCrag.crag_name,
        area_id: '',
        area_name: '',
        region_id: browsingCrag.region_id,
        region_name: browsingCrag.region_name,
        lat: wall.lat ?? browsingCrag.lat,
        lng: wall.lng ?? browsingCrag.lng,
        route_count: wall.route_count ?? 0,
      };
      void focusOnWall(ctx);
    },
    [browsingCrag, focusOnWall],
  );

  const onWallPinPress = useCallback(
    (ctx: WallPinContext) => {
      if (mode.kind === 'explore') {
        // Transition into area mode first; the area-mode mount effect picks
        // up `focusedWall` to short-circuit the all-pins fan-out. We set
        // focusedWall BEFORE enterArea so the autoLoadedAreaRef branch sees
        // it on first run.
        setFocusedWall(ctx);
        enterArea(ctx.region_id, ctx.region_name);
        // Defer the route fetch + camera fly to the next tick so area mode's
        // own camera choreography (fitBounds on region pins) doesn't race
        // ahead. focusOnWall re-centers tighter on the wall after that.
        setTimeout(() => {
          void focusOnWall(ctx);
        }, 700);
        return;
      }
      if (mode.kind === 'area') {
        // BU 2026-06-07 — cross-crag wall tap in crag-browse sub-state.
        // If the tapped wall belongs to a DIFFERENT crag than the current
        // browsing crag, switch browse focus to that wall's crag (looking
        // up its full overview from the in-memory cragsOverview cache
        // when available). Otherwise (same crag, or no browsing crag),
        // fall through to the legacy focusOnWall.
        if (browsingCrag && ctx.crag_id !== browsingCrag.crag_id) {
          const overview = cragsOverview.crags.find((c) => c.id === ctx.crag_id);
          const nextCrag: CragPinContext = overview
            ? {
                crag_id: overview.id,
                crag_name: overview.name,
                region_id: overview.region_id,
                region_name: overview.region_name,
                lat: overview.lat,
                lng: overview.lng,
                route_count: overview.route_count,
                boulder_count: overview.boulder_count,
              }
            : {
                // Cache miss (rare — overview is module-cached at explore-
                // mode load). Synthesize from wall pin metadata; counts
                // stay undefined and consumers fall back to `?? 0`.
                crag_id: ctx.crag_id,
                crag_name: ctx.crag_name,
                region_id: ctx.region_id,
                region_name: ctx.region_name,
                lat: ctx.lat,
                lng: ctx.lng,
              };
          setFocusedWall(null);
          setBrowsingCrag(nextCrag);
          try {
            markProgrammaticMove(500);
            camRef.current?.setCamera({
              centerCoordinate: [nextCrag.lng, nextCrag.lat],
              zoomLevel: 14,
              animationDuration: 500,
              padding: pinFocusPadding,
            });
          } catch {}
          return;
        }
        void focusOnWall(ctx);
      }
    },
    [mode.kind, enterArea, focusOnWall, browsingCrag, cragsOverview.crags, markProgrammaticMove, pinFocusPadding],
  );

  // BS-FU-A — tier-1 Crag pin tap. Earlier BR Track D Day 7 behavior was
  // to present CragInfoSheet (a dead end with no entry into area mode).
  // New flow: enter area mode + set crag-browse sub-state + fly the camera
  // to the crag. RoutesListSheet then renders the crag's walls list, and
  // the bbox-scoped RoutePinCluster lets the user pan to discover walls
  // at neighboring crags. CragInfoSheet stays reachable from the sheet's
  // ⓘ button (mounted in the browsing-crag header).
  const onCragOverviewPress = useCallback(
    (ctx: CragPinContext) => {
      setFocusedWall(null);
      setBrowsingCrag(ctx);
      enterArea(ctx.region_id, ctx.region_name);
      try {
        markProgrammaticMove(500);
        camRef.current?.setCamera({
          centerCoordinate: [ctx.lng, ctx.lat],
          zoomLevel: 14,
          animationDuration: 500,
          padding: pinFocusPadding,
        });
      } catch {}
    },
    [enterArea, markProgrammaticMove, pinFocusPadding],
  );

  const onClusterBubblePress = useCallback(
    async (coords: [number, number]) => {
      // Fly camera into the cluster centroid. We bump zoom by a
      // fixed +2 step relative to the current zoom, capped at 16 so
      // the very last tap on a dense cluster lands inside the
      // single-Wall-pin band (≥15) where pins become individually
      // tappable. Mapbox `getClusterExpansionZoom` would be ideal but
      // its @rnmapbox API surface has shifted across versions — a
      // fixed step gives consistent behavior without a version gate.
      try {
        const currentZoom = (await mapRef.current?.getZoom()) ?? 12;
        const nextZoom = Math.min(16, currentZoom + 2);
        markProgrammaticMove(400);
        camRef.current?.setCamera({
          centerCoordinate: coords,
          zoomLevel: nextZoom,
          animationDuration: 350,
        });
      } catch {}
    },
    [markProgrammaticMove],
  );

  const onCameraChanged = useCallback(
    (state: MapState) => {
      const c = state.properties.center;
      const zoom = state.properties.zoom;
      if (!(c && c.length >= 2 && typeof zoom === 'number')) return;
      const currentLat = Number(c[1]);
      const currentLng = Number(c[0]);
      mapCenterRef.current = { lat: currentLat, lng: currentLng };
      lastCameraSnapshotRef.current = { center: [currentLng, currentLat], zoom };
      observeCamera({ center: [currentLng, currentLat], zoom });
      // BS-P1-ε — recompute importance tier; setState short-circuits
      // when value unchanged so this is cheap per camera frame.
      const nextMinRoutes = getMinRoutesForZoom(zoom);
      if (nextMinRoutes !== cragMinRoutes) {
        setCragMinRoutes(nextMinRoutes);
      }

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
    [observeCamera, sheet, windowHeight, cragMinRoutes],
  );

  // ---- Gyms-mode pin presses ----
  // When a gym is selected, fly camera +
  // present detail sheet (stacked on the gyms list sheet).
  useEffect(() => {
    if (mode.kind !== 'explore') return;
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

  // BR Track D Day 7 follow-up — gym ShapeSource feeds from the
  // accumulated set (not the per-fetch `gyms`) so cluster positions
  // stay stable as the user pans across the world. PLAN §3.2 redesign.
  const gymsGeoJSON = useMemo(
    () => ({
      type: 'FeatureCollection' as const,
      features: Object.values(accumulatedGyms).map((g) => ({
        type: 'Feature' as const,
        id: g.place_id,
        properties: { name: g.name, place_id: g.place_id },
        geometry: { type: 'Point' as const, coordinates: [g.location.lng, g.location.lat] },
      })),
    }),
    [accumulatedGyms],
  );
  const onGymPinPress = useCallback(
    (e: { features: GeoJSON.Feature[] }) => {
      const feature = e.features?.[0];
      if (!feature) return;
      // BS Track D (2026-06-06) — gyms-src no longer uses cluster:true,
      // so all feature taps are single gym pins. Previous cluster-bubble
      // branch removed (would dispatch to onClusterBubblePress).
      const placeId = feature.properties?.place_id;
      if (!placeId) return;
      // Use the accumulated set so a gym fetched in a previous pan
      // still resolves even if the latest fetchNearby dropped it from
      // the active list.
      const gym = accumulatedGyms[placeId];
      if (gym) useGymsStore.getState().setSelectedGym(gym);
    },
    [accumulatedGyms],
  );

  // BR Track D Day 7 dogfood fix — legacy Region-overview orange pin
  // layer (`crags-src` ShapeSource + `onCragPinPress` callback +
  // `cragsGeoJSON` memo) deleted. It rendered 911 region dots at low
  // zoom which visually competed with the new bbox `RoutePinCluster`
  // wall pins; tap fell through to the legacy `RegionInfoSheet` instead
  // of the Day 5d focusedWall path (PLAN §3.2). Region browsing now
  // goes through (a) gyms sheet `GymsSavedSpotsRow` + `GymList`'s
  // outdoor rows, or (b) cross-level `MapSearchResultsList`.

  // ---- List-mode pin press ----
  // BR Track D Day 5e — area mode no longer reaches this handler
  // (RoutePinCluster owns Wall pin taps via `onWallPinPress`). The
  // area-mode multi-level branch (route/wall/crag/area) is dead code
  // and was removed in Day 5e cleanup.
  const onOutdoorPinPress = useCallback(
    async (pin: MapPin) => {
      if (mode.kind !== 'list') return;
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
    },
    [mode.kind, sheet, markProgrammaticMove, pinFocusPadding],
  );

  // BR Track D Day 5e — drag-up-from-COLLAPSED handler is now a no-op
  // for area mode. The legacy "find nearest wall pin to map center +
  // load its routes" path required `areaData.pins.filter('wall')`,
  // which is gone after Day 5e. PLAN §3.2 is tap-driven: users focus
  // a wall by tapping its pin, not by dragging the sheet up.
  manualOpenHandlerRef.current = () => {};

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

  // CA Phase 4b — unified area-sheet present helper. Replaces 3 legacy
  // sheet helpers (openRegionInfo / cragInfoSheetRef.present / etc).
  // Caller passes minimal seed; the sheet hydrates the full detail via
  // useAreaDetail. display_kind drives section ordering.
  const presentArea = useCallback((seed: AreaSeedInput) => {
    void outdoorAreaSheetRef.current?.present(seed);
  }, []);

  const openRegionInfo = useCallback(() => {
    if (mode.kind !== 'area') return;
    presentArea({
      id: mode.areaId,
      name: mode.areaName ?? '',
      display_kind: 'region',
    });
  }, [mode, presentArea]);

  // PLAN §3.2 + BS-FU-A — RoutesListSheet title tap routes by focus state:
  //   - focusedWall set → present Crag info (parent of the focused Wall)
  //   - browsingCrag set (no focusedWall) → present Crag info for that crag
  //     (this is the ⓘ entry into the full Crag detail surface during
  //     crag-browse sub-state)
  //   - both unset → present Region info (legacy behavior)
  const openCragOrAreaInfo = useCallback(() => {
    if (focusedWall) {
      presentArea({
        id: focusedWall.crag_id,
        name: focusedWall.crag_name,
        display_kind: 'crag',
        lat: focusedWall.lat,
        lng: focusedWall.lng,
        parent_name_hint: focusedWall.area_name ?? null,
      });
      return;
    }
    if (browsingCrag) {
      presentArea({
        id: browsingCrag.crag_id,
        name: browsingCrag.crag_name,
        display_kind: 'crag',
        lat: browsingCrag.lat,
        lng: browsingCrag.lng,
        parent_name_hint: browsingCrag.region_name ?? null,
        direct_route_count: browsingCrag.route_count ?? undefined,
        subtree_route_count: browsingCrag.route_count ?? undefined,
      });
      return;
    }
    openRegionInfo();
  }, [focusedWall, browsingCrag, openRegionInfo, presentArea]);

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

  // BK: client-side substring filter of the visible gyms + outdoor
  // areas, applied as the user types in the gyms search bar. Submit
  // (Enter) still hits the server for a fresh nearby pull, but the
  // list updates instantly while typing so e.g. "wasatch" hides
  // everything except the matching area.
  const filteredGyms = useMemo(() => {
    const q = gymsQuery.trim().toLowerCase();
    if (!q) return gyms;
    return gyms.filter((g) => (g.name ?? '').toLowerCase().includes(q));
  }, [gyms, gymsQuery]);

  const filteredAreas = useMemo(() => {
    const q = gymsQuery.trim().toLowerCase();
    if (!q) return gymsData.areas;
    return gymsData.areas.filter((a) => {
      const zh = (a.name ?? '').toLowerCase();
      const en = (a.name_en ?? '').toLowerCase();
      return zh.includes(q) || en.includes(q);
    });
  }, [gymsData.areas, gymsQuery]);

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

  // BR Track D Day 6 — cross-level search row tap dispatcher.
  // SearchResult.type maps to the same surfaces as GymsSavedSpotsRow:
  //   region → enterArea() + RegionInfoSheet via the existing gyms→area path
  //   area   → AreaInfoSheet stacked
  //   crag   → CragInfoSheet stacked
  //   wall   → enterArea + focusedWall fill (Wall-pin-tap flow Day 5d)
  //   route  → /outdoor/outdoor-route-detail
  const handleSearchHit = useCallback(
    (hit: SearchResult) => {
      switch (hit.type) {
        case 'route':
          router.push({
            pathname: '/outdoor/outdoor-route-detail' as any,
            params: { id: hit.id },
          });
          return;
        case 'region':
          enterArea(hit.id, hit.name);
          return;
        case 'area':
          presentArea({
            id: hit.id,
            name: hit.name,
            display_kind: 'area',
          });
          return;
        case 'crag':
          presentArea({
            id: hit.id,
            name: hit.name,
            display_kind: 'crag',
            parent_name_hint: hit.area_name ?? null,
          });
          return;
        case 'wall':
          // No standalone Wall sheet — the natural fit is to drop the
          // user at the wall-focused RoutesListSheet 2-row state. Without
          // the full WallPinContext (no parent IDs in SearchResult), we
          // can only kick the user to the parent Region and let them
          // tap the wall in the cluster. Day 7 / BE follow-up: enrich
          // SearchResult with parent IDs to short-circuit this.
          return;
      }
    },
    [router, enterArea, presentArea],
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
    // BR Track D Day 6 — FilterChipsBar local filter is composed AFTER
    // the climb-type segment (areaModeIndex 0=Routes, 1=Boulder). When
    // boulder chip is selected the climb-type segment is moot (already
    // boulder-only), so we just narrow further by style if Sport/Trad
    // is chosen on top of Routes view.
    const byDiscipline = areaModeIndex === 0
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
  }, [walls, areaModeIndex, mapFilter]);

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

  // BK: in explore mode, when AreaInfoSheet is on top of the gyms sheet,
  // chevron.down should dismiss the info sheet first (Apple Maps
  // pattern) rather than navigating away from the map tab.
  const onLeftButtonPress = useCallback(() => {
    if (mode.kind === 'area') {
      onBackToExplore();
      return;
    }
    if (areaInfoOpen) {
      outdoorAreaSheetRef.current?.dismiss();
      return;
    }
    goToPreviousTab();
  }, [mode.kind, areaInfoOpen, onBackToExplore, goToPreviousTab]);

  const topBar = (
    <MapTopBar
      unionId="map-pill"
      leftButton={{
        icon: mode.kind === 'area' ? 'chevron.left' : 'chevron.down',
        onPress: onLeftButtonPress,
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
    if (mode.kind === 'explore') {
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
    // content reliably expands the sheet — same way explore mode works.
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
            key={mapMountKey}
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
            <MapboxGL.Camera
              ref={camRef}
              pitch={is3D ? 55 : 0}
              heading={0}
              // Restore last known camera on MapView remount (AppState
              // background→active recovery). defaultSettings only
              // applies on first mount of Camera, which is exactly what
              // we want for the key-bumped MapView remount. On initial
              // app launch the ref is null → Mapbox uses its own
              // default + the existing UserLocation follow logic.
              defaultSettings={
                lastCameraSnapshotRef.current
                  ? {
                      centerCoordinate: lastCameraSnapshotRef.current.center,
                      zoomLevel: lastCameraSnapshotRef.current.zoom,
                    }
                  : undefined
              }
            />

            {styleLoaded && (
              <MapboxGL.UserLocation animated={false} visible showsUserHeadingIndicator />
            )}

            {/* Explore mode: inline gym + crag shape sources */}
            {styleLoaded && mode.kind === 'explore' && (
              <>
                {/* BS Track D (2026-06-06) — gym cluster撤回. City gym
                    counts are low (Seattle ~12, SLC ~10); cluster
                    bubbles add a click-cost without helping
                    discovery (vs ChatGPT strategy review §4). 2 档:
                    zoom < 8 全 hide (continental view 不显示 gym pin
                    point), zoom ≥ 8 显示每个 gym 单 pin. Mapbox
                    `minZoomLevel` 是 native 层级 hide (无 RN zoom
                    state 同步). 不为极端密集城市加 fallback
                    cluster — 真出现 (e.g. Manhattan) 再做.
                    Previous: cluster + clusterMaxZoomLevel=12. */}
                <MapboxGL.ShapeSource
                  id="gyms-src"
                  shape={gymsGeoJSON}
                  onPress={onGymPinPress}
                >
                  <MapboxGL.CircleLayer
                    id="gyms-pins"
                    minZoomLevel={8}
                    style={{
                      circleRadius: 6,
                      // BS-P1-η — softer muted teal palette (was raw
                      // accent `#306E6F` + white stroke `#fff`).
                      // Explicit circleOpacity because @rnmapbox/maps
                      // drops alpha from `rgba()` in circleColor.
                      circleColor: colors.gymMarkerFill,
                      circleOpacity: Number(colors.markerOpacity),
                      circleStrokeWidth: 2,
                      circleStrokeColor: colors.gymMarkerStroke,
                    }}
                  />
                  {/* Gym name label — minZoomLevel matches pin (8) so
                      labels appear with their pin, NOT at a separate
                      zoom gate. Collision resolution enabled
                      (allowOverlap: false + ignorePlacement: false)
                      with textVariableAnchor so Mapbox tries
                      top/bottom/left/right anchors before hiding the
                      label. textPadding: 4 adds a small buffer so
                      labels don't visually touch. Result: at low zoom
                      where pins are dense (Seattle ~12), some labels
                      hide cleanly; zoom in to see hidden ones. */}
                  <MapboxGL.SymbolLayer
                    id="gyms-labels"
                    minZoomLevel={8}
                    style={{
                      textField: ['get', 'name'] as any,
                      // BS-P1-η — zoom-interpolated size + softer
                      // palette tokens + Regular weight (was Bold).
                      // Scheme-based hardcodes replaced by tokens.
                      textSize: [
                        'interpolate', ['linear'], ['zoom'],
                        11, 10.5,
                        14, 12,
                      ] as any,
                      textColor: colors.gymLabelText,
                      textHaloColor: colors.gymLabelHalo,
                      textHaloWidth: 1.25,
                      textFont: ['DIN Pro Regular', 'Arial Unicode MS Regular'],
                      textVariableAnchor: ['top', 'bottom', 'left', 'right'],
                      textRadialOffset: 0.8,
                      textJustify: 'auto',
                      textAllowOverlap: false,
                      textIgnorePlacement: false,
                      textPadding: 4,
                      textMaxWidth: 8,
                      symbolZOrder: 'auto',
                    }}
                  />
                </MapboxGL.ShapeSource>

                {/* BR Track D Day 7 dogfood fix — legacy `crags-src`
                    Region-overview ShapeSource removed. New
                    `RoutePinCluster` below (gyms + area mode) is the
                    sole orange-pin source. */}
              </>
            )}

            {/* BR Track D Day 7 follow-up tier-1 — Crag overview cluster.
                Replaces the legacy Region overview + bbox-shifting source
                in explore mode (PLAN §3.2 redesign). Stable pre-loaded ~15k
                Crag dataset with Mapbox `cluster:true` for visual
                aggregation. Cluster bubble label = sum of route_count
                across child crags. Tap single Crag pin → CragInfoSheet
                stacked. */}
            {mode.kind === 'explore' && (
              <CragOverviewCluster
                crags={cragsOverview.crags}
                styleReady={styleReady}
                onCragPress={onCragOverviewPress}
                onClusterPress={onClusterBubblePress}
                minRoutes={cragMinRoutes}
              />
            )}

            {/* BR Track D Day 5d/5e — bbox-scoped wall pin cluster for
                tier-2 (area mode only). User reaches this by tapping a
                Crag pin in explore mode → CragInfoSheet → "View on Map" →
                enterArea, or directly via GymsSavedSpotsRow / search
                hit. Once inside area mode the bbox follows the camera
                so users can pan within the focused Region. */}
            {/* BU 2026-06-07 — crag boundary polygon overlay for crag-browse
                sub-state. **Z-order**: mounted BEFORE RoutePinCluster /
                MapPinCluster / TrailLayer so wall pins + numbers paint ON
                TOP of the polygon. Mapbox-RN add order = paint order;
                later JSX children render above earlier ones.
                visible-gate ensures we ONLY render when the fetched
                focusedCragDetail belongs to the currently browsing crag
                (avoids stale polygon during async detail re-fetch on
                cross-crag wall tap). Pre-BV legacy crags with NULL wall
                coords gracefully render no polygon (computeCragPolygon
                returns null). */}
            <CragPolygonOverlay
              walls={focusedCragDetail?.walls}
              visible={
                !!browsingCrag &&
                !!focusedCragDetail &&
                focusedCragDetail.id === browsingCrag.crag_id
              }
            />

            {mode.kind === 'area' && (
              <RoutePinCluster
                pins={viewportPins.pins}
                styleReady={styleReady}
                onWallPress={onWallPinPress}
                onClusterPress={onClusterBubblePress}
              />
            )}

            {/* List mode: MapPinCluster (cherry-picked saved items) */}
            {mode.kind === 'list' && (
              <MapPinCluster
                pins={listData.pins}
                styleReady={styleLoaded}
                onPinPress={onOutdoorPinPress}
              />
            )}

            {/* Area mode: approach trail overlay (dashed earth-tone line).
                BR Track D Day 7 — switched from Region.trail_geojson
                (Track A legacy) to Crag.trail_geojson per PLAN §9.1.
                Only renders when a Wall is focused (so we know which
                Crag's trail to show); without focus, no trail. List
                mode skips entirely — a list may span multiple crags. */}
            {mode.kind === 'area' && styleLoaded && (() => {
              // BS Track B (2026-06-06) — dev-only fallback: when real
              // trail data is missing (prod ~100% null until OSM
              // Overpass backfill runs), inject a fixture trail
              // generated around the focused crag's lat/lng. Use
              // focusedWall's lat/lng as the anchor since BE's
              // CragDetailOut may return null lat/lng (column-level
              // null in prod) while focusedWall always has it (it's
              // populated by the pin tap context). Toggles 'osm' vs
              // 'user' by crag name length parity. Strict __DEV__
              // guard → prod never reaches fixture path.
              const devFallback =
                __DEV__ && !focusedCragDetail?.trail_geojson && focusedWall
                  ? getDevTrailFallback({
                      name: focusedCragDetail?.name ?? focusedWall.crag_name,
                      lat: focusedCragDetail?.lat ?? focusedWall.lat,
                      lng: focusedCragDetail?.lng ?? focusedWall.lng,
                    })
                  : null;
              return (
                <TrailLayer
                  trailGeoJSON={
                    focusedCragDetail?.trail_geojson ?? devFallback?.geojson ?? null
                  }
                  trailSource={
                    focusedCragDetail?.trail_source ?? devFallback?.source ?? null
                  }
                />
              );
            })()}

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
        {mode.kind === 'explore' && !initialGymsCenterDone && !gymsError ? (
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
        initialDetentIndex={initialMode.kind === 'explore' ? DETENT_MEDIUM : DETENT_COLLAPSED}
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
        {mode.kind === 'explore' ? (
          <View style={[styles.gymsSheetContent, { paddingBottom: getMapSheetBottomInset(insets) }]}>
            <GymsSavedSpotsRow
              onSelectArea={onSelectAreaFromList}
              onSelectArea4={(spot) => {
                // CA Phase 4b — Area-typed saved spot tap → unified sheet.
                if (mode.kind !== 'explore') return;
                presentArea({
                  id: spot.target_id,
                  name: spot.target_name,
                  display_kind: 'area',
                });
              }}
              onSelectCrag={(spot) => {
                if (mode.kind !== 'explore') return;
                presentArea({
                  id: spot.target_id,
                  name: spot.target_name,
                  display_kind: 'crag',
                  lat: spot.lat ?? null,
                  lng: spot.lng ?? null,
                });
              }}
              onSelectRoute={(spot) => {
                router.push({
                  pathname: '/outdoor/outdoor-route-detail' as any,
                  params: { id: spot.target_id },
                });
              }}
              onSelectGym={(gymId, gymName) => {
                router.push({
                  pathname: '/gym-community' as any,
                  params: { gymId, gymName },
                });
              }}
            />
            <View style={styles.gymsListSectionHeader}>
              <Text style={styles.gymsListSectionTitle}>
                {gymsQuery.trim()
                  ? tr('搜索结果', 'Search Results')
                  : tr('附近', 'Nearby')}
              </Text>
            </View>
            <GymList
              gyms={filteredGyms}
              areas={filteredAreas}
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
            {/* BR Track D Day 6 — cross-level outdoor search appended
                below the GymList when there's a query. Surfaces routes
                / walls / crags / areas / regions that match the same
                text the user typed for gym search. */}
            {gymsQuery.trim() ? (
              <>
                <View style={styles.gymsListSectionHeader}>
                  <Text style={styles.gymsListSectionTitle}>
                    {tr('户外搜索', 'Outdoor Results')}
                  </Text>
                </View>
                <MapSearchResultsList
                  query={gymsQuery}
                  onPressHit={handleSearchHit}
                />
              </>
            ) : null}
          </View>
        ) : (
          /* BR Track D Day 2 — RoutesListSheet extracted to own component.
             MapScreenMapbox keeps ownership of data + refs + mode state;
             RoutesListSheet only handles the JSX. */
          <RoutesListSheet
            mode={
              mode.kind === 'list'
                ? ({ kind: 'list', listDetail: listData.listDetail } as RoutesListSheetMode)
                : ({
                    kind: 'area',
                    // PLAN §3.2 — when a Wall is focused, the small
                    // subtitle row shows the Crag (from the wall context)
                    // and the large title row shows the Wall name. When no
                    // wall is focused, fall back to the Region name (the
                    // legacy single-row header behavior).
                    areaName: focusedWall?.crag_name ?? areaData.area?.name ?? mode.areaName,
                    sheetTitle: focusedWall ? null : sheetTitle,
                  } as RoutesListSheetMode)
            }
            scrollRef={sheetScrollRef}
            itemOffsets={itemOffsetsRef}
            insets={insets}
            tr={tr}
            loading={
              loadingSheet ||
              (mode.kind === 'area' && areaData.loading) ||
              (mode.kind === 'list' && listData.loading)
            }
            searchResults={areaSearchResults}
            walls={filteredWalls}
            highlightedRouteId={highlightedRouteId}
            focusedItemId={focusedItemId}
            wallName={focusedWall?.wall_name}
            searchExpanded={searchExpanded}
            onPressSearch={openAreaSearch}
            onPressCommunity={navigateToCommunity}
            onPressHamburger={() => cragMenuSheetRef.current?.present()}
            onPressTitle={openCragOrAreaInfo}
            onPressRoute={navigateToRoute}
            // BR Track D Day 6 — FilterChipsBar mounts only in area mode
            // (list mode shows pre-selected saved routes, no chip filter).
            // BU 2026-06-07 — hidden when browsingCrag is active. In crag-
            // browse sub-state the wall list itself surfaces per-wall
            // discipline breakdown (X boulder · Y sport · Z trad), making
            // the region-level filter chips redundant + visually cluttering.
            filterChipsSlot={
              mode.kind === 'area' && !browsingCrag ? <FilterChipsBar /> : undefined
            }
            // BS-FU-A — crag-browse sub-state. Active when user tapped a
            // tier-1 Crag pin (no focusedWall, no list mode). Renders mini
            // snapshot + walls list sorted by route_count desc.
            browsingCrag={browsingCragSummary}
            browsingCragWalls={browsingCragWalls}
            onPressBrowseWall={onPressBrowseWall}
          />
        )}
      </TrueSheet>

      {/* Detail sheet — explore mode POI card (gym or area). */}
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

      {/* CA Phase 4b — unified outdoor area info sheet. Replaces
          RegionInfoSheet / CragInfoSheet / AreaInfoSheet trio. The sheet
          derives layout from the area's display_kind + has_subareas/
          has_routes flags (plan v8 §Phase 4 ordering table). */}
      <OutdoorAreaInfoSheet
        ref={outdoorAreaSheetRef}
        onPresented={() => setAreaInfoOpen(true)}
        onDismissed={() => setAreaInfoOpen(false)}
        onRouteTap={(r) => navigateToRoute(r.id)}
      />
      {/* Crag menu sheet (stacked) — spawned from the sheet-header
          hamburger tap. Hosts Crag header card + climb-type segment +
          Crag Tools + Browse Up + My Tools + Share. Crag-scoped, so the
          mount is gated on `focusedWall` — the user reaches a Crag only
          via a Wall pin tap (PLAN §3.5). */}
      {mode.kind === 'area' && focusedWall ? (
        <CragMenuSheet
          ref={cragMenuSheetRef}
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
            // wall_count: at least 1 (the focused wall); the BE CragDetail
            // load inside CragInfoSheet hydrates the precise count for
            // any downstream stats. PLAN §3.5 is fine with a per-tap seed.
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

const createStyles = (colors: ReturnType<typeof useThemeColors>) =>
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
    // BK: matches GymsSavedSpotsRow's paddingHorizontal:16 so the
    // "Nearby" / "Search Results" title aligns with both the saved
    // spots strip header above AND the gym list rows below (which
    // also use paddingHorizontal:16 in GymList.listCardContent).
    gymsListSectionHeader: {
      paddingHorizontal: 16,
      paddingTop: 4,
      paddingBottom: 6,
    },
    gymsListSectionTitle: {
      fontFamily: theme.fonts.bold,
      fontSize: 15,
      color: colors.textPrimary,
      letterSpacing: -0.2,
    },
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
    // Title slot: flex:1 in the middle of headerRow so it sits in the
    // actual available space between the asymmetric left pill (88pt) and
    // right hamburger (44pt). The previous absolute-positioned layout
    // assumed left:0 / right:0 with center alignment ≈ sheet midline,
    // but toolbars are asymmetric (88 vs 44), so screen center ≠ middle
    // of available space → long area names crashed into the left pill.
    headerTitleFlex: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: 0,  // RN: required so flex child lets Text truncate
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
