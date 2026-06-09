// src/features/mapscreen/components/CragMenuSheet.tsx
// Stacked sheet spawned from the unified map sheet header hamburger tap.
//
// BR Track D Day 5d rename: was `AreaMenuSheet` — the renamed level is
// Crag (L5 entity, the user-facing climbing spot). PLAN §3.5 / Phase 1
// D-2 decisions:
//   1. Crag header card — cover image + name + walls/routes counts +
//      approach line. Tap → stacked CragInfoSheet for the full detail.
//   2. Climb Type segment — Routes / Boulder filter (unchanged).
//   3. Crag Tools — Crag-scoped actions.
//   4. Browse Up — links to parent Area + Region info sheets per
//      PLAN §3.5 (lets the user jump up the hierarchy without going
//      back to the map).
//   5. My Tools — auth-gated user actions.
//   6. Share — Apple Maps link + universal climmate:// link.
//   7. Sign-in CTA when signed-out.

import { forwardRef, useImperativeHandle, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Pressable,
  Linking,
  Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TrueSheet } from '@lodev09/react-native-true-sheet';
import { useRouter } from 'expo-router';

import { useThemeColors } from '../../../lib/useThemeColors';
import { useSettings } from '../../../contexts/SettingsContext';
import { theme } from '../../../lib/theme';
import { TopFadeMaskView } from '../../../components/shared/TopFadeMaskView';
import { useUserStore } from '../../../store/useUserStore';
import { NativeSegmentedControl } from '../../../components/ui/NativeSegmentedControl';
import RoutesLibrarySheet, { type RoutesLibrarySheetHandle } from './RoutesLibrarySheet';
// CA Phase 4b — unified outdoor area sheet replaces CragInfo/AreaInfo/RegionInfo.
import OutdoorAreaInfoSheet, {
  type OutdoorAreaInfoSheetHandle,
  areaListItemToSeed,
} from './OutdoorAreaInfoSheet';
import { AreaCoverImage } from './AreaCoverImage';
import type { Area } from '../../outdoor/types';

export interface CragMenuSheetHandle {
  present: () => void;
  dismiss: () => void;
}

export type CragMenuHeader = {
  id: string;
  name: string;
  cover_url?: string | null;
  /** Parent Area display name. Surfaced under the Crag name + powers the
   *  Browse Up row label. Callers usually pass the value they already
   *  have in context; nullable so menus can hide the row gracefully. */
  area_id?: string | null;
  area_name?: string | null;
  /** Parent Region display name + id (PLAN §3.5 Browse Up to Region). */
  region_id?: string | null;
  region_name?: string | null;
  /** Crag-level location for the Apple Maps / Share fallback. */
  lat?: number | null;
  lng?: number | null;
  /** Wall count (PLAN §3.5 — was `crag_count` pre-rename when this sheet
   *  rendered Region data; that arithmetic was wrong). */
  wall_count: number;
  /** Total routes (rope + boulder). Rope count derived as
   *  (route_count - boulder_count) for display. */
  route_count: number;
  boulder_count: number;
};

interface CragMenuSheetProps {
  /** Current Crag being viewed. Null until areaData loads. */
  crag?: CragMenuHeader | null;
  /** 0 = Routes, 1 = Boulder. Hoisted in parent so the main list stays
   *  filtered even while this sheet is closed. */
  areaModeIndex: number;
  setAreaModeIndex: (i: number) => void;
  onPressMyList: () => void;
  /** Opens the AddRouteSheet (AE). Omit on hosts without AE wired. */
  onPressAddRoute?: () => void;
  /** Opens the ReportsSheet (AF). Omit on hosts without AF wired. */
  onPressReports?: () => void;
  /** Opens the OfflineMapsSheet (AG, Mapbox only). Omit on CN. */
  onPressOfflineMaps?: () => void;
  /** Hydrated parent Area record for the Browse Up → Area info sheet.
   *  Omit when the caller doesn't have it; the row hides gracefully. */
  parentArea?: Area | null;
}

