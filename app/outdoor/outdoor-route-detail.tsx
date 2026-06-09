// app/outdoor/outdoor-route-detail.tsx
// Layer 3: Outdoor route detail — photo flush-to-top + Send/Attempt 2-button flow
// + GradeSuggestionCard (replaces plain stats).

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Dimensions,
  FlatList, TouchableOpacity, Pressable, ActivityIndicator,
  Alert, Share, ActionSheetIOS, Linking, Platform,
} from 'react-native';
import { HEADER_TRANSPARENT } from "@/lib/nativeHeaderOptions";
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import MapboxGL from '@rnmapbox/maps';
import { Stack, useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { HeaderButton } from '../../src/components/ui/HeaderButton';
import { useThemeColors } from '../../src/lib/useThemeColors';
import { useSettings } from '../../src/contexts/SettingsContext';
import { useUserStore } from '../../src/store/useUserStore';
import { theme } from '../../src/lib/theme';
import { outdoorApi } from '../../src/features/outdoor/api';
import type { OutdoorRoute, RouteAscent, PhotoItem } from '../../src/features/outdoor/types';
import OutdoorSendSheet, { type OutdoorSendDraft } from '../../src/features/outdoor/sendSheet/OutdoorSendSheet';
// CA Phase 4b — unified outdoor area sheet replaces RegionInfoSheet +
// AreaInfoSheet + CragInfoSheet trio. One mount serves region/area/crag.
import OutdoorAreaInfoSheet, {
  type OutdoorAreaInfoSheetHandle,
  type AreaSeedInput,
  areaListItemToSeed,
} from '../../src/features/mapscreen/components/OutdoorAreaInfoSheet';
import GradeSuggestionCard, { type SendLog } from '../../src/components/shared/GradeSuggestionCard';
import { RouteTopoCard } from '../../src/features/outdoor/components/RouteTopoCard';
import { RouteDescriptionCard } from '../../src/features/outdoor/components/RouteDescriptionCard';
import AddToListSheet from '../../src/features/outdoor/components/AddToListSheet';
import useBetaShareHandoffStore from '../../src/store/useBetaShareHandoffStore';
import { pickMediaFromLibrary } from '../../src/lib/mediaPicker';
import { consumePendingMedia } from '../../src/features/community/pendingMedia';
import type { PickedMediaItem } from '../../src/features/community/types';
import {
  uploadSingleFileToR2,
  toFileUri,
} from '../../src/features/community/api';
import { compressVideo } from '../../src/lib/videoCompression';
import { compressImage } from '../../src/lib/imageCompression';
import {
  startUpload,
  updateUpload,
  finishUpload,
} from '../../src/lib/uploadActivityBridge';
import { betaApi, type BetaOut } from '../../src/features/outdoor/betaApi';
import {
  enqueueRouteSendLog,
  enqueueRouteAttemptLog,
  flushLogsOutboxNow,
} from '../../src/features/journal/sync/enqueueRouteSendLog';
import { trackSessionBeta } from '../../src/features/journal/sync/sessionBetaTracker';
import useLogsStore from '../../src/store/useLogsStore';
import type { LogMedia } from '../../src/features/journal/loglist/types';

const SCREEN_W = Dimensions.get('window').width;
const PHOTO_H = SCREEN_W * 0.82;

// B2 #2: greyed Send button background when current user already sent this
// route. Mid-grey so the white text + checkmark icon stay readable in both
// light and dark modes (theme-agnostic by design — disabled state, not
// brand-colored). The checkmark itself stays green to celebrate completion.
const SENDED_BG = '#6B7280';
const SENDED_TICK = '#34D399'; // emerald-400 — readable on both light & dark grey

// Grade option list — used by OutdoorSendSheet's suggest-a-grade stepper.
const YDS_GRADES = [
  '5.5', '5.6', '5.7', '5.8', '5.9',
  '5.10a', '5.10b', '5.10c', '5.10d',
  '5.11a', '5.11b', '5.11c', '5.11d',
  '5.12a', '5.12b', '5.12c', '5.12d',
  '5.13a', '5.13b', '5.13c', '5.13d',
  '5.14a', '5.14b', '5.14c', '5.14d',
  '5.15a', '5.15b', '5.15c',
];

const V_GRADES = ['VB', 'V0', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6', 'V7', 'V8', 'V9', 'V10', 'V11', 'V12', 'V13', 'V14', 'V15', 'V16'];

function gradeOptionsFor(systemHint?: string, originalGrade?: string): string[] {
  if (systemHint === 'vscale' || (originalGrade && originalGrade.toUpperCase().startsWith('V'))) {
    return V_GRADES;
  }
  return YDS_GRADES;
}

export default function OutdoorRouteDetailPage() {
  const colors = useThemeColors();
  const { tr } = useSettings();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [route, setRoute] = useState<OutdoorRoute | null>(null);
  const [ascents, setAscents] = useState<RouteAscent[]>([]);
  // Betas feed the hero carousel — see `carouselPhotos` below. Discarding a
  // session deletes the user's own betas backend-side; on the next focus
  // refetch they drop out of the carousel automatically.
  const [betas, setBetas] = useState<BetaOut[]>([]);
  const [loading, setLoading] = useState(true);
  const currentUserId = useUserStore((s) => s.user?.id);
  // B2 #2: greyed Send button when current user already has a non-attempt
  // ascent on this route. Re-evaluates whenever ascents refetch.
  const userHasSent = useMemo(
    () =>
      !!currentUserId &&
      ascents.some((a) => a.user_id === currentUserId && a.result !== 'attempt'),
    [currentUserId, ascents],
  );

  // Local attempt counter (optimistic UI — backend sync is fire-and-forget)
  const [localAttempts, setLocalAttempts] = useState(0);

  // Send sheet
  const [sendSheetOpen, setSendSheetOpen] = useState(false);
  // Add-to-list sheet
  const [addToListOpen, setAddToListOpen] = useState(false);

  // CA Phase 4b — unified OutdoorAreaInfoSheet replaces the 3 legacy
  // breadcrumb sheets (Region/Area/Crag). One ref, one mount; the seed's
  // display_kind drives section ordering inside the sheet.
  const outdoorAreaSheetRef = useRef<OutdoorAreaInfoSheetHandle>(null);
  const presentArea = useCallback((seed: AreaSeedInput) => {
    void outdoorAreaSheetRef.current?.present(seed);
  }, []);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      outdoorApi.getRoute(id),
      outdoorApi.getAscents(id),
      betaApi.listForRoute(id).catch(() => [] as BetaOut[]),
    ]).then(([r, a, b]) => {
      if (r) setRoute(r);
      setAscents(a ?? []);
      setBetas(b ?? []);
      setLoading(false);
    });
  }, [id]);

  // Navigate to the route's beta list (viewer page reached from the
  // "View Beta" overlay pill on the cover photo).
  const openBetaList = useCallback(() => {
    if (!route) return;
    router.push(
      `/outdoor/route-beta?routeId=${route.id}&routeName=${encodeURIComponent(
        route.name,
      )}` as any,
    );
  }, [router, route]);

  // Build photo carousel (topo is rendered separately by RouteTopoCard).
  // Beta thumbnails (newest first) lead, then the route's official photos —
  // user-uploaded covers represent the route just as well, and lead so a
  // freshly-shared beta becomes the hero immediately. When the session is
  // discarded the betas are deleted backend-side; the focus refetch below
  // drops them from the carousel without any manual cleanup here.
  const carouselPhotos = useMemo((): PhotoItem[] => {
    if (!route) return [];
    const betaPhotos: PhotoItem[] = [...betas]
      .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))
      .filter((b) => !!b.thumbnail_url)
      .map((b) => ({ url: b.thumbnail_url as string }));
    const routePhotos: PhotoItem[] = (route.photos ?? []).map((p) => ({
      url: p.url,
      caption: p.caption,
    }));
    return [...betaPhotos, ...routePhotos];
  }, [route, betas]);

  // Climber rows for GradeSuggestionCard. avgStars comes from `route.stars`
  // (backend aggregate) as the single source of truth — per-log stars
  // aren't merged here. Window D1_D2_E2 — `grade_text` + `feel` echoed
  // back by /ascents power the histogram + majority-feel pill.
  const sendLogs: SendLog[] = useMemo(() => {
    return ascents
      .filter((a) => a.result !== 'attempt')
      .map((a) => ({
        user_id: a.user_id,
        username: a.username,
        grade_text: a.grade_text ?? null,
        feel: (a.feel ?? null) as SendLog['feel'],
      }));
  }, [ascents]);

  // BR Track D Day 7 — shared Crag-info presenter. Crag breadcrumb tap
  // and Wall breadcrumb tap both end here (Wall has no standalone sheet;
  // PLAN §5 explicit defer of wall-focused RoutesListSheet to
  // BR-Track-D-FU-wall-search-deep-link).
  const presentCragSheet = useCallback(() => {
    if (!route?.crag_id) return;
    presentArea({
      id: route.crag_id,
      name: route.crag_name ?? '',
      display_kind: 'crag',
      parent_name_hint: route.area_name ?? null,
    });
  }, [presentArea, route?.crag_id, route?.crag_name, route?.area_name]);

  // Attempt: +1 locally, persist to backend (B2 first-time wiring), haptic.
  // The auto-startSession path inside enqueueRouteAttemptLog opens an outdoor
  // session if none is active — hence "tap Attempt" alone now starts a session.
  const handleAttempt = useCallback(async () => {
    setLocalAttempts((n) => n + 1);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

    if (!route) return;

    try {
      await enqueueRouteAttemptLog({
        routeKind: 'outdoor',
        routeId: route.id,
        routeName: route.name,
        routeStyle: route.style,
        routeGrade: route.grade_text,
        // Prefer crag → sector → wall → 'Outdoor'. Crag is the right grain
        // for "where am I climbing today" — a day in Little Cottonwood
        // can span South Face / North Face but stays one crag.
        sessionGymName:
          route.crag_name ||
          route.area_name ||
          route.region_name ||
          route.wall_name ||
          'Outdoor',
        sessionLocationType: 'outdoor',
      });
      await flushLogsOutboxNow();
    } catch (e) {
      if (__DEV__) console.warn('[outdoor attempt] enqueue failed:', e);
    }
  }, [route]);

  const handleSend = useCallback(() => setSendSheetOpen(true), []);

  const handleShare = useCallback(async () => {
    if (!route) return;
    const url = `climmate://outdoor/route/${route.id}`;
    try {
      await Share.share({
        message: tr(
          `在 climMate 看看这条路线:${route.name} (${route.grade_text}) ${url}`,
          `Check out this route on climMate: ${route.name} (${route.grade_text}) ${url}`
        ),
        url,
      });
    } catch {
      // user cancelled or share unavailable
    }
  }, [route, tr]);

  const handleReport = useCallback(() => {
    Alert.alert(
      tr("举报路线", "Report Route"),
      tr("感谢举报,我们会尽快审核。", "Thanks — we'll review this route shortly."),
    );
  }, [tr]);

  // Beta video stash. Declared here (before onSendDone) so its closure
  // sees the latest value when the user submits the send-sheet.
  const [pendingBetaVideo, setPendingBetaVideo] =
    useState<PickedMediaItem | null>(null);

  // BetaShareSheet migrated to formSheet route — sheet-container-audit A1.
  const setPendingBetaShareVideo = useBetaShareHandoffStore((s) => s.setPendingVideo);

  // Flag: when the user navigates away to trim/cover the send sheet, we want
  // to re-present it on return regardless of whether they finished or backed
  // out. Consumed by the useFocusEffect below.
  const awaitingBetaTrimReturn = useRef(false);

  // Picks a single video via system PHPicker, enforces the 90s cap, then
  // dispatches to either the send-integrated flow ('send' → push to
  // video-trimmer → cover-picker → re-open OutdoorSendSheet with beta
  // attached on return) or the standalone share flow ('direct' → push
  // outdoor-beta-share formSheet).
  const pickAndDispatchBeta = useCallback(
    async (flow: 'send' | 'direct') => {
      if (!route) return;
      const items = await pickMediaFromLibrary({
        maxSelect: 1,
        mediaType: 'videos',
      });
      const videoItem = items.find((m) => m.mediaType === 'video') ?? null;
      if (!videoItem) return;
      if (videoItem.duration && videoItem.duration > 90) {
        Alert.alert(
          tr('视频过长', 'Video too long'),
          tr(
            'Beta 视频请保持在 90 秒以内',
            'Keep beta videos under 90 seconds.',
          ),
        );
        return;
      }
      setSendSheetOpen(false);
      if (flow === 'direct') {
        setPendingBetaShareVideo(videoItem);
        requestAnimationFrame(() => {
          router.push(`/outdoor-beta-share?routeId=${encodeURIComponent(route.id)}&routeKind=outdoor`);
        });
      } else {
        // Route through trim → cover-picker. Cover-picker writes the final
        // PickedMediaItem (with coverUri) into pendingMedia; useFocusEffect
        // below consumes it on return and re-presents the send sheet.
        awaitingBetaTrimReturn.current = true;
        requestAnimationFrame(() => {
          router.push({
            pathname: '/community/video-trimmer',
            params: {
              videoUri: videoItem.uri,
              duration: String(videoItem.duration || 0),
              id: videoItem.id,
              width: String(videoItem.width ?? 0),
              height: String(videoItem.height ?? 0),
              source: 'outdoor-route-beta',
            },
          });
        });
      }
    },
    [route, tr, router, setPendingBetaShareVideo],
  );

  // Trim/cover-picker return — consume the staged video (if any) and
  // re-present the send sheet so the user lands back where they were.
  useFocusEffect(
    useCallback(() => {
      if (!awaitingBetaTrimReturn.current) return;
      awaitingBetaTrimReturn.current = false;
      const pending = consumePendingMedia();
      const videoItem = pending?.find((m) => m.mediaType === 'video') ?? null;
      if (videoItem) setPendingBetaVideo(videoItem);
      requestAnimationFrame(() => setSendSheetOpen(true));
    }, []),
  );

  // Refetch betas whenever the screen regains focus. Two cases drive this:
  //   1. User shared a beta on the standalone /outdoor-beta-share screen and
  //      bounced back — pick up the new thumbnail in the hero carousel.
  //   2. User discarded a session that owned betas — those rows are gone
  //      backend-side and need to drop out of the carousel here too.
  // Skips the initial focus (the main useEffect already fetched).
  const skipFirstBetaFocus = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (skipFirstBetaFocus.current) {
        skipFirstBetaFocus.current = false;
        return;
      }
      if (!id) return;
      betaApi
        .listForRoute(id)
        .then((b) => setBetas(b ?? []))
        .catch(() => {});
    }, [id]),
  );

  const onSendDone = useCallback(async (draft: OutdoorSendDraft) => {
    if (!id || !route) return;

    // Surface the local cover as the log's media so the daily-summary
    // thumbnail renders immediately. The persistent R2 thumbnail_url lives
    // on the Beta record (not the log) — this entry is local-only display.
    const video = pendingBetaVideo;
    const localMedia: LogMedia[] | undefined = video
      ? [{
          id: video.id,
          type: 'video',
          uri: video.uri,
          coverUri: video.coverUri,
        }]
      : undefined;

    // Dismiss FIRST. TrueSheet sat on top of the in-app UploadToastOverlay
    // (and iOS suppresses an app's own Live Activity in foreground), so
    // holding the sheet open during the ~10s upload hid all progress feedback.
    // Sync calls below run fire-and-forget — toast/LA reads from
    // useUploadProgressStore via the bridge.
    setPendingBetaVideo(null);
    setSendSheetOpen(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

    if (!video) {
      const summary = `${draft.style} · ${draft.attempts} att · ${draft.feel}`;
      Alert.alert(tr('记录成功', 'Logged!'), summary);
    }

    // ClimbLog + rating sync — fire-and-forget. enqueue's outbox layer
    // already provides retry semantics; the user's interaction completes
    // the moment the sheet dismisses.
    void (async () => {
      try {
        await enqueueRouteSendLog({
          routeKind: 'outdoor',
          routeId: route.id,
          routeName: route.name,
          routeStyle: route.style,
          draft,
          media: localMedia,
          sessionGymName:
            route.crag_name ||
            route.area_name ||
            route.region_name ||
            route.wall_name ||
            'Outdoor',
          sessionLocationType: 'outdoor',
        });
        flushLogsOutboxNow()
          .then(() => outdoorApi.getAscents(id))
          .then((fresh) => setAscents(fresh ?? []))
          .catch(() => {
            // Non-fatal — Climbers list will refresh on next mount.
          });
      } catch (e) {
        console.warn('[outdoor send] enqueue log failed:', e);
      }

      try {
        await outdoorApi.rateRoute(id, { stars: draft.stars, comment: draft.comment || undefined });
        const updatedRoute = await outdoorApi.getRoute(id);
        if (updatedRoute) setRoute(updatedRoute);
      } catch {
        // Silent — outbox would retry in real impl
      }
    })();

    if (!video) return;

    // Capture sessionKey BEFORE the async upload — enqueueRouteSendLog
    // guarantees an active session by now, and we want the tracker tied
    // to that session even if it ends/discards while the upload is in
    // flight. Empty string is fine (tracker is a no-op on empty key).
    const activeSessionAtSend = useLogsStore.getState().activeSession;
    const sessionKey = activeSessionAtSend
      ? String(activeSessionAtSend.startTime)
      : '';

    // Beta upload — async, no await. Progress + completion shown via toast.
    void (async () => {
      const uploadId = startUpload(tr('上传 Beta…', 'Uploading beta…'), 'la');
      try {
        updateUpload(uploadId, 0, 'compressing');
        const compressedUri = await compressVideo(video.uri,
          (p) => updateUpload(uploadId, p * 0.6, 'compressing'));
        updateUpload(uploadId, 0.6, 'uploading');

        let thumbnailUrl: string | undefined;
        const localThumbUri =
          video.coverUri ??
          (await (async () => {
            try {
              const VT = await import('expo-video-thumbnails');
              const { uri } = await VT.getThumbnailAsync(compressedUri, {
                time: 1000,
                quality: 0.7,
              });
              return uri;
            } catch {
              return undefined;
            }
          })());

        if (localThumbUri) {
          try {
            const compressedThumb = await compressImage(localThumbUri, 'thumbnail');
            const thumbFileUri = await toFileUri(compressedThumb);
            thumbnailUrl = await uploadSingleFileToR2(
              thumbFileUri,
              'image/jpeg',
              'route-beta',
            );
          } catch {
            // Non-fatal — backend accepts null thumbnail_url.
          }
        }

        updateUpload(uploadId, 0.85, 'uploading');
        const mediaUrl = await uploadSingleFileToR2(
          compressedUri,
          'video/mp4',
          'route-beta',
        );
        updateUpload(uploadId, 0.95);

        const created = await betaApi.createForRoute(id, {
          media_url: mediaUrl,
          thumbnail_url: thumbnailUrl,
          description: draft.comment?.trim() || null,
        });

        // Track for discard cleanup. If the session ended/discarded while we
        // were uploading, discard already ran without us — best-effort delete
        // here mirrors that intent.
        if (created?.id) {
          if (sessionKey) {
            trackSessionBeta(sessionKey, created.id).catch(() => {});
          }
          const stillActive = useLogsStore.getState().activeSession;
          const stillSameSession =
            stillActive && String(stillActive.startTime) === sessionKey;
          if (!stillSameSession && sessionKey) {
            betaApi.deleteOwn(created.id).catch(() => {});
          } else {
            // Optimistic add so the hero carousel updates without waiting
            // for the next focus refetch. The defensive delete branch
            // above intentionally skips this — no point promoting a beta
            // we're about to tear down. Dedupe by id in case a focus
            // refetch raced ahead and already inserted this beta.
            setBetas((prev) => [
              created,
              ...prev.filter((b) => b.id !== created.id),
            ]);
          }
        }

        finishUpload(uploadId, 'success');
      } catch (err: any) {
        const msg = err?.detail || err?.message || tr('Beta 上传失败', 'Beta upload failed');
        finishUpload(uploadId, 'error', msg);
      }
    })();
  }, [id, route, tr, pendingBetaVideo]);

  const handleShareBeta = useCallback(
    () => pickAndDispatchBeta('send'),
    [pickAndDispatchBeta],
  );

  const handleDirectShareBeta = useCallback(
    () => pickAndDispatchBeta('direct'),
    [pickAndDispatchBeta],
  );

  const handleRemoveBeta = useCallback(() => {
    setPendingBetaVideo(null);
  }, []);

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ headerTitle: '' }} />
        <View style={[styles.container, styles.centered]}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      </>
    );
  }

  if (!route) {
    return (
      <>
        <Stack.Screen options={{ headerTitle: '' }} />
        <View style={[styles.container, styles.centered]}>
          <Text style={styles.emptyText}>{tr('路线未找到', 'Route not found')}</Text>
        </View>
      </>
    );
  }

  const gradeOpts = gradeOptionsFor(route.grade_system, route.grade_text);
  const originalGradeIndex = Math.max(0, gradeOpts.indexOf(route.grade_text));

  return (
    <>
      <Stack.Screen
        options={{
          // Route name is already the H1 inside the body, so the nav bar
          // title would be redundant. Leave empty so the transparent
          // header reads as pure chrome (just the back chevron + toolbar).
          headerTitle: '',
          headerTransparent: HEADER_TRANSPARENT,
          // Plain icon — iOS 26 automatically wraps transparent-header nav
          // items in its own liquid-glass pill. Using variant='glass'
          // here stacks our own pill inside Apple's → visible "pill inside
          // pill" double layer. Plain lets Apple's pill be the only glass.
          headerLeft: () => (
            <HeaderButton
              icon="chevron.backward"
              variant="plain"
              onPress={() => router.back()}
            />
          ),
        }}
      />
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button
          icon="calendar.day.timeline.leading"
          onPress={() =>
            router.push({ pathname: "/daily-summary", params: { date: "today" } } as any)
          }
        />
        <Stack.Toolbar.Menu icon="ellipsis">
          <Stack.Toolbar.MenuAction icon="list.bullet" onPress={() => setAddToListOpen(true)}>
            {tr("添加到清单", "Add to List")}
          </Stack.Toolbar.MenuAction>
          <Stack.Toolbar.MenuAction icon="square.and.arrow.up" onPress={handleShare}>
            {tr("分享", "Share")}
          </Stack.Toolbar.MenuAction>
          <Stack.Toolbar.MenuAction icon="flag" onPress={handleReport}>
            {tr("举报", "Report")}
          </Stack.Toolbar.MenuAction>
        </Stack.Toolbar.Menu>
      </Stack.Toolbar>
      <ScrollView
        style={styles.container}
        contentInsetAdjustmentBehavior="never"
        showsVerticalScrollIndicator={false}
      >
        {/* Photo carousel — flush to top. The entire cover is tappable;
            tapping navigates to the route's beta viewer. We wrap each
            FlatList item in a Pressable (not the outer View) so horizontal
            swipe gestures still drive carousel paging — Pressable fires
            only on clean taps. The "View Beta" pill remains as a visual
            affordance hinting at the tap target. */}
        <View style={styles.photoWrap}>
          {carouselPhotos.length > 0 ? (
            <FlatList
              horizontal
              pagingEnabled
              data={carouselPhotos}
              keyExtractor={(_, i) => `photo-${i}`}
              showsHorizontalScrollIndicator={false}
              renderItem={({ item }) => (
                <Pressable onPress={openBetaList}>
                  <Image source={{ uri: item.url }} style={styles.photo} contentFit="cover" />
                </Pressable>
              )}
            />
          ) : (
            <Pressable onPress={openBetaList} style={[styles.photo, styles.photoPlaceholder]}>
              <Ionicons name="image-outline" size={40} color={colors.textTertiary} />
            </Pressable>
          )}
          <View style={styles.viewBetaPill} pointerEvents="none">
            <Ionicons name="videocam" size={14} color="#fff" />
            <Text style={styles.viewBetaText}>{tr('查看 Beta', 'View Beta')}</Text>
          </View>
        </View>

        <View style={styles.body}>
          {/* BR Track D Day 6/7 — breadcrumb (PLAN §5). Day 6 shipped
              the display; Day 7 wired per-segment tap once BE
              `RouteOut` started returning region_id / area_id /
              crag_id alongside the legacy *_name fields. wall_id is
              already on the base row. Wall tap → CragInfoSheet for
              the parent Crag (PLAN §5 explicitly defers deep-link to
              focused RoutesListSheet — BR-Track-D-FU). */}
          <RouteBreadcrumb
            route={route}
            colors={colors}
            onPressRegion={() => {
              if (!route.region_id) return;
              presentArea({
                id: route.region_id,
                name: route.region_name ?? '',
                display_kind: 'region',
              });
            }}
            onPressArea={() => {
              if (!route.area_id) return;
              presentArea({
                id: route.area_id,
                name: route.area_name ?? '',
                display_kind: 'area',
                parent_name_hint: route.region_name ?? null,
              });
            }}
            onPressCrag={presentCragSheet}
            // PLAN §5: Wall tap falls back to parent Crag's info sheet
            // until BR-Track-D-FU-wall-search-deep-link wires a real
            // wall-focused RoutesListSheet hand-off path.
            onPressWall={presentCragSheet}
          />

          {/* BV — full OpenBeta location_path. RouteBreadcrumb shows the
              ClimMate 4-level chain (Region → Area → Crag → Wall); this
              row surfaces the FULL OpenBeta chain including country +
              state + any squashed intermediate levels (n≥5 paths). Only
              renders when location_path has more entries than the
              breadcrumb (i.e. there's extra info worth showing). */}
          {Array.isArray(route.location_path) && route.location_path.length > 4 ? (
            <Text style={styles.locationPathText} numberOfLines={2}>
              {route.location_path
                .map((p) => p?.name)
                .filter(Boolean)
                .join(' › ')}
            </Text>
          ) : null}

          {/* Name + grade + stars */}
          <Text style={styles.routeName}>{route.name}</Text>
          <Text style={styles.routeInfo}>
            {route.grade_text} · {route.style}
            {route.length_m ? ` · ${route.length_m}m` : ''}
            {route.bolts ? ` · ${route.bolts} bolts` : ''}
            {route.pitches > 1 ? ` · ${route.pitches}p` : ''}
          </Text>
          {/* BV — alternate grade systems on a secondary row. Renders only
              when grades_all has at least one OTHER system filled (excluding
              the primary that's already in grade_text). Lets international
              users see their preferred system without a settings round-trip.
              French/UIAA/Ewbank/Font are the common alternates. */}
          {(() => {
            const all = route.grades_all;
            if (!all) return null;
            const primarySys = route.grade_system?.toLowerCase();
            const alts: string[] = [];
            const entries: Array<[string, string]> = [
              ['yds', '美'],
              ['french', '法'],
              ['ewbank', 'AU'],
              ['uiaa', 'UIAA'],
              ['vscale', 'V'],
              ['font', 'Font'],
            ];
            for (const [sys, label] of entries) {
              if (sys === primarySys) continue;
              const v = (all as any)[sys];
              if (v && String(v).trim()) alts.push(`${label} ${v}`);
            }
            if (alts.length === 0) return null;
            return (
              <Text style={styles.gradesAltText} numberOfLines={2}>
                {alts.join(' · ')}
              </Text>
            );
          })()}
          {route.first_ascent ? <Text style={styles.faText}>FA: {route.first_ascent}</Text> : null}
          {/* BV — safety grade badge. Only render the warnings (PG-13/R/X);
              G and PG are skipped since they're the default-safe norm and
              would noise every route. Colors mirror climbing-guidebook
              convention. */}
          {route.safety && ['PG-13', 'PG13', 'R', 'X'].includes(route.safety.toUpperCase()) ? (
            <View
              style={[
                styles.safetyBadge,
                {
                  backgroundColor:
                    route.safety.toUpperCase() === 'X'
                      ? '#B00020'
                      : route.safety.toUpperCase() === 'R'
                      ? '#D4541C'
                      : '#E8A317',
                },
              ]}
            >
              <Text style={styles.safetyBadgeText}>{route.safety}</Text>
            </View>
          ) : null}
          {route.stars != null && (
            <View style={styles.starsRow}>
              {Array.from({ length: 5 }).map((_, i) => (
                <Ionicons
                  key={i}
                  name={i < Math.round(route.stars!) ? 'star' : 'star-outline'}
                  size={14}
                  color="#FFD60A"
                />
              ))}
              <Text style={styles.starsText}>
                ({route.stars.toFixed(1)}) · {route.rating_count} {tr('评价', 'reviews')}
              </Text>
            </View>
          )}

          {/* Two-button row: Send (primary) + Attempt (secondary, counter) */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[
                styles.primaryBtn,
                {
                  backgroundColor: userHasSent ? SENDED_BG : colors.accent,
                },
              ]}
              onPress={userHasSent ? undefined : handleSend}
              disabled={userHasSent}
              activeOpacity={0.85}
            >
              <Ionicons
                name={userHasSent ? 'checkmark-circle' : 'checkmark-circle-outline'}
                size={18}
                color={userHasSent ? SENDED_TICK : '#FFFFFF'}
              />
              <Text style={styles.primaryBtnText}>
                {userHasSent ? tr('已完成', 'Sent') : tr('完成', 'Send')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.secondaryBtn, { backgroundColor: colors.pillBackground }]}
              onPress={handleAttempt}
              activeOpacity={0.85}
            >
              <Ionicons name="refresh-outline" size={18} color={colors.pillText} />
              <Text style={styles.secondaryBtnText}>
                {tr('尝试', 'Attempt')}
              </Text>
              {localAttempts > 0 && (
                <View style={styles.attemptBadge}>
                  <Text style={styles.attemptBadgeText}>+{localAttempts}</Text>
                </View>
              )}
            </TouchableOpacity>
            {/* Camera — launches the "pure share beta" flow: picker →
                BetaShareSheet (description + submit). Separate from the
                Send-integrated path which attaches a beta to a send log. */}
            <TouchableOpacity
              style={[styles.cameraBtn, { backgroundColor: colors.pillBackground }]}
              onPress={handleDirectShareBeta}
              activeOpacity={0.85}
              hitSlop={6}
            >
              <Ionicons name="videocam-outline" size={20} color={colors.pillText} />
            </TouchableOpacity>
          </View>

          <RouteTopoCard topoUrl={route.wall_topo_url} />

          {/* BR Track D Day 6 — mini-map + Navigate (PLAN §5). Only
              mounts when both lat + lng are present on the route detail.
              Routes without GPS (legacy imports) silently skip. */}
          {route.lat != null && route.lng != null ? (
            <RouteLocationCard
              lat={route.lat}
              lng={route.lng}
              routeName={route.name}
              colors={colors}
              tr={tr}
            />
          ) : null}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{tr('路线描述', 'Description')}</Text>
            <RouteDescriptionCard description={route.description} />
          </View>

          {/* BV — protection / gear notes. OpenBeta `content.protection`
              tells the climber what gear is needed (bolts spacing, cam
              sizes, etc). Only shown when non-empty; never renders an
              empty "No protection info" placeholder since lack of data is
              the norm for most routes. */}
          {route.protection && route.protection.trim() ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{tr('保护 / 装备', 'Protection')}</Text>
              <View style={styles.protectionCard}>
                <Text style={styles.protectionText}>{route.protection.trim()}</Text>
              </View>
            </View>
          ) : null}

          {/* GradeSuggestionCard — whole-card tap opens the climbers page */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{tr('攀登数据', 'Climber Data')}</Text>
            <GradeSuggestionCard
              logs={sendLogs}
              avgStars={route.stars ?? null}
              onPress={() =>
                router.push(`/outdoor/route-climbers?routeId=${route.id}` as any)
              }
            />
          </View>
        </View>
      </ScrollView>
      {/* Send sheet (Item 10) */}
      <OutdoorSendSheet
        visible={sendSheetOpen}
        routeName={route.name}
        originalGrade={route.grade_text}
        gradeOptions={gradeOpts}
        originalGradeIndex={originalGradeIndex}
        onClose={() => setSendSheetOpen(false)}
        onDone={onSendDone}
        onShareBeta={handleShareBeta}
        betaVideo={pendingBetaVideo}
        onRemoveBeta={handleRemoveBeta}
        tr={tr}
      />

      {/* Add to list */}
      <AddToListSheet
        visible={addToListOpen}
        onClose={() => setAddToListOpen(false)}
        routeId={route.id}
        routeName={route.name}
      />

      {/* CA Phase 4b — unified OutdoorAreaInfoSheet stacked on top of the
          route detail. Breadcrumb taps swap the seed (kind drives layout). */}
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

      {/* Pure share-beta flow now lives at app/outdoor-beta-share.tsx
          (sheet-container-audit A1). */}
    </>
  );
}

