// Indoor gym route detail. Mirrors the outdoor route detail page section-
// for-section so the two surfaces stay learnable: header art / route name
// row / Send-Attempt-Camera / wall close-up / description / climber data.
//
// Send wraps OutdoorSendSheet (style/grade/feel/comment/stars + optional
// beta). The sheet's "outdoor" naming is incidental — redpoint/onsight/
// flash apply to indoor too. onDone calls gymsCatalogApi.rateRoute and,
// if a beta video was attached, also POSTs /gym/routes/{id}/beta.
//
// ClimbLog↔route_id integration is deferred to its own window — it's a
// cross-cutting store/sync/Journal change touching outdoor too.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Dimensions,
  Pressable,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Share,
  FlatList,
} from 'react-native';
import { HEADER_TRANSPARENT } from "@/lib/nativeHeaderOptions";
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import {
  Stack,
  useRouter,
  useLocalSearchParams,
} from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { HeaderButton } from '../../../src/components/ui/HeaderButton';
import { useThemeColors } from '../../../src/lib/useThemeColors';
import { useSettings } from '../../../src/contexts/SettingsContext';
import { useUserStore } from '../../../src/store/useUserStore';
import { theme } from '../../../src/lib/theme';
import GradeSuggestionCard, {
  type SendLog,
} from '../../../src/components/shared/GradeSuggestionCard';
import { pickMediaFromLibrary } from '../../../src/lib/mediaPicker';
import {
  uploadSingleFileToR2,
  toFileUri,
} from '../../../src/features/community/api';
import { compressVideo } from '../../../src/lib/videoCompression';
import { compressImage } from '../../../src/lib/imageCompression';
import {
  startUpload,
  updateUpload,
  finishUpload,
} from '../../../src/lib/uploadActivityBridge';
import type { PickedMediaItem } from '../../../src/features/community/types';
import useBetaShareHandoffStore from '../../../src/store/useBetaShareHandoffStore';
import OutdoorSendSheet, {
  type OutdoorSendDraft,
} from '../../../src/features/outdoor/sendSheet/OutdoorSendSheet';
import { RouteDescriptionCard } from '../../../src/features/outdoor/components/RouteDescriptionCard';
import { gymsCatalogApi } from '../../../src/features/gymsCatalog/api';
import {
  enqueueRouteSendLog,
  enqueueRouteAttemptLog,
  flushLogsOutboxNow,
} from '../../../src/features/journal/sync/enqueueRouteSendLog';
import { ArchivedBanner } from '../../../src/features/gymsCatalog/components/ArchivedBanner';
import { WallCloseUpCard } from '../../../src/features/gymsCatalog/components/WallCloseUpCard';
import type {
  GymRoute,
  GymRouteAscent,
} from '../../../src/features/gymsCatalog/types';

const SCREEN_W = Dimensions.get('window').width;
const PHOTO_H = SCREEN_W * 0.82;

// B2 #2: greyed Send button background when current user already sent this
// route. Mid-grey so the white text + checkmark icon stay readable in both
// light and dark modes (theme-agnostic by design — disabled state). The
// checkmark itself stays green to celebrate completion.
const SENDED_BG = '#6B7280';
const SENDED_TICK = '#34D399'; // emerald-400 — readable on both light & dark grey

// Same grade pickers OutdoorSendSheet uses for outdoor routes — indoor
// boulder is V-scale, indoor rope is YDS in our schema. font/french
// systems exist on backend but are rare for indoor; fall back by family.
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

function gymGradeOptions(systemHint?: string, originalGrade?: string): string[] {
  if (systemHint === 'vscale' || (originalGrade && originalGrade.toUpperCase().startsWith('V'))) {
    return V_GRADES;
  }
  return YDS_GRADES;
}