const CragMenuSheet = forwardRef<CragMenuSheetHandle, CragMenuSheetProps>((props, ref) => {
  const colors = useThemeColors();
  const { tr } = useSettings();
  const router = useRouter();
  const user = useUserStore((s) => s.user);
  const sheetRef = useRef<TrueSheet>(null);
  const routesLibrarySheetRef = useRef<RoutesLibrarySheetHandle>(null);
  // CA Phase 4b — single unified ref. Replaces 3 separate sheet refs.
  const outdoorAreaSheetRef = useRef<OutdoorAreaInfoSheetHandle>(null);
  const styles = useMemo(() => createStyles(colors), [colors]);

  useImperativeHandle(ref, () => ({
    present: () => {
      sheetRef.current?.present().catch(() => {});
    },
    dismiss: () => {
      sheetRef.current?.dismiss().catch(() => {});
    },
  }));

  const dismiss = () => sheetRef.current?.dismiss().catch(() => {});

  const comingSoon = () =>
    Alert.alert(tr('即将开放', 'Coming Soon'), tr('敬请期待下一个版本', 'Ships in the next update.'));

  const goLogin = () => {
    dismiss();
    router.push('/(auth)/login' as any);
  };

  const withAuth = (fn: () => void) => () => {
    if (!user) {
      goLogin();
      return;
    }
    fn();
  };

  const presentCragInfo = () => {
    if (!props.crag?.id) return;
    void outdoorAreaSheetRef.current?.present({
      id: props.crag.id,
      name: props.crag.name,
      display_kind: 'crag',
      lat: props.crag.lat ?? null,
      lng: props.crag.lng ?? null,
      cover_url: props.crag.cover_url ?? null,
      parent_name_hint: props.crag.area_name ?? null,
    });
  };

  const pressInfoRouteMap = () => {
    routesLibrarySheetRef.current?.present();
  };

  const handleAppleMaps = () => {
    const c = props.crag;
    if (!c?.lat || !c?.lng) return;
    const label = encodeURIComponent(c.name);
    Linking.openURL(`http://maps.apple.com/?daddr=${c.lat},${c.lng}&q=${label}`).catch(() => {});
  };

  const handleShareLink = async () => {
    const c = props.crag;
    if (!c) return;
    const universal = `climmate://crag/${c.id}`;
    const mapsUrl = c.lat != null && c.lng != null
      ? `https://maps.apple.com/?q=${encodeURIComponent(c.name)}&ll=${c.lat},${c.lng}`
      : undefined;
    try {
      await Share.share({
        title: c.name,
        message: mapsUrl ? `${c.name}\n${mapsUrl}\n${universal}` : `${c.name}\n${universal}`,
        ...(mapsUrl ? { url: mapsUrl } : {}),
      });
    } catch {}
  };

  return (
    <>
    <TrueSheet
      ref={sheetRef}
      name="crag-menu-sheet"
      detents={[0.9]}
      dimmed
      dismissible
      scrollable
      grabber
      grabberOptions={{ height: 3, width: 36, topMargin: 6 }}
    >
      <TopFadeMaskView topFadeRatio={0.08}>
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {/* 1. Crag header card — full-bleed cover image (no overlay) + text
            block underneath. Tap the card to see the full Crag detail
            (description / approach / walls / community) in the stacked
            CragInfoSheet. */}
        {props.crag ? (
          <Pressable onPress={presentCragInfo} style={styles.headerCard}>
            <AreaCoverImage
              url={props.crag.cover_url}
              fallbackName={props.crag.name}
              height={160}
              topRadius
            />
            <View style={styles.headerTextBlock}>
              <View style={styles.headerNameRow}>
                <Text style={styles.headerName} numberOfLines={2}>
                  {props.crag.name}
                </Text>
                <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
              </View>
              <Text style={styles.headerMeta} numberOfLines={1}>
                {props.crag.wall_count} {tr('岩壁', props.crag.wall_count === 1 ? 'wall' : 'walls')}
                {'  ·  '}
                {Math.max(0, props.crag.route_count - props.crag.boulder_count)}{' '}
                {tr(
                  '绳攀线路',
                  Math.max(0, props.crag.route_count - props.crag.boulder_count) === 1 ? 'route' : 'routes',
                )}
                {'  ·  '}
                {props.crag.boulder_count}{' '}
                {tr('抱石', props.crag.boulder_count === 1 ? 'boulder' : 'boulders')}
              </Text>
            </View>
          </Pressable>
        ) : null}

        {/* 2. Climb Type segment — hidden when the Crag has only one
            discipline (no toggle the user can meaningfully switch). */}
        {props.crag
          && Math.max(0, props.crag.route_count - props.crag.boulder_count) > 0
          && props.crag.boulder_count > 0 ? (
          <>
            <SectionLabel colors={colors}>{tr('攀爬类型', 'Climb Type')}</SectionLabel>
            <View style={styles.segmentWrap}>
              <NativeSegmentedControl
                options={[tr('绳攀', 'Rope'), tr('抱石', 'Boulder')]}
                selectedIndex={props.areaModeIndex}
                onSelect={props.setAreaModeIndex}
              />
            </View>
          </>
        ) : null}

        {/* 3. Crag Tools (PLAN §3.5 rename — was Area Tools) */}
        <SectionLabel colors={colors}>{tr('岩点工具', 'Crag Tools')}</SectionLabel>
        <MenuRow
          icon="information-circle-outline"
          label={tr('岩点信息 & 接近', 'Crag Info & Approach')}
          onPress={presentCragInfo}
          colors={colors}
        />
        <MenuRow
          icon="book-outline"
          label={tr('路线库', 'Routes Library')}
          onPress={() => routesLibrarySheetRef.current?.present()}
          colors={colors}
        />

        {/* 4. Browse Up — PLAN §3.5 hierarchy navigation. Rows mount only
            when the caller passes the parent record (parentArea) or the
            denormalized id+name pair (region_id/region_name). */}
        {(props.parentArea || props.crag?.region_id) ? (
          <SectionLabel colors={colors}>{tr('上一级', 'Browse Up')}</SectionLabel>
        ) : null}
        {props.parentArea ? (
          <MenuRow
            icon="folder-open-outline"
            label={tr(
              `关于 ${props.parentArea.name}（岩区）`,
              `About ${props.parentArea.name} (Area)`,
            )}
            onPress={() => {
              if (!props.parentArea) return;
              void outdoorAreaSheetRef.current?.present({
                id: props.parentArea.id,
                name: props.parentArea.name,
                display_kind: 'area',
              });
            }}
            colors={colors}
          />
        ) : null}
        {props.crag?.region_id && props.crag?.region_name ? (
          <MenuRow
            icon="map-outline"
            label={tr(
              `关于 ${props.crag.region_name}（大区）`,
              `About ${props.crag.region_name} (Region)`,
            )}
            onPress={() => {
              if (!props.crag?.region_id || !props.crag?.region_name) return;
              void outdoorAreaSheetRef.current?.present({
                id: props.crag.region_id,
                name: props.crag.region_name,
                display_kind: 'region',
              });
            }}
            colors={colors}
          />
        ) : null}

        {/* 5. My Tools (PLAN §3.5 rename — was User Tools) */}
        <SectionLabel colors={colors}>{tr('我的工具', 'My Tools')}</SectionLabel>
        <MenuRow
          icon="list-outline"
          label={tr('我的清单', 'My List')}
          onPress={withAuth(props.onPressMyList)}
          colors={colors}
        />
        <MenuRow
          icon="add-circle-outline"
          label={tr('添加路线', 'Add a Route')}
          onPress={withAuth(() => {
            if (props.onPressAddRoute) {
              props.onPressAddRoute();
            } else {
              comingSoon();
            }
          })}
          colors={colors}
        />
        <MenuRow
          icon="flag-outline"
          label={tr('报告', 'Reports')}
          onPress={withAuth(() => {
            if (props.onPressReports) {
              props.onPressReports();
            } else {
              comingSoon();
            }
          })}
          colors={colors}
        />
        <MenuRow
          icon="arrow-down-circle-outline"
          label={tr('离线地图', 'Offline Maps')}
          onPress={withAuth(() => {
            if (props.onPressOfflineMaps) {
              props.onPressOfflineMaps();
            } else {
              comingSoon();
            }
          })}
          colors={colors}
        />

        {/* 6. Share — PLAN §3.5 last section. Apple Maps deep link + native
            share sheet with universal climmate:// link. Disabled rows hide
            until we have meaningful coords / id. */}
        <SectionLabel colors={colors}>{tr('分享', 'Share')}</SectionLabel>
        {props.crag?.lat != null && props.crag?.lng != null ? (
          <MenuRow
            icon="map"
            label={tr('在苹果地图打开', 'Open in Apple Maps')}
            onPress={handleAppleMaps}
            colors={colors}
          />
        ) : null}
        {props.crag ? (
          <MenuRow
            icon="share-outline"
            label={tr('分享岩点链接', 'Share Crag link')}
            onPress={handleShareLink}
            colors={colors}
          />
        ) : null}

        {/* 7. Sign-in CTA */}
        {!user ? (
          <View style={styles.authCta}>
            <Text style={styles.authTitle}>{tr('登录以查看更多', 'Sign in for more')}</Text>
            <Text style={styles.authSubtitle}>
              {tr(
                '登录后访问你的清单、报告、离线地图等',
                'Access your lists, reports, offline maps, and more after signing in.',
              )}
            </Text>
            <TouchableOpacity style={styles.authButton} onPress={goLogin} activeOpacity={0.7}>
              <Text style={styles.authButtonText}>{tr('登录', 'Sign In')}</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </ScrollView>
      </TopFadeMaskView>
    </TrueSheet>

    {/* Stacked sheet — opens on top of CragMenuSheet when the user taps
        "Routes Library". Mounts only when we have a Crag id to scope the
        library to. Dismissing it returns to CragMenuSheet. */}
    {props.crag?.id ? (
      <RoutesLibrarySheet ref={routesLibrarySheetRef} areaId={props.crag.id} />
    ) : null}

    {/* CA Phase 4b — single unified outdoor area sheet, replaces the trio
        of stacked CragInfoSheet / AreaInfoSheet / RegionInfoSheet. The
        sheet's seed is set by each menu row at tap time (see presentCragInfo
        and the inline parentArea/region MenuRow onPress handlers above). */}
    <OutdoorAreaInfoSheet
      ref={outdoorAreaSheetRef}
      onRouteTap={(r) => {
        void outdoorAreaSheetRef.current?.dismiss();
        router.push({
          pathname: '/outdoor/outdoor-route-detail' as any,
          params: { id: r.id },
        });
      }}
      onChildTap={(c) => {
        void outdoorAreaSheetRef.current?.present(areaListItemToSeed(c));
      }}
    />
    </>
  );
});

CragMenuSheet.displayName = 'CragMenuSheet';

export default CragMenuSheet;

// ---- Inline sub-components ----

function SectionLabel({
  children,
  colors,
}: {
  children: React.ReactNode;
  colors: ReturnType<typeof useThemeColors>;
}) {
  return (
    <Text
      style={{
        fontFamily: theme.fonts.medium,
        fontSize: 13,
        color: colors.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 0.6,
        marginTop: 18,
        marginBottom: 8,
      }}
    >
      {children}
    </Text>
  );
}

function MenuRow({
  icon,
  label,
  onPress,
  colors,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  colors: ReturnType<typeof useThemeColors>;
}) {
  return (
    <TouchableOpacity
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        paddingVertical: 14,
      }}
      onPress={onPress}
      activeOpacity={0.6}
    >
      <Ionicons name={icon} size={22} color={colors.textPrimary} />
      <Text
        style={{
          flex: 1,
          fontFamily: theme.fonts.medium,
          fontSize: 16,
          color: colors.textPrimary,
        }}
      >
        {label}
      </Text>
      <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
    </TouchableOpacity>
  );
}

