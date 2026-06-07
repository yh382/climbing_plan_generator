/**
 * CragInfoSheet — Crag (L5) detail sheet, BR Track D Day 3.
 *
 * Lands as a NEW file. The existing `AreaInfoSheet.tsx` (currently
 * renders Region per Track A drift) stays alive until Day 5 wires
 * callers to the right sheet for each level. Day 5 / 6 also delete
 * `AreaInfoSheet.tsx` once `RegionInfoSheet.tsx` (its real semantic) is
 * created and crag-map.tsx is migrated.
 *
 * Per PLAN_OUTDOOR_MAP_UX_V2 §4.1 + Phase 1 D-2 / D-4 decisions:
 *  - Hero: Crag cover, identity = Crag name + parent Area name subtitle
 *  - Stats: wall_count · route_count (Crag-only counts, no boulder split)
 *  - Walls list: enumerate `detail.walls[]` with per-wall route_count
 *  - Community Preview (counts-only per D-2): "{posts} posts · {sends}
 *    ascents in the last 30 days · last activity ago"
 *  - Save: polymorphic Saved Spots (D-4) — calls savedSpotsApi.save/unsave
 *    with target_type='crag'. Day 6 may refactor to a shared store.
 *
 * Mounted later by CragMenuSheet (Day 5 rename of AreaMenuSheet) and by
 * the Wall pin → RoutesListSheet → hamburger flow.
 */
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActionSheetIOS,
  ActivityIndicator,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TrueSheet } from '@lodev09/react-native-true-sheet';

import { useSettings } from '../../../contexts/SettingsContext';
import { useThemeColors } from '../../../lib/useThemeColors';
import { theme } from '../../../lib/theme';
import { TopFadeMaskView } from '../../../components/shared/TopFadeMaskView';
import { outdoorApi } from '../../outdoor/api';
import { savedSpotsApi } from '../../outdoor/savedSpotsApi';
import type { CragDetail, Wall } from '../../outdoor/types';
import {
  PlaceSheetActions,
  PlaceSheetFooter,
  PlaceSheetHero,
  PlaceSheetIdentity,
  PlaceSheetStats,
  type PlaceSheetAction,
  type PlaceSheetFooterAction,
} from '../../../components/shared/placeSheet';

export type CragInfoContext = 'cragMenu' | 'pinTap';

/** Lightweight data for instant-paint header before the full CragDetail
 *  fetch lands. Mirrors AreaInfoSeed pattern but for Crag-level. */
export type CragInfoSeed = {
  id: string;
  name: string;
  cover_url?: string | null;
  /** Parent Area display name — surfaced as the sheet subtitle since
   *  CragDetail.area_id alone needs an extra fetch to resolve. Callers
   *  pass this when they already have the area name in context. */
  area_name?: string | null;
  lat?: number | null;
  lng?: number | null;
  wall_count?: number;
  route_count?: number;
};

export interface CragInfoSheetHandle {
  present: () => void;
  dismiss: () => void;
}

interface CragInfoSheetProps {
  cragId: string | null;
  context: CragInfoContext;
  seedCrag?: CragInfoSeed | null;
  /** Optional CTA to enter the routes-list view for this Crag. Hide via
   *  `context='cragMenu'` when the parent menu already exposes Routes. */
  onPressRoutes?: () => void;
  /** Tap target for the "View community" link in the community section.
   *  Day 3 stub — caller wires to community navigation in Day 6. */
  onPressCommunity?: () => void;
  /** Drag-down / dismiss callback for parent stack tracking. */
  onDismiss?: () => void;
  onPresented?: () => void;
}