export default function GymRouteDetailPage() {
  const colors = useThemeColors();
  const { tr } = useSettings();
  const router = useRouter();
  const { routeId } = useLocalSearchParams<{ routeId: string }>();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [route, setRoute] = useState<GymRoute | null>(null);
  const [ascents, setAscents] = useState<GymRouteAscent[]>([]);
  const currentUserId = useUserStore((s) => s.user?.id);
  // B2 #2: greyed Send button when current user already has a non-attempt
  // ascent on this route. Re-evaluates whenever ascents refetch.
  const userHasSent = useMemo(
    () =>
      !!currentUserId &&
      ascents.some((a) => a.user_id === currentUserId && a.result !== 'attempt'),
    [currentUserId, ascents],
  );
  const [loading, setLoading] = useState(true);
  const [localAttempts, setLocalAttempts] = useState(0);
  const [sendSheetOpen, setSendSheetOpen] = useState(false);
  const [pendingBetaVideo, setPendingBetaVideo] =
    useState<PickedMediaItem | null>(null);
  // BetaShareSheet migrated to formSheet route — sheet-container-audit A1.
  const setPendingBetaShareVideo = useBetaShareHandoffStore((s) => s.setPendingVideo);

  // Picks a single video via system PHPicker, enforces the 90s cap, then
  // dispatches to either 'send' (re-open OutdoorSendSheet w/ beta) or
  // 'direct' (push outdoor-beta-share formSheet standalone).
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
          router.push(`/outdoor-beta-share?routeId=${encodeURIComponent(route.id)}&routeKind=gym`);
        });
      } else {
        setPendingBetaVideo(videoItem);
        requestAnimationFrame(() => setSendSheetOpen(true));
      }
    },
    [route, tr, router, setPendingBetaShareVideo],
  );

  useEffect(() => {
    if (!routeId) return;
    let cancelled = false;
    setLoading(true);
    Promise.all([
      gymsCatalogApi.getRoute(routeId),
      gymsCatalogApi.getAscents(routeId),
    ])
      .then(([r, a]) => {
        if (cancelled) return;
        setRoute(r);
        setAscents(a ?? []);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [routeId]);

  // GradeSuggestionCard expects send logs (excludes attempts). Window
  // D1_D2_E2 — `grade_text` + `feel` echoed back by /ascents power the
  // histogram + majority-feel pill restored to the card.
  const sendLogs: SendLog[] = useMemo(
    () =>
      (ascents ?? [])
        .filter((a) => a.result !== 'attempt')
        .map((a) => ({
          user_id: a.user_id,
          username: a.username ?? '',
          grade_text: a.grade_text ?? null,
          feel: (a.feel ?? null) as SendLog['feel'],
        })),
    [ascents],
  );

  const openBetaList = useCallback(() => {
    if (!route) return;
    router.push(
      `/gym/route-beta?routeId=${route.id}&routeName=${encodeURIComponent(
        route.name ?? tr('未命名路线', 'Unnamed route'),
      )}` as any,
    );
  }, [router, route, tr]);

  const handleAttempt = useCallback(async () => {
    if (!route || route.status === 'archived') return;
    setLocalAttempts((n) => n + 1);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

    try {
      // B2: Attempt now persists to backend; auto-startSession fires inside
      // enqueueRouteAttemptLog when no active session exists.
      await enqueueRouteAttemptLog({
        routeKind: 'gym',
        routeId: route.id,
        routeName: route.name ?? '',
        routeStyle: route.style,
        routeGrade: route.grade_text,
        // B2 follow-up: GET /routes/{id} now joins gym → gym_name; fall
        // back to literal 'Gym' only if the route was loaded by a stale
        // client that doesn't include the field.
        sessionGymName: route.gym_name || 'Gym',
        sessionGymId: route.gym_id ?? null,
        sessionLocationType: 'gym',
      });
      await flushLogsOutboxNow();
    } catch (e) {
      if (__DEV__) console.warn('[gym attempt] enqueue failed:', e);
    }
  }, [route]);

  const handleSend = useCallback(() => {
    if (!route || route.status === 'archived') return;
    setSendSheetOpen(true);
  }, [route]);

  const handleShareBetaFromSendSheet = useCallback(
    () => pickAndDispatchBeta('send'),
    [pickAndDispatchBeta],
  );

  const handleRemoveBeta = useCallback(() => {
    setPendingBetaVideo(null);
  }, []);

  const onSendDone = useCallback(
    async (draft: OutdoorSendDraft) => {
      if (!route) return;

      // 1. ClimbLog FIRST (local + outbox). The user's send record is
      //    durable; rating below is best-effort.
      try {
        await enqueueRouteSendLog({
          routeKind: 'gym',
          routeId: route.id,
          routeName: route.name ?? '',
          routeStyle: route.style,
          draft,
          sessionGymName: route.gym_name || 'Gym',
          sessionGymId: route.gym_id ?? null,
          sessionLocationType: 'gym',
        });
        await flushLogsOutboxNow();
        try {
          const fresh = await gymsCatalogApi.getAscents(route.id);
          setAscents(fresh ?? []);
        } catch {
          // Non-fatal — Climbers list will refresh on next mount.
        }
      } catch (e) {
        console.warn('[gym send] enqueue log failed:', e);
      }

      // 2. Record the rating. Comment doubles as the beta description if
      //    a beta video is attached — same one-field-two-uses pattern as
      //    outdoor.
      try {
        await gymsCatalogApi.rateRoute(route.id, {
          stars: draft.stars,
          comment: draft.comment || undefined,
        });
        const updated = await gymsCatalogApi.getRoute(route.id);
        setRoute(updated);
      } catch {
        // Outbox-style retry not yet wired for gym; failure surfaces below.
      }

      // 2. If a beta video came along, push it through the same compress
      //    → thumbnail → R2 → POST /gym/routes/{id}/beta pipeline outdoor
      //    uses. Send sheet stays in "Submitting…" state until this resolves.
      let betaUploaded = false;
      if (pendingBetaVideo) {
        const uploadId = startUpload(tr('上传 Beta…', 'Uploading beta…'), 'la');
        try {
          updateUpload(uploadId, 0, 'compressing');
          const compressedUri = await compressVideo(pendingBetaVideo.uri,
            (p) => updateUpload(uploadId, p * 0.6, 'compressing'));
          updateUpload(uploadId, 0.6, 'uploading');

          let thumbnailUrl: string | undefined;
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

          await gymsCatalogApi.createBeta(route.id, {
            media_url: mediaUrl,
            thumbnail_url: thumbnailUrl,
            description: draft.comment?.trim() || null,
          });
          finishUpload(uploadId, 'success');
          betaUploaded = true;
        } catch (err: any) {
          const msg =
            err?.detail || err?.message || tr('Beta 上传失败', 'Beta upload failed');
          finishUpload(uploadId, 'error', msg);
          Alert.alert(tr('Beta 上传失败', 'Beta upload failed'), msg);
        } finally {
          setPendingBetaVideo(null);
        }
      }

      setSendSheetOpen(false);
      Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Success,
      ).catch(() => {});
      const summary = `${draft.style} · ${draft.attempts} att · ${draft.feel}`;
      Alert.alert(
        tr('记录成功', 'Logged!'),
        betaUploaded
          ? tr(`${summary}\nBeta 已上传`, `${summary}\nBeta uploaded`)
          : summary,
      );
    },
    [pendingBetaVideo, route, tr],
  );

  const handleShare = useCallback(async () => {
    if (!route) return;
    const url = `climmate://gym/route/${route.id}`;
    try {
      await Share.share({
        message: tr(
          `在 climMate 看看这条路线: ${route.name ?? '未命名'} (${route.grade_text}) ${url}`,
          `Check out this route on climMate: ${route.name ?? 'Unnamed'} (${route.grade_text}) ${url}`,
        ),
        url,
      });
    } catch {
      // user cancelled
    }
  }, [route, tr]);

  const handleReport = useCallback(() => {
    Alert.alert(
      tr('举报路线', 'Report Route'),
      tr('感谢举报,我们会尽快审核。', "Thanks — we'll review this route shortly."),
    );
  }, [tr]);

  const handleShareBeta = useCallback(() => {
    if (!route || route.status === 'archived') return;
    pickAndDispatchBeta('direct');
  }, [route, pickAndDispatchBeta]);

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
          <Text style={styles.emptyText}>
            {tr('路线未找到', 'Route not found')}
          </Text>
        </View>
      </>
    );
  }

  const isArchived = route.status === 'archived';
  const photos = route.photos ?? [];
  const displayName = route.name ?? tr('未命名路线', 'Unnamed route');

  return (
    <>
      <Stack.Screen
        options={{
          headerTitle: '',
          headerTransparent: HEADER_TRANSPARENT,
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
            router.push({ pathname: '/daily-summary', params: { date: 'today' } } as any)
          }
        />
        <Stack.Toolbar.Menu icon="ellipsis">
          <Stack.Toolbar.MenuAction
            icon="square.and.arrow.up"
            onPress={handleShare}
          >
            {tr('分享', 'Share')}
          </Stack.Toolbar.MenuAction>
          <Stack.Toolbar.MenuAction icon="flag" onPress={handleReport}>
            {tr('举报', 'Report')}
          </Stack.Toolbar.MenuAction>
        </Stack.Toolbar.Menu>
      </Stack.Toolbar>

      <ScrollView
        style={styles.container}
        contentInsetAdjustmentBehavior="never"
        showsVerticalScrollIndicator={false}
      >
        {/* Hero — photo carousel or color block fallback. Routes without
            photos fall back to a flat color band derived from route.color
            so the page never looks empty above the fold. */}
        <View style={styles.photoWrap}>
          {photos.length > 0 ? (
            <FlatList
              horizontal
              pagingEnabled
              data={photos}
              keyExtractor={(_, i) => `photo-${i}`}
              showsHorizontalScrollIndicator={false}
              renderItem={({ item }) => (
                <Pressable onPress={openBetaList}>
                  <Image
                    source={{ uri: item.url }}
                    style={styles.photo}
                    contentFit="cover"
                  />
                </Pressable>
              )}
            />
          ) : (
            <Pressable
              onPress={openBetaList}
              style={[styles.photo, styles.photoPlaceholder]}
            >
              <Ionicons
                name="image-outline"
                size={40}
                color={colors.textTertiary}
              />
            </Pressable>
          )}
          <View style={styles.viewBetaPill} pointerEvents="none">
            <Ionicons name="videocam" size={14} color="#fff" />
            <Text style={styles.viewBetaText}>
              {tr('查看 Beta', 'View Beta')}
            </Text>
          </View>
        </View>

        {isArchived && <ArchivedBanner archivedAt={route.archived_at} />}

        <View style={styles.body}>
          <Text style={styles.routeName}>{displayName}</Text>
          <Text style={styles.routeInfo}>
            {route.grade_text}
            {' · '}
            {route.style === 'boulder' ? tr('抱石', 'Boulder') : tr('绳攀', 'Rope')}
            {route.color ? ` · ${route.color}` : ''}
            {route.setter_name ? ` · ${tr('设线', 'Set by')} ${route.setter_name}` : ''}
          </Text>

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
                ({route.stars.toFixed(1)}) · {route.rating_count}{' '}
                {tr('评价', 'reviews')}
              </Text>
            </View>
          )}

          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[
                styles.primaryBtn,
                {
                  backgroundColor: isArchived
                    ? colors.backgroundSecondary
                    : userHasSent
                      ? SENDED_BG
                      : colors.accent,
                },
              ]}
              onPress={isArchived || userHasSent ? undefined : handleSend}
              disabled={isArchived || userHasSent}
              activeOpacity={0.85}
            >
              <Ionicons
                name={userHasSent ? 'checkmark-circle' : 'checkmark-circle-outline'}
                size={18}
                color={
                  isArchived
                    ? colors.textTertiary
                    : userHasSent
                      ? SENDED_TICK
                      : '#FFFFFF'
                }
              />
              <Text
                style={[
                  styles.primaryBtnText,
                  isArchived && { color: colors.textTertiary },
                ]}
              >
                {userHasSent ? tr('已完成', 'Sent') : tr('完成', 'Send')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.secondaryBtn, { backgroundColor: colors.pillBackground }]}
              onPress={handleAttempt}
              disabled={isArchived}
              activeOpacity={0.85}
            >
              <Ionicons
                name="refresh-outline"
                size={18}
                color={colors.pillText}
              />
              <Text style={styles.secondaryBtnText}>
                {tr('尝试', 'Attempt')}
              </Text>
              {localAttempts > 0 && (
                <View style={styles.attemptBadge}>
                  <Text style={styles.attemptBadgeText}>+{localAttempts}</Text>
                </View>
              )}
            </TouchableOpacity>
            {/* Camera — pure share-beta flow. Picker → BetaShareSheet
                (description + submit). Parallel to outdoor route detail. */}
            <TouchableOpacity
              style={[styles.cameraBtn, { backgroundColor: colors.pillBackground }]}
              onPress={handleShareBeta}
              disabled={isArchived}
              activeOpacity={0.85}
              hitSlop={6}
            >
              <Ionicons
                name="videocam-outline"
                size={20}
                color={colors.pillText}
              />
            </TouchableOpacity>
          </View>

          <WallCloseUpCard
            wallCloseUpUrl={route.wall_close_up_url}
            routeName={route.name}
          />

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {tr('路线描述', 'Description')}
            </Text>
            <RouteDescriptionCard description={route.description} />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {tr('攀登数据', 'Climber Data')}
            </Text>
            <GradeSuggestionCard
              logs={sendLogs}
              avgStars={route.stars ?? null}
              onPress={() =>
                router.push(
                  `/gym/route-climbers?routeId=${route.id}` as any,
                )
              }
            />
          </View>
        </View>
      </ScrollView>

      <OutdoorSendSheet
        visible={sendSheetOpen}
        routeName={displayName}
        originalGrade={route.grade_text}
        gradeOptions={gymGradeOptions(route.grade_system, route.grade_text)}
        originalGradeIndex={Math.max(
          0,
          gymGradeOptions(route.grade_system, route.grade_text).indexOf(
            route.grade_text,
          ),
        )}
        onClose={() => setSendSheetOpen(false)}
        onDone={onSendDone}
        onShareBeta={handleShareBetaFromSendSheet}
        betaVideo={pendingBetaVideo}
        onRemoveBeta={handleRemoveBeta}
        tr={tr}
      />

      {/* Pure share-beta flow now lives at app/outdoor-beta-share.tsx
          (sheet-container-audit A1; ?routeKind=gym). */}
    </>
  );
}

