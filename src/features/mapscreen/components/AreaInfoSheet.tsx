// src/features/mapscreen/components/AreaInfoSheet.tsx
// Canonical area info sheet — consolidates what used to live in three
// places: the gyms-mode POI card, the crag-mode "详情" sheet, and the
// old /outdoor/area-detail page. Presented from:
//   1. Gyms map → tapping an outdoor area pin (seeded with lightweight
//      data so the header paints instantly while the full fetch runs).
//   2. Crag map / unified map → tapping the area name in the sheet header.
//   3. AreaMenuSheet → tapping the area header card or "Area Info &
//      Approach" menu row (stacked on top of AreaMenuSheet).
//
// Fetches the full Area record on first present() and keeps the last
// successful payload on re-open. Cover image has an offline-safe
// fallback inside PlaceSheetHero.
//
// Visual structure is unified with GymDetailCard via
// src/components/shared/placeSheet: Hero → Identity → Actions →
// Stats → detail sections → (optional) Enter CTA.

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
import { useAreaFavoriteToggle } from '../../outdoor/hooks';
// BR Track A: this sheet renders the top-level Region (was Area). Type
// imported from outdoor/types renamed Region; alias kept as `Area` for
// minimum-diff body — Track D will rename the sheet + props.
import type { Accommodation, Region as Area, Transport } from '../../outdoor/types';
import {
  PlaceSheetActions,
  PlaceSheetFooter,
  PlaceSheetHero,
  PlaceSheetIdentity,
  PlaceSheetStats,
  type PlaceSheetAction,
  type PlaceSheetFooterAction,
} from '../../../components/shared/placeSheet';

export type AreaInfoContext = 'gyms' | 'crag' | 'areaMenu';

export type AreaInfoSeed = {
  id: string;
  name: string;
  cover_url?: string | null;
  region?: string | null;
  country?: string | null;
  lat?: number | null;
  lng?: number | null;
  crag_count?: number;
  route_count?: number;
  boulder_count?: number;
};

export interface AreaInfoSheetHandle {
  present: () => void;
  dismiss: () => void;
}

interface AreaInfoSheetProps {
  areaId: string | null;
  context: AreaInfoContext;
  /** Lightweight data for the gyms-mode path so the header paints
   *  before the full fetch lands. Omit in crag mode — the caller's
   *  areaData already hands a complete record. */
  seedArea?: AreaInfoSeed | null;
  onPressRouteMap: () => void;
  /** Fires after TrueSheet finishes its dismiss animation (drag-down,
   *  swipe, or imperative dismiss()). Parent tracks this so the
   *  gyms-sheet back button can intercept and close the info sheet
   *  before navigating away. */
  onDismiss?: () => void;
  /** Fires when TrueSheet finishes its present animation. Mirrors
   *  `onDismiss` so the parent can flip its tracking flag. */
  onPresented?: () => void;
}