const createStyles = (c: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    body: {
      paddingHorizontal: theme.spacing.screenPadding,
      paddingTop: 0,
      paddingBottom: 32,
    },
    headerCard: {
      marginHorizontal: -theme.spacing.screenPadding,
    },
    headerTextBlock: {
      paddingTop: 12,
      paddingBottom: 4,
      paddingHorizontal: theme.spacing.screenPadding,
    },
    headerNameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    headerName: {
      flex: 1,
      fontFamily: theme.fonts.bold,
      fontSize: 20,
      color: c.textPrimary,
    },
    headerMeta: {
      fontFamily: theme.fonts.medium,
      fontSize: 13,
      color: c.textSecondary,
      marginTop: 4,
    },
    segmentWrap: {
      marginBottom: 4,
    },
    authCta: {
      alignItems: 'center',
      paddingVertical: 20,
      paddingHorizontal: 8,
      marginTop: 16,
    },
    authTitle: {
      fontFamily: theme.fonts.bold,
      fontSize: 18,
      color: c.textPrimary,
      marginBottom: 8,
    },
    authSubtitle: {
      fontFamily: theme.fonts.regular,
      fontSize: 14,
      color: c.textSecondary,
      textAlign: 'center',
      lineHeight: 20,
      marginBottom: 16,
    },
    authButton: {
      backgroundColor: c.accent,
      paddingHorizontal: 28,
      paddingVertical: 12,
      borderRadius: theme.borderRadius.pill,
    },
    authButtonText: {
      fontFamily: theme.fonts.bold,
      fontSize: 15,
      color: '#fff',
    },
  });
