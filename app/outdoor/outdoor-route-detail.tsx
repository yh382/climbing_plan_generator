// app/outdoor/outdoor-route-detail.tsx
// Layer 3: Outdoor route detail — photo flush-to-top + Send/Attempt 2-button flow
// + GradeSuggestionCard (replaces plain stats).

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Dimensions,
  FlatList, TouchableOpacity, Pressable, ActivityIndicator,
  Alert, Share,
} from 'react-native';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { HeaderButton } from '../../src/components/ui/HeaderButton';
import { useThemeColors } from '../../src/lib/useThemeColors';
import { useSettings } from '../../src/contexts/SettingsContext';
import { useUserStore } from '../../src/store/useUserStore';
import { theme } from '../../src/lib/theme';
import { outdoorApi } from '../../src/features/outdoor/api';
import type { OutdoorRoute, RouteAscent, PhotoItem } from '../../src/features/outdoor/types';
import OutdoorSendSheet, { type OutdoorSendDraft } from '../../src/features/outdoor/sendSheet/OutdoorSendSheet';
import GradeSuggestionCard, { type SendLog } from '../../src/components/shared/GradeSuggestionCard';
import { ScrollEdgeFallback } from '@/components/shared/ScrollEdgeFallback';
import { RouteTopoCard } from '../../src/features/outdoor/components/RouteTopoCard';
import { RouteDescriptionCard } from '../../src/features/outdoor/components/RouteDescriptionCard';
import AddToListSheet from '../../src/features/outdoor/components/AddToListSheet';
import BetaShareSheet, {
  type BetaShareSheetHandle,
} from '../../src/features/outdoor/components/BetaShareSheet';
import { pickMediaFromLibrary } from '../../src/lib/mediaPicker';
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
import { betaApi } from '../../src/features/outdoor/betaApi';
import {
  enqueueRouteSendLog,
  enqueueRouteAttemptLog,
  flushLogsOutboxNow,
} from '../../src/features/journal/sync/enqueueRouteSendLog';

const SCREEN_W = Dimensions.get('window').width;
const PHOTO_H = SCREEN_W * 0.82;