const AreaInfoSheet = forwardRef<AreaInfoSheetHandle, AreaInfoSheetProps>(
  (props, ref) => {
    const colors = useThemeColors();
    const { tr } = useSettings();
    const sheetRef = useRef<TrueSheet>(null);
    const scrollRef = useRef<ScrollView>(null);
    const styles = useMemo(() => createStyles(colors), [colors]);

    const [area, setArea] = useState<Area | null>(null);
    const [loading, setLoading] = useState(false);
    const {
      isFavorited,
      toggle: toggleFavorite,
      loaded: favLoaded,
    } = useAreaFavoriteToggle();

    // Which areaId we've already fetched successfully. Keep the last
    // payload on failure / re-open to avoid blank flashes.
    const loadedIdRef = useRef<string | null>(null);

    const loadArea = useCallback(
      async (id: string) => {
        if (loadedIdRef.current === id && area) return;
        setLoading(true);
        try {
          const data = await outdoorApi.getRegion(id);
          if (data) {
            setArea(data);
            loadedIdRef.current = id;
          }
        } catch {
          // Keep prior area; caller surface can toast if needed.
        } finally {
          setLoading(false);
        }
      },
      [area],
    );

    useImperativeHandle(ref, () => ({
      present: () => {
        sheetRef.current?.present().catch(() => {});
      },
      dismiss: () => {
        sheetRef.current?.dismiss().catch(() => {});
      },
    }));

    useEffect(() => {
      if (!props.areaId) return;
      if (loadedIdRef.current !== props.areaId) {
        setArea(null);
      }
    }, [props.areaId]);

    const onPresent = useCallback(() => {
      if (props.areaId) {
        void loadArea(props.areaId);
      }
      props.onPresented?.();
    }, [props.areaId, loadArea, props]);

    const onDismiss = useCallback(() => {
      props.onDismiss?.();
    }, [props]);

    // Merge seed + fetched so the header can paint while the full
    // record loads on the gyms path.
    const header = useMemo(() => {
      const seed = props.seedArea;
      return {
        id: area?.id ?? seed?.id ?? props.areaId ?? '',
        name: area?.name ?? seed?.name ?? '',
        cover_url: area?.cover_url ?? seed?.cover_url ?? null,
        region: area?.region ?? seed?.region ?? null,
        country: area?.country ?? seed?.country ?? null,
        lat: area?.lat ?? seed?.lat ?? null,
        lng: area?.lng ?? seed?.lng ?? null,
        // BR Track A: top-level children rename crag_count → area_count.
        // Seed prop keeps the legacy name for caller minimum-diff; map
        // through here.
        crag_count: area?.area_count ?? seed?.crag_count ?? 0,
        route_count: area?.route_count ?? seed?.route_count ?? 0,
        boulder_count: area?.boulder_count ?? seed?.boulder_count ?? 0,
      };
    }, [area, props.seedArea, props.areaId]);

    const ropeCount = Math.max(0, header.route_count - header.boulder_count);
    const regionLine = [header.region, header.country]
      .filter((x): x is string => !!x && x.trim().length > 0)
      .join(' · ');
    const subtitle = regionLine || tr('攀岩区', 'Climbing Area');

    const showSkeletonSections = loading && !area;

    const hasDetailContent =
      !!area &&
      (!!area.description ||
        !!area.approach ||
        hasTransport(area.transport) ||
        (area.accommodation?.length ?? 0) > 0 ||
        !!area.safety_notes ||
        !!area.emergency_info);

    const favActive = header.id ? isFavorited(header.id) : false;

    const handleDirections = useCallback(() => {
      const lat = header.lat;
      const lng = header.lng;
      if (lat == null || lng == null) return;
      const label = encodeURIComponent(header.name);
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
    }, [header.lat, header.lng, header.name, tr]);

    const handleInfo = useCallback(() => {
      // Expand to large detent and scroll to top of content sections.
      sheetRef.current?.resize(1).catch(() => {});
      // Give the resize a beat to settle before scrolling.
      setTimeout(() => {
        scrollRef.current?.scrollTo({ y: 260, animated: true });
      }, 250);
    }, []);

    const handleFavorite = useCallback(() => {
      if (!header.id) return;
      // Send the full Area shape (fall back to header projection when
      // the full record hasn't loaded yet) so the favorites store can
      // render the saved spot in GymsSavedSpotsRow without a re-fetch.
      const payload: Area = (area ?? {
        id: header.id,
        name: header.name,
        cover_url: header.cover_url ?? null,
        region: header.region ?? null,
        country: header.country ?? 'US',
        lat: header.lat ?? null,
        lng: header.lng ?? null,
        crag_count: header.crag_count,
        route_count: header.route_count,
        boulder_count: header.boulder_count,
        status: 'approved',
      }) as Area;
      void toggleFavorite(payload);
    }, [area, header, toggleFavorite]);

    const handleShare = useCallback(async () => {
      if (!header.name) return;
      const lat = header.lat;
      const lng = header.lng;
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
    }, [header.lat, header.lng, header.name]);

    // Two-pill action row: Enter (or Routes) is the primary CTA on the
    // left as a solid accent fill — the most important next step.
    // Directions sits to its right as a tinted secondary. Info / Share
    // / Favorite live in the glass footer.
    const enterEnabled = props.context !== 'areaMenu';
    const actions: PlaceSheetAction[] = [
      {
        icon: 'map-outline',
        label:
          props.context === 'gyms'
            ? tr('进入', 'Enter')
            : tr('路线图', 'Routes'),
        onPress: props.onPressRouteMap,
        variant: 'solid',
        disabled: !enterEnabled,
      },
      {
        icon: 'navigate',
        label: tr('导航', 'Directions'),
        onPress: handleDirections,
        variant: 'tint',
        disabled: header.lat == null || header.lng == null,
      },
    ];

    const stats = [
      {
        value: header.crag_count,
        label: tr('岩壁', header.crag_count === 1 ? 'Crag' : 'Crags'),
      },
      {
        value: header.boulder_count,
        label: tr(
          '抱石',
          header.boulder_count === 1 ? 'Boulder' : 'Boulders',
        ),
      },
      {
        value: ropeCount,
        // BM: relabel "Routes" → "Rope" so users don't confuse this with
        // boulder problems (which are also "routes" in everyday usage).
        // "Rope" makes the discipline split explicit.
        label: tr('绳攀', ropeCount === 1 ? 'Rope' : 'Rope'),
      },
    ];

    const showFooter = props.context !== 'areaMenu';

    // Glass-union sticky footer — three SF Symbol buttons (Info /
    // Share / Favorite) fused into one continuous liquid-glass capsule.
    // Mirrors the Apple Maps `+, ⭐, ⋯` cluster at the bottom of the
    // POI sheet. `areaMenu` context hides the footer because the
    // parent menu sheet already owns the primary actions.
    const footerActions: PlaceSheetFooterAction[] = [
      {
        key: 'info',
        icon: 'info.circle',
        onPress: handleInfo,
        disabled: !hasDetailContent,
      },
      {
        key: 'share',
        icon: 'square.and.arrow.up',
        onPress: handleShare,
        disabled: !header.name,
      },
      {
        key: 'favorite',
        icon: favActive ? 'heart.fill' : 'heart',
        onPress: handleFavorite,
        disabled: !header.id || !favLoaded,
      },
    ];

    const footer = showFooter ? (
      <PlaceSheetFooter actions={footerActions} unionId="area-info-footer" />
    ) : undefined;

    return (
      <TrueSheet
        ref={sheetRef}
        name="area-info-sheet"
        detents={props.context === 'areaMenu' ? [0.9] : [0.5, 0.9]}
        dimmed={false}
        dismissible
        grabber
        grabberOptions={{ height: 3, width: 36, topMargin: 6 }}
        // `scrollable` + `footer`: TrueSheet pins the ScrollView
        // between the sheet top and the footer, and renders the
        // footer as a true floating bottom dock (visible in every
        // detent). Apple Maps uses the same pattern for its
        // "Directions" CTA.
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

          {/* Seasons + approach meta — compact secondary line below the
              stats row. Keeps the at-a-glance info that used to live
              under the metaRow. */}
          {area?.best_seasons?.length || area?.approach_time_min ? (
            <Text style={styles.smallMeta}>
              {bestSeasonSummary(area?.best_seasons, tr)}
              {area?.approach_time_min
                ? `  ·  ${tr('接近', 'Approach')} ${area.approach_time_min}min${
                    approachDifficultyLabel(area?.approach_difficulty, tr)
                      ? ' ' +
                        approachDifficultyLabel(area?.approach_difficulty, tr)
                      : ''
                  }`
                : ''}
            </Text>
          ) : null}

          {showSkeletonSections ? (
            <View style={[styles.contentCard, styles.skeleton]}>
              <ActivityIndicator color={colors.accent} />
            </View>
          ) : hasDetailContent ? (
            <View style={styles.contentCard}>
              {area!.description ? (
                <Section title={tr('描述', 'Description')} colors={colors} first>
                  <Text style={styles.paragraph}>{area!.description}</Text>
                </Section>
              ) : null}

              {area!.approach ? (
                <Section title={tr('接近路线', 'Approach')} colors={colors}>
                  <InfoRow
                    icon="footsteps-outline"
                    color={colors.textSecondary}
                    colors={colors}
                  >
                    {area!.approach_time_min
                      ? `${area!.approach_time_min}min · `
                      : ''}
                    {approachDifficultyLabel(area!.approach_difficulty, tr)} —{' '}
                    {area!.approach}
                  </InfoRow>
                </Section>
              ) : null}

              {hasTransport(area!.transport) ? (
                <Section title={tr('交通', 'Getting There')} colors={colors}>
                  <TransportBlock
                    transport={area!.transport!}
                    colors={colors}
                    tr={tr}
                  />
                </Section>
              ) : null}

              {area!.accommodation && area!.accommodation.length > 0 ? (
                <Section title={tr('住宿', 'Accommodation')} colors={colors}>
                  <AccommodationBlock
                    items={area!.accommodation}
                    colors={colors}
                  />
                </Section>
              ) : null}

              {area!.safety_notes || area!.emergency_info ? (
                <Section title={tr('安全', 'Safety')} colors={colors}>
                  {area!.safety_notes ? (
                    <InfoRow
                      icon="warning-outline"
                      color="#FF9500"
                      colors={colors}
                    >
                      {area!.safety_notes}
                    </InfoRow>
                  ) : null}
                  {area!.emergency_info ? (
                    <InfoRow
                      icon="medkit-outline"
                      color="#FF3B30"
                      colors={colors}
                    >
                      {area!.emergency_info}
                    </InfoRow>
                  ) : null}
                </Section>
              ) : null}
            </View>
          ) : null}

        </ScrollView>
        </TopFadeMaskView>

      </TrueSheet>
    );
  },
);