const createStyles = (c: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    centered: { alignItems: 'center', justifyContent: 'center' },
    emptyText: {
      fontFamily: theme.fonts.regular,
      fontSize: 15,
      color: c.textSecondary,
    },
    photoWrap: { position: 'relative' },
    photo: { width: SCREEN_W, height: PHOTO_H },
    photoPlaceholder: {
      backgroundColor: c.backgroundSecondary,
      alignItems: 'center',
      justifyContent: 'center',
    },
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
    body: { padding: theme.spacing.screenPadding },
    routeName: {
      fontFamily: theme.fonts.black,
      fontSize: 24,
      color: c.textPrimary,
      marginBottom: 4,
    },
    routeInfo: {
      fontFamily: theme.fonts.regular,
      fontSize: 14,
      color: c.textSecondary,
      marginBottom: 2,
    },
    starsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      marginTop: 4,
      marginBottom: 20,
    },
    starsText: {
      fontFamily: theme.fonts.regular,
      fontSize: 12,
      color: c.textSecondary,
      marginLeft: 4,
    },
    actionRow: { flexDirection: 'row', gap: 10, marginTop: 16, marginBottom: 20 },
    primaryBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 14,
      borderRadius: theme.borderRadius.card,
    },
    primaryBtnText: {
      fontFamily: theme.fonts.black,
      fontSize: 15,
      color: '#FFFFFF',
    },
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
    secondaryBtnText: {
      fontFamily: theme.fonts.black,
      fontSize: 15,
      color: c.pillText,
    },
    cameraBtn: {
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
    section: { marginTop: theme.spacing.sectionGap },
    sectionTitle: {
      fontFamily: theme.fonts.black,
      fontSize: 16,
      color: c.textPrimary,
      marginBottom: 10,
    },
  });