// B2 #2: greyed Send button background when current user already sent this
// route. Mid-grey so the white text + checkmark icon stay readable in both
// light and dark modes (theme-agnostic by design — disabled state, not
// brand-colored).
const SENDED_BG = '#6B7280';

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

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      outdoorApi.getRoute(id),
      outdoorApi.getAscents(id),
    ]).then(([r, a]) => {
      if (r) setRoute(r);
      setAscents(a ?? []);
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

  // Build photo carousel (topo is rendered separately by RouteTopoCard)
  const carouselPhotos = useMemo((): PhotoItem[] => {
    if (!route) return [];
    return (route.photos ?? []).map((p) => ({ url: p.url, caption: p.caption }));
  }, [route]);

  // Climber rows for GradeSuggestionCard. avgStars comes from `route.stars`
  // (backend aggregate) as the single source of truth — per-log stars aren't
  // merged here. INDOOR_A: histogram + feel were stripped from the card; only
  // user_id + username are needed for the climber-count footer.
  const sendLogs: SendLog[] = useMemo(() => {
    return ascents
      .filter((a) => a.result !== 'attempt')
      .map((a) => ({
        user_id: a.user_id,
        username: a.username,
      }) as SendLog);
  }, [ascents]);

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
        sessionGymName: route.wall_name || route.sector_name || 'Outdoor',
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

  const betaShareSheetRef = useRef<BetaShareSheetHandle | null>(null);

  // Picks a single video via system PHPicker, enforces the 90s cap, then
  // dispatches to either the send-integrated flow ('send' → re-open
  // OutdoorSendSheet with beta attached) or the standalone share flow
  // ('direct' → present BetaShareSheet).
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
        requestAnimationFrame(() => {
          betaShareSheetRef.current?.present(videoItem);
        });
      } else {
        setPendingBetaVideo(videoItem);
        requestAnimationFrame(() => setSendSheetOpen(true));
      }
    },
    [route, tr],
  );

  const onSendDone = useCallback(async (draft: OutdoorSendDraft) => {
    if (!id || !route) return;

    // 1. ClimbLog FIRST (local + outbox). Rating can be lost; the user's send
    //    record cannot. enqueue is fire-and-forget — outbox will retry.
    try {
      await enqueueRouteSendLog({
        routeKind: 'outdoor',
        routeId: route.id,
        routeName: route.name,
        routeStyle: route.style,
        draft,
        sessionGymName: route.wall_name || route.sector_name || 'Outdoor',
        sessionLocationType: 'outdoor',
      });
      // Push to backend immediately so the Climbers list updates within
      // the same interaction instead of waiting for the next Journal-tab
      // focus to flush. Silent on failure — the queued event retries.
      await flushLogsOutboxNow();
      try {
        const fresh = await outdoorApi.getAscents(id);
        setAscents(fresh ?? []);
      } catch {
        // Non-fatal — Climbers list will refresh on next mount.
      }
    } catch (e) {
      console.warn('[outdoor send] enqueue log failed:', e);
    }

    // 2. Rating (best-effort).
    try {
      await outdoorApi.rateRoute(id, { stars: draft.stars, comment: draft.comment || undefined });
      // Refresh the route so aggregate stars/rating_count reflect the new rating.
      const updatedRoute = await outdoorApi.getRoute(id);
      if (updatedRoute) setRoute(updatedRoute);
    } catch {
      // Silent — outbox would retry in real impl
    }

    // 2. If the user attached a beta video, run the full upload pipeline
    //    (compress → thumbnail → R2 → POST beta) before returning. The
    //    send sheet stays open with "Submitting…" shown until this completes.
    //    The comment doubles as the beta description — one field, two uses.
    let betaUploaded = false;
    if (pendingBetaVideo) {
      const uploadId = startUpload(tr('上传 Beta…', 'Uploading beta…'), 'la');
      try {
        updateUpload(uploadId, 0, 'compressing');
        const compressedUri = await compressVideo(pendingBetaVideo.uri,
          (p) => updateUpload(uploadId, p * 0.6, 'compressing'));
        updateUpload(uploadId, 0.6, 'uploading');

        let thumbnailUrl: string | undefined;
        // Prefer the cover frame the user picked in cover-picker; fall back
        // to auto-generated thumbnail if for some reason no coverUri is set.
        const localThumbUri =
          pendingBetaVideo.coverUri ??
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

        await betaApi.createForRoute(id, {
          media_url: mediaUrl,
          thumbnail_url: thumbnailUrl,
          description: draft.comment?.trim() || null,
        });

        finishUpload(uploadId, 'success');
        betaUploaded = true;
      } catch (err: any) {
        // Surface upload failures but don't block the log — send is
        // already recorded. We still clear the pending video so the
        // next send-sheet open starts fresh instead of showing a stale
        // "attached" row from a failed upload.
        const msg = err?.detail || err?.message || tr('Beta 上传失败', 'Beta upload failed');
        finishUpload(uploadId, 'error', msg);
        Alert.alert(tr('Beta 上传失败', 'Beta upload failed'), msg);
      } finally {
        setPendingBetaVideo(null);
      }
    }

    setSendSheetOpen(false);
    const summary = `${draft.style} · ${draft.attempts} att · ${draft.feel}`;
    Alert.alert(
      tr('记录成功', 'Logged!'),
      betaUploaded
        ? tr(`${summary}\nBeta 已上传`, `${summary}\nBeta uploaded`)
        : summary,
    );
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
          headerTransparent: true,
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
      <ScrollEdgeFallback>
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
          {/* Name + grade + stars */}
          <Text style={styles.routeName}>{route.name}</Text>
          <Text style={styles.routeInfo}>
            {route.grade_text} · {route.style}
            {route.length_m ? ` · ${route.length_m}m` : ''}
            {route.bolts ? ` · ${route.bolts} bolts` : ''}
            {route.pitches > 1 ? ` · ${route.pitches}p` : ''}
          </Text>
          {route.first_ascent ? <Text style={styles.faText}>FA: {route.first_ascent}</Text> : null}
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
                color="#FFFFFF"
              />
              <Text style={styles.primaryBtnText}>
                {userHasSent ? tr('已完成', 'Sended') : tr('完成', 'Send')}
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

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{tr('路线描述', 'Description')}</Text>
            <RouteDescriptionCard description={route.description} />
          </View>

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
      </ScrollEdgeFallback>

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

      {/* Pure share-beta sheet — opened from the camera button in the
          action row. Skips the send log entirely: just a video preview +
          comment + Submit. Parallel to the Send sheet's attached-beta
          flow, which wraps a send log around the upload. */}
      <BetaShareSheet
        ref={(h) => {
          betaShareSheetRef.current = h;
        }}
        routeId={route.id}
      />
    </>
  );
}

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
    faText: { fontFamily: theme.fonts.regular, fontSize: 12, color: c.textTertiary, marginBottom: 4 },
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