AreaInfoSheet.displayName = 'AreaInfoSheet';

export default AreaInfoSheet;

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
          letterSpacing: 0.6,
          marginBottom: 8,
        }}
      >
        {title}
      </Text>
      {children}
    </View>
  );
}

function InfoRow({
  icon,
  color,
  children,
  onPress,
  colors,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  children: React.ReactNode;
  onPress?: () => void;
  colors: ReturnType<typeof useThemeColors>;
}) {
  const body = (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
        paddingVertical: 6,
      }}
    >
      <Ionicons name={icon} size={14} color={color} style={{ marginTop: 4 }} />
      <Text
        style={{
          flex: 1,
          fontFamily: theme.fonts.regular,
          fontSize: 14,
          lineHeight: 20,
          color: onPress ? color : colors.textPrimary,
        }}
      >
        {children}
      </Text>
    </View>
  );
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
      >
        {body}
      </Pressable>
    );
  }
  return body;
}

function TransportBlock({
  transport,
  colors,
  tr,
}: {
  transport: Transport;
  colors: ReturnType<typeof useThemeColors>;
  tr: (zh: string, en: string) => string;
}) {
  return (
    <>
      {transport.driving ? (
        <InfoRow icon="car-outline" color={colors.textSecondary} colors={colors}>
          {transport.driving}
        </InfoRow>
      ) : null}
      {transport.public_transit ? (
        <InfoRow icon="bus-outline" color={colors.textSecondary} colors={colors}>
          {transport.public_transit}
        </InfoRow>
      ) : null}
      {transport.parking ? (
        <InfoRow
          icon="navigate-outline"
          color={colors.accent}
          colors={colors}
          onPress={() => {
            const p = transport.parking!;
            if (Platform.OS === 'ios') {
              ActionSheetIOS.showActionSheetWithOptions(
                {
                  options: [tr('苹果地图', 'Apple Maps'), tr('取消', 'Cancel')],
                  cancelButtonIndex: 1,
                },
                (i) => {
                  if (i === 0) Linking.openURL(`maps:?daddr=${p.lat},${p.lng}`);
                },
              );
            } else {
              Linking.openURL(`geo:${p.lat},${p.lng}`);
            }
          }}
        >
          {tr('外部导航到停车场', 'Open parking in Maps')}
        </InfoRow>
      ) : null}
    </>
  );
}

