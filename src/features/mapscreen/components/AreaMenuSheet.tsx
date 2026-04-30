// src/features/mapscreen/components/AreaMenuSheet.tsx
// Stacked sheet spawned from the crag-map / unified-map sheet header
// hamburger tap. Composed of three blocks:
//   1. Area header card — cover image + name + crag/route counts +
//      approach line. Taps present the stacked AreaInfoSheet for the
//      full description. Cover image has an offline-safe fallback via
//      the shared AreaCoverImage component.
//   2. Climb Type segment — Routes / Boulder filter hoisted out of
//      the main map sheet so the list area below has more room.
//   3. Area Tools + User Tools — menu rows. User tools require auth;
//      when signed-out we fall back to a Sign-in CTA at the bottom
//      and guard menu taps.

import { forwardRef, useImperativeHandle, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TrueSheet } from '@lodev09/react-native-true-sheet';
import { useRouter } from 'expo-router';

import { useThemeColors } from '../../../lib/useThemeColors';
import { useSettings } from '../../../contexts/SettingsContext';
import { theme } from '../../../lib/theme';
import { useUserStore } from '../../../store/useUserStore';
import { NativeSegmentedControl } from '../../../components/ui/NativeSegmentedControl';
import RoutesLibrarySheet, { type RoutesLibrarySheetHandle } from './RoutesLibrarySheet';
import AreaInfoSheet, { type AreaInfoSheetHandle } from './AreaInfoSheet';
import { AreaCoverImage } from './AreaCoverImage';

export interface AreaMenuSheetHandle {
  present: () => void;
  dismiss: () => void;
}

export type AreaMenuHeader = {
  id: string;
  name: string;
  cover_url?: string | null;
  crag_count: number;
  /** Total routes (rope + boulder). Rope count derived as
   *  (route_count - boulder_count) for display. */
  route_count: number;
  boulder_count: number;
};

interface AreaMenuSheetProps {
  /** Current area being viewed. Null until areaData loads. */
  area?: AreaMenuHeader | null;
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
}

const AreaMenuSheet = forwardRef<AreaMenuSheetHandle, AreaMenuSheetProps>((props, ref) => {
  const colors = useThemeColors();
  const { tr } = useSettings();
  const router = useRouter();
  const user = useUserStore((s) => s.user);
  const sheetRef = useRef<TrueSheet>(null);
  const routesLibrarySheetRef = useRef<RoutesLibrarySheetHandle>(null);
  const areaInfoSheetRef = useRef<AreaInfoSheetHandle>(null);
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

  const presentAreaInfo = () => {
    if (!props.area?.id) return;
    areaInfoSheetRef.current?.present();
  };

  const pressInfoRouteMap = () => {
    routesLibrarySheetRef.current?.present();
  };

  return (
    <>
    <TrueSheet
      ref={sheetRef}
      name="area-menu-sheet"
      detents={[0.9]}
      dimmed
      dismissible
      grabber
      grabberOptions={{ height: 3, width: 36, topMargin: 6 }}
    >
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {/* 1. Area header card — full-bleed cover image (no overlay) + text
            block underneath. Tap the card to see the full area detail
            (description / approach / transport / safety) in the stacked
            AreaInfoSheet. */}
        {props.area ? (
          <Pressable onPress={presentAreaInfo} style={styles.headerCard}>
            <AreaCoverImage
              url={props.area.cover_url}
              fallbackName={props.area.name}
              height={160}
              topRadius
            />
            <View style={styles.headerTextBlock}>
              <View style={styles.headerNameRow}>
                <Text style={styles.headerName} numberOfLines={2}>
                  {props.area.name}
                </Text>
                <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
              </View>
              <Text style={styles.headerMeta} numberOfLines={1}>
                {props.area.crag_count} {tr('岩壁', props.area.crag_count === 1 ? 'crag' : 'crags')}
                {'  ·  '}
                {Math.max(0, props.area.route_count - props.area.boulder_count)}{' '}
                {tr(
                  '绳攀线路',
                  Math.max(0, props.area.route_count - props.area.boulder_count) === 1 ? 'route' : 'routes',
                )}
                {'  ·  '}
                {props.area.boulder_count}{' '}
                {tr('抱石', props.area.boulder_count === 1 ? 'boulder' : 'boulders')}
              </Text>
            </View>
          </Pressable>
        ) : null}

        {/* 2. Climb Type segment */}
        <SectionLabel colors={colors}>{tr('攀爬类型', 'Climb Type')}</SectionLabel>
        <View style={styles.segmentWrap}>
          <NativeSegmentedControl
            options={[tr('绳攀', 'Routes'), tr('抱石', 'Boulder')]}
            selectedIndex={props.areaModeIndex}
            onSelect={props.setAreaModeIndex}
          />
        </View>

        {/* 3. Area Tools */}
        <SectionLabel colors={colors}>{tr('岩场工具', 'Area Tools')}</SectionLabel>
        <MenuRow
          icon="information-circle-outline"
          label={tr('岩场信息 & 接近', 'Area Info & Approach')}
          onPress={presentAreaInfo}
          colors={colors}
        />
        <MenuRow
          icon="book-outline"
          label={tr('路线库', 'Routes Library')}
          onPress={() => routesLibrarySheetRef.current?.present()}
          colors={colors}
        />

        {/* 4. User Tools */}
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

        {/* 5. Sign-in CTA */}
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
    </TrueSheet>

    {/* Stacked sheet — opens on top of AreaMenuSheet when the user taps
        "Routes Library". Mounts only when we have an area id to scope the
        library to. Dismissing it returns to AreaMenuSheet without closing
        it. */}
    {props.area?.id ? (
      <RoutesLibrarySheet ref={routesLibrarySheetRef} areaId={props.area.id} />
    ) : null}

    {/* Stacked sheet — opens on top of AreaMenuSheet when the user taps
        the header card or "Area Info & Approach" menu row. Context
        is always "crag" here (caller is inside an area session). */}
    {props.area?.id ? (
      <AreaInfoSheet
        ref={areaInfoSheetRef}
        areaId={props.area.id}
        context="areaMenu"
        seedArea={{
          id: props.area.id,
          name: props.area.name,
          cover_url: props.area.cover_url,
          crag_count: props.area.crag_count,
          route_count: props.area.route_count,
          boulder_count: props.area.boulder_count,
        }}
        onPressRouteMap={pressInfoRouteMap}
      />
    ) : null}
    </>
  );
});

AreaMenuSheet.displayName = 'AreaMenuSheet';

export default AreaMenuSheet;

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
      // No top padding — the cover image is full-bleed and flows from
      // the sheet's top edge. Other children keep screenPadding indent.
      paddingTop: 0,
      paddingBottom: 32,
    },
    headerCard: {
      // Pull the cover image out to the sheet's horizontal edges so the
      // rounded top corners align with the sheet corners. Text below
      // still inherits screenPadding via headerTextBlock.
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