const CragInfoSheet = forwardRef<CragInfoSheetHandle, CragInfoSheetProps>(
  (props, ref) => {
    const colors = useThemeColors();
    const { tr } = useSettings();
    const sheetRef = useRef<TrueSheet>(null);
    const scrollRef = useRef<ScrollView>(null);
    const styles = useMemo(() => createStyles(colors), [colors]);

    const [detail, setDetail] = useState<CragDetail | null>(null);
    const [loading, setLoading] = useState(false);

    // Saved Spots local state — polymorphic per D-4. On present we ask
    // the server for the full saved list once; toggle flips optimistically.
    const [isSaved, setIsSaved] = useState(false);
    const [savedHydrated, setSavedHydrated] = useState(false);

    const loadedIdRef = useRef<string | null>(null);

    const loadCrag = useCallback(
      async (id: string) => {
        if (loadedIdRef.current === id && detail) return;
        setLoading(true);
        try {
          const data = await outdoorApi.getCragDetail(id);
          if (data) {
            setDetail(data);
            loadedIdRef.current = id;
          }
        } catch {
          // Keep prior detail; caller surface can toast if needed.
        } finally {
          setLoading(false);
        }
      },
      [detail],
    );

    const refreshSavedState = useCallback(async (id: string) => {
      try {
        const list = await savedSpotsApi.list();
        const saved = list.items.some(
          (it) => it.target_type === 'crag' && it.target_id === id,
        );
        setIsSaved(saved);
      } catch {
        // Swallow — anonymous viewers get 401, treated as not-saved.
      } finally {
        setSavedHydrated(true);
      }
    }, []);

    useImperativeHandle(ref, () => ({
      present: () => {
        sheetRef.current?.present().catch(() => {});
      },
      dismiss: () => {
        sheetRef.current?.dismiss().catch(() => {});
      },
    }));

    useEffect(() => {
      if (!props.cragId) return;
      if (loadedIdRef.current !== props.cragId) {
        setDetail(null);
        setSavedHydrated(false);
      }
    }, [props.cragId]);

    const onPresent = useCallback(() => {
      if (props.cragId) {
        void loadCrag(props.cragId);
        void refreshSavedState(props.cragId);
      }
      props.onPresented?.();
    }, [loadCrag, refreshSavedState, props]);

    const onDismiss = useCallback(() => {
      props.onDismiss?.();
    }, [props]);

    // Header projection — seed + detail merge so first paint is instant
    // on the gyms-stack entry. Crag.area_name and Region.region_name come
    // from the seed since CragDetail doesn't carry the parent chain.
    const header = useMemo(() => {
      const seed = props.seedCrag;
      return {
        id: detail?.id ?? seed?.id ?? props.cragId ?? '',
        name: detail?.name ?? seed?.name ?? '',
        cover_url: detail?.cover_url ?? seed?.cover_url ?? null,
        area_name: seed?.area_name ?? null,
        lat: detail?.lat ?? seed?.lat ?? null,
        lng: detail?.lng ?? seed?.lng ?? null,
        wall_count: detail?.wall_count ?? seed?.wall_count ?? 0,
        route_count: detail?.route_count ?? seed?.route_count ?? 0,
      };
    }, [detail, props.seedCrag, props.cragId]);

    const subtitle = header.area_name || tr('攀岩点', 'Crag');

    const showSkeleton = loading && !detail;

    const handleDirections = useCallback(() => {
      const { lat, lng, name } = header;
      if (lat == null || lng == null) return;
      const label = encodeURIComponent(name);
      if (Platform.OS === 'ios') {
        const apple = `http://maps.apple.com/?daddr=${lat},${lng}&q=${label}`;
        ActionSheetIOS.showActionSheetWithOptions(
          {
            options: [tr('苹果地图', 'Apple Maps'), tr('取消', 'Cancel')],
            cancelButtonIndex: 1,
          },
          (i) => {
            if (i === 0) Linking.openURL(apple);
          },
        );
      } else {
        Linking.openURL(
          `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
        );
      }
    }, [header, tr]);

    const handleInfo = useCallback(() => {
      sheetRef.current?.resize(1).catch(() => {});
      setTimeout(() => {
        scrollRef.current?.scrollTo({ y: 260, animated: true });
      }, 250);
    }, []);

    const handleSave = useCallback(async () => {
      if (!header.id || !savedHydrated) return;
      // Optimistic flip — rollback on server error.
      const prev = isSaved;
      setIsSaved(!prev);
      try {
        if (prev) {
          await savedSpotsApi.unsave('crag', header.id);
        } else {
          await savedSpotsApi.save('crag', header.id);
        }
      } catch {
        setIsSaved(prev);
      }
    }, [header.id, isSaved, savedHydrated]);

    const handleShare = useCallback(async () => {
      if (!header.name) return;
      const { lat, lng } = header;
      const url =
        lat != null && lng != null
          ? `https://maps.apple.com/?q=${encodeURIComponent(header.name)}&ll=${lat},${lng}`
          : undefined;
      try {
        await Share.share({
          title: header.name,
          message: url ? `${header.name}\n${url}` : header.name,
          ...(url ? { url } : {}),
        });
      } catch {}
    }, [header]);

    const actions: PlaceSheetAction[] = [];
    if (props.onPressRoutes && props.context !== 'cragMenu') {
      actions.push({
        icon: 'map-outline',
        label: tr('路线图', 'Routes'),
        onPress: props.onPressRoutes,
        variant: 'solid',
      });
    }
    actions.push({
      icon: 'navigate',
      label: tr('导航', 'Directions'),
      onPress: handleDirections,
      variant: 'tint',
      disabled: header.lat == null || header.lng == null,
    });

    const stats = [
      {
        value: header.wall_count,
        label: tr(
          '岩壁',
          header.wall_count === 1 ? 'Wall' : 'Walls',
        ),
      },
      {
        value: header.route_count,
        label: tr('路线', header.route_count === 1 ? 'Route' : 'Routes'),
      },
    ];

    const showFooter = props.context !== 'cragMenu';

    const footerActions: PlaceSheetFooterAction[] = [
      {
        key: 'info',
        icon: 'info.circle',
        onPress: handleInfo,
        disabled: !detail?.description && !detail?.approach && !detail?.location_description,
      },
      {
        key: 'share',
        icon: 'square.and.arrow.up',
        onPress: handleShare,
        disabled: !header.name,
      },
      {
        key: 'save',
        icon: isSaved ? 'bookmark.fill' : 'bookmark',
        onPress: handleSave,
        disabled: !header.id || !savedHydrated,
      },
    ];

    const footer = showFooter ? (
      <PlaceSheetFooter actions={footerActions} unionId="crag-info-footer" />
    ) : undefined;

    return (
      <TrueSheet
        ref={sheetRef}
        name="crag-info-sheet"
        detents={props.context === 'cragMenu' ? [0.9] : [0.5, 0.9]}
        dimmed={false}
        dismissible
        grabber
        grabberOptions={{ height: 3, width: 36, topMargin: 6 }}
        scrollable
        footer={footer}
        onDidPresent={onPresent}
        onDidDismiss={onDismiss}
      >
        <TopFadeMaskView topFadeRatio={0.08}>
          <ScrollView
            ref={scrollRef}
            contentContainerStyle={styles.body}
            showsVerticalScrollIndicator={false}
          >
            <PlaceSheetHero
              imageUrl={header.cover_url}
              fallbackIcon="triangle"
              placeholderSource={require('../../../../assets/images/placeholders/hero-default.jpg')}
            />
            <PlaceSheetIdentity title={header.name} subtitle={subtitle} />
            <PlaceSheetActions actions={actions} />
            <PlaceSheetStats stats={stats} />

            {/* BS Track B (2026-06-06) — OSM trail safety/trust banner.
                When trail_geojson came from auto-fetched OSM Overpass
                (vs admin/user curated), surface a clear "not a verified
                approach" notice. Without this, the dashed trail line
                visually reads as "recommended approach", which is
                dangerous when OSM data may be any hiker/bike/closed
                path. Banner only renders when trail is actually shown
                AND source is 'osm'. Dev fallback: when real trail_source
                is null (prod ~100% case before OSM backfill), mirror
                the MapScreenMapbox TrailLayer toggle (even-length crag
                name → OSM) so visual verify is possible without OSM
                data. Strict __DEV__ guard → prod never triggers fallback. */}
            {(() => {
              const realIsOSM =
                !!(detail?.trail_geojson && detail?.trail_source === 'osm');
              const devToggle =
                __DEV__ &&
                !!detail &&
                !detail.trail_source &&
                ((detail.name?.length ?? 0) % 2 === 0);
              return realIsOSM || devToggle;
            })() ? (
              <View style={styles.osmTrailBanner}>
                <Ionicons
                  name="warning-outline"
                  size={18}
                  color={colors.outdoorMarkerStroke}
                  style={styles.osmTrailBannerIcon}
                />
                <Text style={styles.osmTrailBannerText}>
                  {tr(
                    '显示附近参考小径。非已验证进场路线。',
                    'Showing nearby reference trails. Not a verified approach.',
                  )}
                </Text>
              </View>
            ) : null}

            {/* BS-P1-γ — derived coordinate banner. When the crag's
                lat/lng is a centroid of child routes (not an explicit
                admin/user/import-set coord), tell the user the pin is
                approximate. Safety/trust per ChatGPT design: centroid
                OK for overview navigation but not for approach. */}
            {detail?.location && detail.location.source === 'derived' ? (
              <View style={styles.osmTrailBanner}>
                <Ionicons
                  name="locate-outline"
                  size={18}
                  color={colors.outdoorMarkerStroke}
                  style={styles.osmTrailBannerIcon}
                />
                <Text style={styles.osmTrailBannerText}>
                  {tr(
                    '位置根据路线坐标估算，可能不精确。',
                    'Approximate location based on route coordinates.',
                  )}
                </Text>
              </View>
            ) : null}

            {showSkeleton ? (
              <View style={[styles.contentCard, styles.skeleton]}>
                <ActivityIndicator color={colors.accent} />
              </View>
            ) : null}

            {detail?.description ? (
              <View style={styles.contentCard}>
                <Section title={tr('描述', 'Description')} colors={colors} first>
                  <Text style={styles.paragraph}>{detail.description}</Text>
                </Section>
                {detail.approach || detail.location_description ? (
                  <Section title={tr('接近路线', 'Approach')} colors={colors}>
                    {/* BV — admin-curated `approach` takes precedence; falls
                        back to OpenBeta's `content.location` text imported as
                        `location_description`. Both can be set independently. */}
                    <Text style={styles.paragraph}>
                      {detail.approach || detail.location_description}
                    </Text>
                  </Section>
                ) : null}
              </View>
            ) : null}

            {/* Walls list section — child Walls of this Crag. */}
            {detail?.walls?.length ? (
              <View style={styles.contentCard}>
                <Section
                  title={tr('岩壁与抱石', 'Walls / Boulders')}
                  colors={colors}
                  first
                >
                  {detail.walls.map((w) => (
                    <WallRow
                      key={w.id}
                      wall={w}
                      colors={colors}
                      onPress={() => {
                        // Day 5 wires this — Wall pin tap → RoutesListSheet
                        // open with wallName set. Day 3 leaves as no-op so
                        // the row is still tap-feedback-only.
                      }}
                    />
                  ))}
                </Section>
              </View>
            ) : null}

            {/* Community Preview — D-2 counts-only stub. Full post list
                deferred to BR-Track-D-FU-community-posts. */}
            {detail ? (
              <View style={styles.contentCard}>
                <Section
                  title={tr('社区动态', 'Community')}
                  colors={colors}
                  first
                >
                  <CommunityRow
                    detail={detail}
                    colors={colors}
                    tr={tr}
                    onPressView={props.onPressCommunity}
                  />
                </Section>
              </View>
            ) : null}
          </ScrollView>
        </TopFadeMaskView>
      </TrueSheet>
    );
  },
);

CragInfoSheet.displayName = 'CragInfoSheet';

export default CragInfoSheet;

// ---- Sub-components ----

function Section({
  title,
  children,
  colors,
  first,
}: {
  title: string;
  children: React.ReactNode;
  colors: ReturnType<typeof useThemeColors>;
  first?: boolean;
}) {
  return (
    <View style={{ marginTop: first ? 0 : 20 }}>
      <Text
        style={{
          fontFamily: theme.fonts.bold,
          fontSize: 13,
          color: colors.textSecondary,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
          marginBottom: 8,
        }}
      >
        {title}
      </Text>
      {children}
    </View>
  );
}

function WallRow({
  wall,
  colors,
  onPress,
}: {
  wall: Wall;
  colors: ReturnType<typeof useThemeColors>;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <Ionicons
        name="layers-outline"
        size={18}
        color={colors.textSecondary}
        style={{ marginRight: 10 }}
      />
      <Text
        style={{
          flex: 1,
          fontFamily: theme.fonts.medium,
          fontSize: 15,
          color: colors.textPrimary,
        }}
        numberOfLines={1}
      >
        {wall.name}
      </Text>
      {wall.route_count != null ? (
        <Text
          style={{
            fontFamily: theme.fonts.regular,
            fontSize: 13,
            color: colors.textSecondary,
            marginRight: 8,
          }}
        >
          {wall.route_count}
        </Text>
      ) : null}
      <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
    </Pressable>
  );
}

function CommunityRow({
  detail,
  colors,
  tr,
  onPressView,
}: {
  detail: CragDetail;
  colors: ReturnType<typeof useThemeColors>;
  tr: (zh: string, en: string) => string;
  onPressView?: () => void;
}) {
  const { recent_post_count, recent_ascent_count, last_activity_at } = detail.community;
  const isQuiet = recent_post_count === 0 && recent_ascent_count === 0;
  const rangeLabel = tr('近 30 天', 'last 30 days');
  const lastLabel = last_activity_at
    ? formatRelativeTime(last_activity_at, tr)
    : null;

  return (
    <View>
      {isQuiet ? (
        <Text
          style={{
            fontFamily: theme.fonts.regular,
            fontSize: 14,
            color: colors.textTertiary,
          }}
        >
          {tr('暂无近期动态', 'No recent activity')}
        </Text>
      ) : (
        <Text
          style={{
            fontFamily: theme.fonts.regular,
            fontSize: 14,
            color: colors.textPrimary,
            lineHeight: 20,
          }}
        >
          {`${recent_post_count} ${tr('条记录', recent_post_count === 1 ? 'post' : 'posts')} · ${recent_ascent_count} ${tr('次完攀', recent_ascent_count === 1 ? 'ascent' : 'ascents')} · ${rangeLabel}`}
          {lastLabel ? (
            <Text style={{ color: colors.textSecondary }}>
              {`\n${tr('最近动态', 'Last activity')} ${lastLabel}`}
            </Text>
          ) : null}
        </Text>
      )}
      {onPressView ? (
        <Pressable
          onPress={onPressView}
          style={({ pressed }) => ({
            marginTop: 12,
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <Text
            style={{
              fontFamily: theme.fonts.medium,
              fontSize: 14,
              color: colors.accent,
            }}
          >
            {tr('查看社区动态 →', 'View community →')}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

// ---- Helpers ----

/** Compact relative-time formatter. Mirrors the style used elsewhere
 *  in the app (NotificationCard etc.) — keeps wording short. */
function formatRelativeTime(
  iso: string,
  tr: (zh: string, en: string) => string,
): string {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return tr('刚刚', 'just now');
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo`;
  const years = Math.floor(months / 12);
  return `${years}y`;
}

// ---- Styles ----

const createStyles = (c: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    body: {
      paddingHorizontal: 0,
      paddingTop: 0,
      paddingBottom: 40,
    },
    contentCard: {
      backgroundColor: c.sheetBackground,
      borderRadius: 16,
      padding: 16,
      marginHorizontal: theme.spacing.screenPadding,
      marginTop: 12,
    },
    paragraph: {
      fontFamily: theme.fonts.regular,
      fontSize: 15,
      lineHeight: 22,
      color: c.textPrimary,
    },
    skeleton: {
      alignItems: 'center',
      paddingVertical: 40,
    },
    osmTrailBanner: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
      backgroundColor: c.warningTint,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      marginHorizontal: theme.spacing.screenPadding,
      marginTop: 12,
    },
    osmTrailBannerIcon: {
      marginTop: 1,
    },
    osmTrailBannerText: {
      flex: 1,
      fontFamily: theme.fonts.regular,
      fontSize: 13,
      lineHeight: 18,
      color: c.textPrimary,
    },
  });