function AccommodationBlock({
  items,
  colors,
}: {
  items: Accommodation[];
  colors: ReturnType<typeof useThemeColors>;
}) {
  return (
    <>
      {items.map((acc, i) => (
        <InfoRow
          key={i}
          icon="bed-outline"
          color={colors.textSecondary}
          colors={colors}
        >
          {acc.name}
          {acc.distance_km ? ` · ${acc.distance_km}km` : ''}
          {acc.price_range ? ` · ${acc.price_range}` : ''}
        </InfoRow>
      ))}
    </>
  );
}

// ---- Helpers ----

function hasTransport(t: Transport | undefined): boolean {
  if (!t) return false;
  return !!(t.driving || t.public_transit || t.parking);
}

function approachDifficultyLabel(
  d: string | null | undefined,
  tr: (zh: string, en: string) => string,
): string {
  if (!d) return '';
  const map: Record<string, string> = {
    easy: tr('简单', 'easy'),
    moderate: tr('中等', 'moderate'),
    hard: tr('困难', 'hard'),
  };
  return map[d] ?? d;
}

function bestSeasonSummary(
  seasons: string[] | null | undefined,
  tr: (zh: string, en: string) => string,
): string {
  if (!seasons || seasons.length === 0) {
    return tr('全年适合', 'Year-round');
  }
  return `${tr('最佳季节', 'Best')} ${seasons.join(', ')}`;
}

// ---- Styles ----

const createStyles = (c: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    body: {
      paddingHorizontal: 0,
      paddingTop: 0,
      paddingBottom: 40,
    },
    smallMeta: {
      fontFamily: theme.fonts.regular,
      fontSize: 13,
      color: c.textSecondary,
      paddingHorizontal: theme.spacing.screenPadding,
      marginTop: -4,
      marginBottom: 16,
    },
    contentCard: {
      backgroundColor: c.sheetBackground,
      borderRadius: 16,
      padding: 16,
      marginHorizontal: theme.spacing.screenPadding,
      marginTop: 4,
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
  });