// ---- BR Track D Day 6/7 — Breadcrumb (tappable when ancestor IDs known) ----
// Shows the route's ancestry chain (Region › Area › Crag › Wall) at the
// top of the body. Each segment is a Pressable that fires the matching
// callback when the BE has returned the corresponding ancestor UUID
// (Day 7 added these to `RouteOut`). Legacy fixtures without IDs render
// as plain text (no press affordance, no underline).
function RouteBreadcrumb({
  route,
  colors,
  onPressRegion,
  onPressArea,
  onPressCrag,
  onPressWall,
}: {
  route: OutdoorRoute;
  colors: ReturnType<typeof useThemeColors>;
  onPressRegion: () => void;
  onPressArea: () => void;
  onPressCrag: () => void;
  onPressWall: () => void;
}) {
  const segments: { label: string; onPress: () => void; tappable: boolean }[] = [];
  if (route.region_name) {
    segments.push({
      label: route.region_name,
      onPress: onPressRegion,
      tappable: !!route.region_id,
    });
  }
  if (route.area_name) {
    segments.push({
      label: route.area_name,
      onPress: onPressArea,
      tappable: !!route.area_id,
    });
  }
  if (route.crag_name) {
    segments.push({
      label: route.crag_name,
      onPress: onPressCrag,
      tappable: !!route.crag_id,
    });
  }
  if (route.wall_name) {
    segments.push({
      label: route.wall_name,
      onPress: onPressWall,
      // wall_id is always present on OutdoorRoute (FK on the base row),
      // but Wall tap requires the parent crag_id to seed CragInfoSheet
      // — see breadcrumb caller. Hide affordance if crag_id missing.
      tappable: !!route.crag_id,
    });
  }
  if (segments.length === 0) return null;
  return (
    <View style={breadcrumbStyles.row}>
      {segments.map((seg, i) => {
        const SegmentWrap = seg.tappable ? Pressable : View;
        return (
          <View key={`${i}-${seg.label}`} style={breadcrumbStyles.segment}>
            <SegmentWrap onPress={seg.tappable ? seg.onPress : undefined} hitSlop={6}>
              <Text
                style={[
                  breadcrumbStyles.text,
                  { color: seg.tappable ? colors.accent : colors.textSecondary },
                ]}
                numberOfLines={1}
              >
                {seg.label}
              </Text>
            </SegmentWrap>
            {i < segments.length - 1 ? (
              <Ionicons
                name="chevron-forward"
                size={11}
                color={colors.textTertiary}
                style={breadcrumbStyles.chevron}
              />
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

const breadcrumbStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginBottom: 8,
  },
  segment: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  text: {
    fontFamily: theme.fonts.medium,
    fontSize: 12,
    letterSpacing: -0.1,
  },
  chevron: {
    marginHorizontal: 4,
  },
});

// ---- BR Track D Day 6 — Route location card (mini-map + Navigate) ----
// Embeds a non-interactive Mapbox view centered on the route + an
// ActionSheetIOS-driven Navigate pill. Pan/zoom/rotate all locked so
// the embedded view doesn't fight the parent ScrollView gestures.
function RouteLocationCard({
  lat,
  lng,
  routeName,
  colors,
  tr,
}: {
  lat: number;
  lng: number;
  routeName: string;
  colors: ReturnType<typeof useThemeColors>;
  tr: (zh: string, en: string) => string;
}) {
  const openNavigate = useCallback(() => {
    const label = encodeURIComponent(routeName);
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [
            tr('苹果地图', 'Apple Maps'),
            tr('Google 地图', 'Google Maps'),
            tr('取消', 'Cancel'),
          ],
          cancelButtonIndex: 2,
        },
        (i) => {
          if (i === 0) {
            Linking.openURL(`http://maps.apple.com/?daddr=${lat},${lng}&q=${label}`).catch(() => {});
          } else if (i === 1) {
            Linking.openURL(
              `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
            ).catch(() => {});
          }
        },
      );
    } else {
      Linking.openURL(
        `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
      ).catch(() => {});
    }
  }, [lat, lng, routeName, tr]);

  return (
    <View style={[locationCardStyles.card, { backgroundColor: colors.cardBackground }]}>
      <MapboxGL.MapView
        style={locationCardStyles.miniMap}
        styleURL={'mapbox://styles/mapbox/outdoors-v12'}
        // Lock all gestures so swipe/zoom never fight ScrollView.
        pitchEnabled={false}
        rotateEnabled={false}
        scrollEnabled={false}
        zoomEnabled={false}
        logoEnabled={false}
        attributionEnabled={false}
        scaleBarEnabled={false}
        compassEnabled={false}
      >
        <MapboxGL.Camera centerCoordinate={[lng, lat]} zoomLevel={14} animationMode="none" />
        <MapboxGL.PointAnnotation id="route-pin" coordinate={[lng, lat]}>
          <View style={[locationCardStyles.pin, { backgroundColor: colors.accent }]} />
        </MapboxGL.PointAnnotation>
      </MapboxGL.MapView>
      <TouchableOpacity
        onPress={openNavigate}
        activeOpacity={0.7}
        style={[locationCardStyles.navigateBtn, { backgroundColor: colors.accent }]}
      >
        <Ionicons name="navigate" size={16} color="#FFFFFF" />
        <Text style={locationCardStyles.navigateText}>{tr('导航', 'Directions')}</Text>
      </TouchableOpacity>
    </View>
  );
}

const locationCardStyles = StyleSheet.create({
  card: {
    marginTop: 16,
    borderRadius: theme.borderRadius.card,
    overflow: 'hidden',
  },
  miniMap: {
    width: '100%',
    height: 180,
  },
  pin: {
    // backgroundColor injected from theme.accent at the call site so the
    // pin tracks brand color across light/dark mode. White border is
    // intentional regardless of theme — it's the contrast ring against
    // the basemap (Mapbox outdoors-v12 in light, dark-v11 in dark).
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  navigateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  navigateText: {
    fontFamily: theme.fonts.bold,
    fontSize: 15,
    color: '#FFFFFF',
  },
});

const createStyles = (c: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    centered: { alignItems: 'center', justifyContent: 'center' },
    emptyText: { fontFamily: theme.fonts.regular, fontSize: 15, color: c.textSecondary },

    // Photo — flush to top, full width. photoWrap wraps the carousel +
    // View Beta overlay so the pill stays fixed against the cover area
    // even when the user pages the carousel.
    photoWrap: { position: 'relative' },
    photo: { width: SCREEN_W, height: PHOTO_H },
    photoPlaceholder: { backgroundColor: c.backgroundSecondary, alignItems: 'center', justifyContent: 'center' },
    viewBetaPill: {
      position: 'absolute',
      left: 12,
      bottom: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 14,
      backgroundColor: 'rgba(0,0,0,0.5)',
    },
    viewBetaText: {
      color: '#fff',
      fontFamily: theme.fonts.medium,
      fontSize: 12,
    },

    // Body
    body: { padding: theme.spacing.screenPadding },
    routeName: { fontFamily: theme.fonts.black, fontSize: 24, color: c.textPrimary, marginBottom: 4 },
    routeInfo: { fontFamily: theme.fonts.regular, fontSize: 14, color: c.textSecondary, marginBottom: 2 },
    // BV — secondary row showing alternate grade systems (yds/french/uiaa/etc).
    // Smaller + tertiary so it doesn't compete with the primary grade above.
    gradesAltText: {
      fontFamily: theme.fonts.regular,
      fontSize: 12,
      color: c.textTertiary,
      marginBottom: 4,
    },
    // BV — full OpenBeta location_path text row. Sits beneath the
    // RouteBreadcrumb; smaller + tertiary so it doesn't compete visually.
    locationPathText: {
      fontFamily: theme.fonts.regular,
      fontSize: 11,
      color: c.textTertiary,
      lineHeight: 16,
      marginTop: 4,
      marginBottom: 12,
    },
    // BV — Protection / gear card. Mirrors RouteDescriptionCard styling so
    // the two sections sit visually consistent.
    protectionCard: {
      backgroundColor: c.cardBackground,
      borderRadius: 16,
      padding: 16,
    },
    protectionText: {
      fontFamily: theme.fonts.regular,
      fontSize: 15,
      lineHeight: 22,
      color: c.textPrimary,
    },
    faText: { fontFamily: theme.fonts.regular, fontSize: 12, color: c.textTertiary, marginBottom: 4 },
    // BV — safety badge (PG-13 / R / X warnings only). Inline rounded pill
    // sized to the grade text. Background color set per-render based on
    // severity (see render site for the mapping).
    safetyBadge: {
      alignSelf: 'flex-start',
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
      marginBottom: 8,
    },
    safetyBadgeText: {
      fontFamily: theme.fonts.bold,
      fontSize: 11,
      color: '#FFFFFF',
      letterSpacing: 0.5,
    },
    starsRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginBottom: 20 },
    starsText: { fontFamily: theme.fonts.regular, fontSize: 12, color: c.textSecondary, marginLeft: 4 },

    // Actions — unified accent + dark pill palette
    actionRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
    primaryBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 14,
      borderRadius: theme.borderRadius.card,
    },
    primaryBtnText: { fontFamily: theme.fonts.black, fontSize: 15, color: '#FFFFFF' },
    secondaryBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 14,
      borderRadius: theme.borderRadius.card,
      position: 'relative',
    },
    secondaryBtnText: { fontFamily: theme.fonts.black, fontSize: 15, color: c.pillText },
    cameraBtn: {
      // Square, width-matched to button height so it reads as a small
      // icon action rather than competing with the full-width primary/
      // secondary pair next to it.
      width: 48,
      aspectRatio: 1,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: theme.borderRadius.card,
    },
    attemptBadge: {
      position: 'absolute',
      top: 6,
      right: 10,
      paddingHorizontal: 6,
      paddingVertical: 1,
      borderRadius: 999,
      backgroundColor: c.accent,
    },
    attemptBadgeText: {
      fontFamily: theme.fonts.bold,
      fontSize: 10,
      color: '#FFFFFF',
    },

    // Sections
    section: { marginTop: theme.spacing.sectionGap },
    sectionTitle: { fontFamily: theme.fonts.black, fontSize: 16, color: c.textPrimary, marginBottom: 10 },
  });
